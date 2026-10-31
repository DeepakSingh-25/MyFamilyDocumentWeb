import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { authInterceptor } from '../../../core/http/auth.interceptor';
import { errorInterceptor } from '../../../core/http/error.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { DocumentCategory, FamilyDocument, FamilyMember, PagedResult } from '../../../shared/models/models';
import { DocumentListComponent } from './document-list.component';

const API = environment.apiBaseUrl;
const ASHA = '30000000-0000-4000-8000-000000000004';
const MOTHER = '20000000-0000-0000-0000-000000000004';
const IDENTITY = '10000000-0000-0000-0000-000000000001';
const docId = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const MEMBERS: FamilyMember[] = [{ id: ASHA, name: 'Asha', relationshipId: MOTHER, relationship: 'Mother', documentCount: 3 }];
const CATEGORIES: DocumentCategory[] = [{ id: IDENTITY, name: 'Identity Documents', icon: 'bi-person-vcard', examples: '', isSystem: true, sortOrder: 10 }];
const doc = (n: number): FamilyDocument => ({
  id: docId(n), name: `Doc ${n}`, memberId: ASHA, memberName: 'Asha', categoryId: IDENTITY, categoryName: 'Identity Documents',
  fileName: 'a.pdf', fileType: 'pdf', fileSize: 10, uploadedOn: '2026-10-16T10:00:00Z',
});
const paged = (items: FamilyDocument[], page: number, totalCount: number, pageSize = 10): PagedResult<FamilyDocument> =>
  ({ items, page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) });

describe('DocumentListComponent (spec 010)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;
  let auth: { sessionExpired: ReturnType<typeof vi.fn> };
  const el = () => harness.routeNativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const render = () => harness.fixture.whenStable();
  const listReq = (): TestRequest => http.expectOne(r => r.url === `${API}/documents`);
  const button = (label: string) =>
    [...el().querySelectorAll('button')].find(b => b.textContent?.trim().includes(label)) as HTMLButtonElement;
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  beforeEach(async () => {
    sessionStorage.setItem('fd_token', 'test-token');
    auth = { sessionExpired: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'documents', component: DocumentListComponent }], withComponentInputBinding()),
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  /** Opens the page and answers members + categories; the documents request is left to the test. */
  async function open(url: string): Promise<void> {
    await harness.navigateByUrl(url);
    await render();
    http.expectOne(`${API}/members`).flush(MEMBERS);
    http.expectOne(`${API}/categories`).flush(CATEGORIES);
    await render();
  }

  async function flushList(body: PagedResult<FamilyDocument>): Promise<TestRequest> {
    const req = listReq();
    req.flush(body);
    await render();
    return req;
  }

  it('sends the URL state as request params and shows totals from the API', async () => {
    await open(`/documents?search=aadhaar&member=${ASHA}&category=${IDENTITY}&page=2&size=25`);

    const req = await flushList(paged([doc(1), doc(2)], 2, 27, 25));
    const p = req.request.params;
    expect([p.get('search'), p.get('memberId'), p.get('categoryId'), p.get('page'), p.get('pageSize')])
      .toEqual(['aadhaar', ASHA, IDENTITY, '2', '25']);
    expect(text()).toContain('27 documents');
    expect(text()).toContain('Showing 26–27 of 27');
    expect((el().querySelector('input') as HTMLInputElement).value).toBe('aadhaar');
  });

  it('leaves default page and size out of the request', async () => {
    await open('/documents');
    const req = await flushList(paged([doc(1)], 1, 1));

    expect(req.request.params.keys()).toEqual([]);
    expect(text()).toContain('1 document');
  });

  it('a select change resets the page and calls the API at once', async () => {
    await open('/documents?page=3');
    await flushList(paged([doc(1)], 3, 21));

    const select = el().querySelector('select[aria-label="Filter by category"]') as HTMLSelectElement;
    select.value = IDENTITY;
    select.dispatchEvent(new Event('change'));
    await render();

    expect(router.url).toBe(`/documents?category=${IDENTITY}`);
    const req = listReq();
    expect(req.request.params.get('categoryId')).toBe(IDENTITY);
    expect(req.request.params.has('page')).toBe(false);
    req.flush(paged([doc(1)], 1, 1));
  });

  it('Rows sits in the paginator next to "Showing", offers 10/25/50 and resets the page', async () => {
    await open('/documents?page=3');
    await flushList(paged([doc(1)], 3, 60));

    const select = el().querySelector('app-paginator .summary select') as HTMLSelectElement;
    expect(select.closest('.summary')?.textContent).toContain('Showing 21–30 of 60');
    expect([...select.options].map(o => o.value)).toEqual(['10', '25', '50']);
    expect(el().querySelector('.filters select:not([aria-label])')).toBeNull();

    select.value = '25';
    select.dispatchEvent(new Event('change'));
    await render();

    expect(router.url).toBe('/documents?size=25');
    const req = listReq();
    expect(req.request.params.get('pageSize')).toBe('25');
    expect(req.request.params.has('page')).toBe(false);
    req.flush(paged([doc(1)], 1, 60, 25));
  });

  it('debounces typing, replaces the history entry and goes back to page 1', async () => {
    await open('/documents?page=2');
    await flushList(paged([doc(1)], 2, 11));
    const navigate = vi.spyOn(router, 'navigate');

    const input = el().querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('maxlength')).toBe('100');
    expect(input.placeholder).toBe('Search by name, hospital or doctor');
    input.value = 'aad';
    input.dispatchEvent(new Event('input'));
    await render();
    http.expectNone(r => r.url === `${API}/documents`);

    await wait(300);
    await render();
    expect(router.url).toBe('/documents?search=aad');
    expect(navigate.mock.calls[0][1]?.replaceUrl).toBe(true);
    const req = listReq();
    expect(req.request.params.get('search')).toBe('aad');
    expect(req.request.params.has('page')).toBe(false);
    req.flush(paged([], 0, 0));
  });

  it('page clicks add a history entry', async () => {
    await open('/documents');
    await flushList(paged([doc(1)], 1, 23));
    const navigate = vi.spyOn(router, 'navigate');

    (el().querySelector('button[aria-label="Page 3"]') as HTMLButtonElement).click();
    await render();

    expect(router.url).toBe('/documents?page=3');
    expect(navigate.mock.calls[0][1]?.replaceUrl).toBe(false);
    expect(listReq().request.params.get('page')).toBe('3');
    http.match(r => r.url === `${API}/documents`).filter(r => !r.cancelled).forEach(r => r.flush(paged([doc(21)], 3, 23)));
  });

  it('shows the empty state only after a successful empty answer', async () => {
    await open('/documents');
    await flushList(paged([], 1, 0));

    expect(text()).toContain('No documents found.');
    expect(el().querySelector('app-paginator .paginator')).toBeNull();
  });

  it('shows an error with Retry (not the empty state), and Retry repeats the query', async () => {
    await open(`/documents?category=${IDENTITY}&page=2`);
    listReq().flush({ detail: 'Database is down.' }, { status: 500, statusText: 'Error' });
    await render();

    expect(text()).toContain('Could not load documents.');
    expect(text()).toContain('Database is down.');
    expect(text()).not.toContain('No documents');
    expect(el().querySelector('app-paginator')).toBeNull();

    button('Retry').click();
    await render();
    const req = listReq();
    expect(req.request.params.get('categoryId')).toBe(IDENTITY);
    expect(req.request.params.get('page')).toBe('2');
    req.flush(paged([doc(11)], 2, 11));
    await render();
    expect(text()).toContain('Doc 11');
  });

  it('?page=99 past the end goes to the last page', async () => {
    await open('/documents?page=99');
    await flushList(paged([], 99, 57));

    expect(router.url).toBe('/documents?page=6');
    const req = listReq();
    expect(req.request.params.get('page')).toBe('6');
    req.flush(paged([doc(51)], 6, 57));
  });

  it('deleting the last row of a page goes to the previous page', async () => {
    await open('/documents?page=3');
    await flushList(paged([doc(21)], 3, 21));

    (el().querySelector('button[title="Delete"]') as HTMLButtonElement).click();
    await render();
    TestBed.inject(UiService).answer(true);
    await render();
    http.expectOne(r => r.method === 'DELETE' && r.url === `${API}/documents/${docId(21)}`).flush(null, { status: 204, statusText: 'No Content' });
    await render();

    await flushList(paged([], 3, 20));
    expect(router.url).toBe('/documents?page=2');
    listReq().flush(paged([doc(11)], 2, 20));
  });

  it('falls back to "All members" for a member that is not ours', async () => {
    await open('/documents?member=30000000-0000-4000-8000-000000999999');
    await render();

    expect(router.url).toBe('/documents');
    http.match(r => r.url === `${API}/documents`).filter(r => !r.cancelled).forEach(r => r.flush(paged([], 1, 0)));
  });

  it('ignores a member / category that is not a GUID (spec 014): no filter is sent', async () => {
    await open('/documents?member=4&category=new');

    expect(listReq().request.params.keys()).toEqual([]);
  });

  it('logs out on 401', async () => {
    await open('/documents');
    listReq().flush(null, { status: 401, statusText: 'Unauthorized' });
    await render();

    expect(auth.sessionExpired).toHaveBeenCalled();
  });

  it('passes the current list URL as returnUrl to Add and Edit', async () => {
    await open(`/documents?category=${IDENTITY}&page=2`);
    await flushList(paged([doc(11)], 2, 11));

    const add = [...el().querySelectorAll('a')].find(a => a.textContent?.includes('Add Document'))!;
    expect(add.getAttribute('href')).toBe(`/documents/new?returnUrl=%2Fdocuments%3Fcategory%3D${IDENTITY}%26page%3D2`);
    expect(el().querySelector('a[title="Edit"]')!.getAttribute('href'))
      .toBe(`/documents/${docId(11)}/edit?returnUrl=%2Fdocuments%3Fcategory%3D${IDENTITY}%26page%3D2`);
  });
});
