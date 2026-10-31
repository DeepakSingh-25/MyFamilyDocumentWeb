import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { UiService } from '../../../core/services/ui.service';
import { DocumentCategory, DocumentCounts, FamilyDocument, FamilyMember, PagedResult } from '../../../shared/models/models';
import { MemberDocumentsComponent } from './member-documents.component';

const API = environment.apiBaseUrl;
/** System category GUIDs: last digits = the old int id (spec 014). */
const cat = (n: number) => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const docId = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ASHA_ID = '30000000-0000-4000-8000-000000000005';
const ASHA: FamilyMember = { id: ASHA_ID, name: 'Asha', relationshipId: '20000000-0000-0000-0000-000000000004', relationship: 'Mother', documentCount: 12 };
const CATEGORIES: DocumentCategory[] = [
  { id: cat(1), name: 'Identity Documents', icon: 'bi-person-vcard', examples: '', isSystem: true, sortOrder: 10 },
  { id: cat(2), name: 'Education', icon: 'bi-mortarboard', examples: '', isSystem: true, sortOrder: 10 },
  { id: cat(3), name: 'Medical Documents', icon: 'bi-heart-pulse', examples: '', isSystem: true, sortOrder: 10 },
];
const doc = (n: number, category: number): FamilyDocument => ({
  id: docId(n), name: `Doc ${n}`, memberId: ASHA_ID, memberName: 'Asha', categoryId: cat(category),
  categoryName: CATEGORIES.find(c => c.id === cat(category))!.name,
  fileName: 'a.pdf', fileType: 'pdf', fileSize: 10, uploadedOn: '2026-10-16T10:00:00Z',
});
const paged = (items: FamilyDocument[], page: number, totalCount: number, pageSize = 10): PagedResult<FamilyDocument> =>
  ({ items, page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) });
const counts = (byCategory: [number, number][]): DocumentCounts => ({
  total: byCategory.reduce((sum, [, n]) => sum + n, 0),
  byMember: [{ memberId: ASHA_ID, count: byCategory.reduce((sum, [, n]) => sum + n, 0) }],
  byCategory: byCategory.map(([category, count]) => ({ categoryId: cat(category), count })),
});

describe('MemberDocumentsComponent (spec 008, paged in spec 010)', () => {
  let fixture: ComponentFixture<MemberDocumentsComponent>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const render = () => fixture.whenStable();
  const chips = () => [...el().querySelectorAll('.chip')].map(c => c.textContent?.trim());
  const chip = (label: string) => [...el().querySelectorAll('.chip')].find(c => c.textContent?.includes(label)) as HTMLButtonElement;
  const countsReq = (): TestRequest => http.expectOne(r => r.url === `${API}/documents/counts`);
  const listReq = (): TestRequest => http.expectOne(r => r.url === `${API}/documents`);

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MemberDocumentsComponent);
    fixture.componentRef.setInput('id', ASHA_ID);
    await render();
    http.expectOne(`${API}/categories`).flush(CATEGORIES);
  });

  afterEach(() => http.verify());

  async function loadWith(c: DocumentCounts, page: PagedResult<FamilyDocument>): Promise<void> {
    http.expectOne(`${API}/members/${ASHA_ID}`).flush(ASHA);
    const cReq = countsReq();
    expect(cReq.request.params.get('memberId')).toBe(ASHA_ID);
    expect(cReq.request.params.has('search')).toBe(false);
    cReq.flush(c);
    const lReq = listReq();
    expect(lReq.request.params.get('memberId')).toBe(ASHA_ID);
    lReq.flush(page);
    await render();
  }

  it('shows "not found" for a 404', async () => {
    http.expectOne(`${API}/members/${ASHA_ID}`).flush({ detail: 'Family member not found.' }, { status: 404, statusText: 'Not Found' });
    await render();

    expect(text()).toContain('This family member was not found.');
  });

  it('shows an error with Retry for other failures, and Retry loads the page', async () => {
    http.expectOne(`${API}/members/${ASHA_ID}`).flush(null, { status: 500, statusText: 'Error' });
    await render();

    expect(text()).toContain('Could not load this member.');
    expect(text()).not.toContain('not found');

    (el().querySelector('[role="alert"] button') as HTMLButtonElement).click();
    await loadWith(counts([]), paged([], 1, 0));
    expect(el().querySelector('h2')?.textContent).toContain('Asha');
  });

  it('shows a placeholder breadcrumb while loading, then the header and chips from counts', async () => {
    expect(text()).toContain('Family Members / …');

    await loadWith(counts([[1, 9], [3, 3]]), paged([doc(1, 1), doc(2, 3)], 1, 12));

    expect(text()).toContain('Mother · 12 documents');
    expect(chips()).toEqual(['All (12)', 'Identity Documents (9)', 'Medical Documents (3)']);
    expect(text()).toContain('Showing 1–10 of 12');
  });

  it('a chip filters on the server from page 1; paging keeps the chip', async () => {
    await loadWith(counts([[1, 25], [3, 3]]), paged([doc(1, 1)], 1, 28));

    chip('Identity').click();
    await render();
    let req = listReq();
    expect(req.request.params.get('categoryId')).toBe(cat(1));
    expect(req.request.params.has('page')).toBe(false);
    req.flush(paged([doc(1, 1)], 1, 25));
    await render();

    (el().querySelector('button[aria-label="Page 3"]') as HTMLButtonElement).click();
    await render();
    req = listReq();
    expect(req.request.params.get('categoryId')).toBe(cat(1));
    expect(req.request.params.get('page')).toBe('3');
    req.flush(paged([doc(21, 1)], 3, 25));
  });

  it('goes back to All when the selected category becomes empty', async () => {
    await loadWith(counts([[1, 1], [3, 1]]), paged([doc(1, 1), doc(2, 3)], 1, 2));
    chip('Medical').click();
    await render();
    listReq().flush(paged([doc(2, 3)], 1, 1));
    await render();

    fixture.componentInstance.reloadDocs();
    countsReq().flush(counts([[1, 1]]));
    const req = listReq();
    expect(req.request.params.has('categoryId')).toBe(false);
    req.flush(paged([doc(1, 1)], 1, 1));
    await render();

    expect(fixture.componentInstance.category()).toBe('');
    expect(chips()).toEqual(['All (1)', 'Identity Documents (1)']);
  });

  it('after deleting the last row of a page, goes to the previous page', async () => {
    await loadWith(counts([[1, 11]]), paged([doc(1, 1)], 1, 11));
    (el().querySelector('button[aria-label="Page 2"]') as HTMLButtonElement).click();
    await render();
    listReq().flush(paged([doc(11, 1)], 2, 11));
    await render();

    fixture.componentInstance.reloadDocs();
    countsReq().flush(counts([[1, 10]]));
    listReq().flush(paged([], 2, 10));
    const req = listReq();
    expect(req.request.params.has('page')).toBe(false);
    req.flush(paged([doc(1, 1)], 1, 10));
    await render();

    expect(fixture.componentInstance.page()).toBe(1);
  });

  it('the member delete confirm counts all documents (counts.total), not the rows on the page', async () => {
    await loadWith(counts([[1, 12]]), paged([doc(1, 1)], 1, 12));
    const ui = TestBed.inject(UiService);

    (el().querySelector('button[aria-label="Delete member"]') as HTMLButtonElement).click();
    await render();

    expect(ui.confirmState()?.message).toBe('Asha and all 12 of their documents will be removed from the app.');
    ui.answer(false);
  });

  it('pre-selects the member and passes returnUrl in both Add Document links', async () => {
    await loadWith(counts([]), paged([], 1, 0));

    const links = [...el().querySelectorAll('a')].filter(a => a.textContent?.includes('Add Document'));
    expect(links.length).toBe(2);
    links.forEach(a => expect(a.getAttribute('href')).toBe(`/documents/new?member=${ASHA_ID}&returnUrl=%2Ffamily-members%2F${ASHA_ID}`));
  });
});
