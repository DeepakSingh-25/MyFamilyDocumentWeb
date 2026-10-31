import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { authInterceptor } from '../../core/http/auth.interceptor';
import { errorInterceptor } from '../../core/http/error.interceptor';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';
import { FamilyDocument, FamilyMember, PagedResult } from '../../shared/models/models';
import { MedicalListComponent } from './medical-list.component';

const API = environment.apiBaseUrl;
const ASHA = '30000000-0000-4000-8000-000000000004';
const MEDICAL = '10000000-0000-0000-0000-000000000003';
const docId = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const MEMBERS: FamilyMember[] = [{ id: ASHA, name: 'Asha', relationshipId: '20000000-0000-0000-0000-000000000004', relationship: 'Mother', documentCount: 7 }];
const empty: PagedResult<FamilyDocument> = { items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 };
const COUNTS = { total: 7, byMember: [{ memberId: ASHA, count: 7 }], byCategory: [{ categoryId: MEDICAL, count: 7 }] };
const doc = (n: number): FamilyDocument => ({
  id: docId(n), name: `Report ${n}`, memberId: ASHA, memberName: 'Asha', categoryId: MEDICAL, categoryName: 'Medical Documents',
  fileName: 'r.pdf', fileType: 'pdf', fileSize: 10, uploadedOn: '2026-10-16T10:00:00Z',
});
const paged = (items: FamilyDocument[], page: number, totalCount: number, pageSize = 10): PagedResult<FamilyDocument> =>
  ({ items, page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) });

describe('MedicalListComponent (spec 010 §B.3)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;
  let auth: { sessionExpired: ReturnType<typeof vi.fn> };
  const el = () => harness.routeNativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const render = () => harness.fixture.whenStable();
  const open = (): TestRequest[] => http.match(r => r.url === `${API}/documents`).filter(r => !r.cancelled);
  const listReq = (): TestRequest => http.expectOne(r => r.url === `${API}/documents`);
  const countsReq = (): TestRequest => http.expectOne(r => r.url === `${API}/documents/counts`);
  const button = (label: string) =>
    [...el().querySelectorAll('button')].find(b => b.textContent?.trim().includes(label)) as HTMLButtonElement;
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  beforeEach(async () => {
    sessionStorage.setItem('fd_token', 'test-token');
    auth = { sessionExpired: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'medical-documents', component: MedicalListComponent }], withComponentInputBinding()),
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

  /** Opens the page and answers members + tab counts; the documents request is left to the test. */
  async function start(url: string): Promise<void> {
    await harness.navigateByUrl(url);
    await render();
    http.expectOne(`${API}/members`).flush(MEMBERS);
    http.expectOne(r => r.url === `${API}/documents/counts`).flush(COUNTS);
    await render();
  }

  async function flushList(body: PagedResult<FamilyDocument>): Promise<TestRequest> {
    const req = listReq();
    req.flush(body);
    await render();
    return req;
  }

  it('tabs show counts from /counts and the member tab filters on the server', async () => {
    await start(`/medical-documents?member=${ASHA}`);

    const [req] = open();
    expect(req.request.params.get('categoryId')).toBe(MEDICAL);
    expect(req.request.params.get('memberId')).toBe(ASHA);
    req.flush(empty);
    await render();
    const tabs = [...el().querySelectorAll('.member-tab')].map(t => t.textContent?.replace(/\s+/g, ' ').trim());
    expect(tabs).toEqual(['Everyone 7', 'A Asha 7']);
  });

  it('an unknown member falls back to Everyone with the URL replaced', async () => {
    const navigate = vi.spyOn(router, 'navigate');
    await start('/medical-documents?member=30000000-0000-4000-8000-000000999999&page=2');

    expect(router.url).toBe('/medical-documents');
    expect(navigate.mock.calls.at(-1)?.[1]?.replaceUrl).toBe(true);
    const reqs = open();
    expect(reqs.length).toBe(1);
    expect(reqs[0].request.params.has('memberId')).toBe(false);
    reqs[0].flush(empty);
    await render();
    expect(el().querySelector('.member-tab.active')?.textContent).toContain('Everyone');
  });

  // ---- spec 012 §B.8 ----

  it('should send the Medical categoryId with member, search, page and size when they are in the URL', async () => {
    await start(`/medical-documents?member=${ASHA}&search=apollo&page=2&size=25`);

    const req = await flushList(paged([doc(26)], 2, 26, 25));
    const p = req.request.params;
    expect([p.get('categoryId'), p.get('memberId'), p.get('search'), p.get('page'), p.get('pageSize')])
      .toEqual([MEDICAL, ASHA, 'apollo', '2', '25']);
    expect((el().querySelector('input') as HTMLInputElement).value).toBe('apollo');
  });

  it('should send only the Medical categoryId when the URL has the defaults', async () => {
    await start('/medical-documents');

    const req = await flushList(paged([doc(1)], 1, 1));
    expect(req.request.params.keys()).toEqual(['categoryId']);
    expect(req.request.params.get('categoryId')).toBe(MEDICAL);
  });

  it('should go to page 1, request at once and push a history entry when a tab is clicked', async () => {
    await start('/medical-documents?page=3');
    await flushList(paged([doc(21)], 3, 21));
    const navigate = vi.spyOn(router, 'navigate');

    (el().querySelectorAll('.member-tab')[1] as HTMLButtonElement).click();
    await render();

    expect(router.url).toBe(`/medical-documents?member=${ASHA}`);
    expect(navigate.mock.calls[0][1]?.replaceUrl).toBe(false);
    const req = listReq();
    expect(req.request.params.get('memberId')).toBe(ASHA);
    expect(req.request.params.get('categoryId')).toBe(MEDICAL);
    expect(req.request.params.has('page')).toBe(false);
    req.flush(paged([doc(1)], 1, 1));
    await render();
    expect(el().querySelector('.member-tab.active')?.getAttribute('aria-pressed')).toBe('true');
    expect(el().querySelector('.member-tab.active')?.textContent).toContain('Asha');
  });

  it('should debounce typing, replace the history entry, go to page 1 and not reload tab counts', async () => {
    await start('/medical-documents?page=2');
    await flushList(paged([doc(11)], 2, 11));
    const navigate = vi.spyOn(router, 'navigate');

    const input = el().querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('maxlength')).toBe('100');
    input.value = 'apo';
    input.dispatchEvent(new Event('input'));
    await render();
    http.expectNone(r => r.url === `${API}/documents`);

    await wait(300);
    await render();
    expect(router.url).toBe('/medical-documents?search=apo');
    expect(navigate.mock.calls[0][1]?.replaceUrl).toBe(true);
    const req = listReq();
    expect(req.request.params.get('search')).toBe('apo');
    expect(req.request.params.get('categoryId')).toBe(MEDICAL);
    expect(req.request.params.has('page')).toBe(false);
    http.expectNone(r => r.url === `${API}/documents/counts`);
    req.flush(paged([], 1, 0));
  });

  it('should reset to page 1 when the Rows select changes', async () => {
    await start('/medical-documents?page=3');
    await flushList(paged([doc(21)], 3, 60));

    const select = el().querySelector('app-paginator .summary select') as HTMLSelectElement;
    expect([...select.options].map(o => o.value)).toEqual(['10', '25', '50']);
    select.value = '25';
    select.dispatchEvent(new Event('change'));
    await render();

    expect(router.url).toBe('/medical-documents?size=25');
    const req = listReq();
    expect(req.request.params.get('pageSize')).toBe('25');
    expect(req.request.params.has('page')).toBe(false);
    req.flush(paged([doc(1)], 1, 60, 25));
  });

  it('should push a history entry and scroll the card into view when a page is clicked', async () => {
    await start('/medical-documents');
    await flushList(paged([doc(1)], 1, 23));
    const navigate = vi.spyOn(router, 'navigate');
    const card = el().querySelector('.card-box') as HTMLElement;
    const scroll = vi.fn();
    card.scrollIntoView = scroll;

    (el().querySelector('button[aria-label="Page 3"]') as HTMLButtonElement).click();
    await render();

    expect(router.url).toBe('/medical-documents?page=3');
    expect(navigate.mock.calls[0][1]?.replaceUrl).toBe(false);
    expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    const req = listReq();
    expect(req.request.params.get('page')).toBe('3');
    req.flush(paged([doc(21)], 3, 23));
  });

  it('should show "No medical records found." only after a successful empty answer when there are no filters', async () => {
    await start('/medical-documents');
    expect(text()).not.toContain('No medical records');

    await flushList(paged([], 1, 0));
    expect(text()).toContain('No medical records found.');
    expect(el().querySelector('app-paginator .paginator')).toBeNull();
  });

  it('should show "No medical records match these filters." when a filter is set and nothing matches', async () => {
    await start('/medical-documents?search=xyz');
    await flushList(paged([], 1, 0));

    expect(text()).toContain('No medical records match these filters.');
    expect(text()).not.toContain('No medical records found.');
  });

  it('should show an error card and Retry should repeat the same query and reload the counts', async () => {
    await start(`/medical-documents?member=${ASHA}&page=2`);
    listReq().flush({ detail: 'Database is down.' }, { status: 500, statusText: 'Error' });
    await render();

    expect(text()).toContain('Could not load medical records.');
    expect(text()).toContain('Database is down.');
    expect(text()).not.toContain('No medical records');
    expect(el().querySelector('.result-count')).toBeNull();
    expect(el().querySelector('app-paginator')).toBeNull();

    button('Retry').click();
    await render();
    countsReq().flush({ ...COUNTS, total: 8, byMember: [{ memberId: ASHA, count: 8 }] });
    const req = listReq();
    expect(req.request.params.get('categoryId')).toBe(MEDICAL);
    expect(req.request.params.get('memberId')).toBe(ASHA);
    expect(req.request.params.get('page')).toBe('2');
    req.flush(paged([doc(11)], 2, 11));
    await render();
    expect(text()).toContain('Report 11');
    expect(text()).toContain('Everyone 8');
  });

  it('should go to the last page with the URL replaced when ?page=99 is past the end', async () => {
    const navigate = vi.spyOn(router, 'navigate');
    await start('/medical-documents?page=99');
    await flushList(paged([], 99, 57));

    expect(router.url).toBe('/medical-documents?page=6');
    expect(navigate.mock.calls.at(-1)?.[1]?.replaceUrl).toBe(true);
    const req = listReq();
    expect(req.request.params.get('page')).toBe('6');
    req.flush(paged([doc(51)], 6, 57));
  });

  it('should go to page 1 and reload the counts when the last row of page 2 is deleted', async () => {
    await start('/medical-documents?page=2');
    await flushList(paged([doc(11)], 2, 11));

    (el().querySelector('button[title="Delete"]') as HTMLButtonElement).click();
    await render();
    TestBed.inject(UiService).answer(true);
    await render();
    http.expectOne(r => r.method === 'DELETE' && r.url === `${API}/documents/${docId(11)}`).flush(null, { status: 204, statusText: 'No Content' });
    await render();

    countsReq().flush({ ...COUNTS, total: 6, byMember: [{ memberId: ASHA, count: 6 }] });
    await flushList(paged([], 2, 10));
    expect(router.url).toBe('/medical-documents');
    const req = listReq();
    expect(req.request.params.has('page')).toBe(false);
    req.flush(paged([doc(1)], 1, 10));
    await render();
    expect(text()).toContain('Everyone 6');
  });

  it('should show "16 medical records" in the result line when there are 16 matches', async () => {
    await start('/medical-documents');
    expect(el().querySelector('.result-count')).toBeNull();

    await flushList(paged([doc(1)], 1, 16));
    expect(el().querySelector('.result-count')?.textContent?.trim()).toBe('16 medical records');
  });

  it('should show "1 medical record" in the result line when there is one match', async () => {
    await start('/medical-documents');
    await flushList(paged([doc(1)], 1, 1));

    expect(el().querySelector('.result-count')?.textContent?.trim()).toBe('1 medical record');
  });

  it('should not show Clear when there is no search and Everyone is selected', async () => {
    await start('/medical-documents?page=2');
    await flushList(paged([doc(11)], 2, 11));

    expect(el().querySelector('button.clear')).toBeNull();
  });

  it('should reset search and member to page 1 with one history entry when Clear is clicked', async () => {
    await start(`/medical-documents?member=${ASHA}&search=apollo&page=2`);
    await flushList(paged([doc(11)], 2, 11));
    const navigate = vi.spyOn(router, 'navigate');

    const clear = el().querySelector('button.clear') as HTMLButtonElement;
    expect(clear.textContent?.trim()).toBe('Clear');
    clear.click();
    await render();

    expect(router.url).toBe('/medical-documents');
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0][1]?.replaceUrl).toBe(false);
    const req = listReq();
    expect(req.request.params.keys()).toEqual(['categoryId']);
    req.flush(paged([doc(1)], 1, 16));
    await render();
    expect((el().querySelector('input') as HTMLInputElement).value).toBe('');
    expect(el().querySelector('.member-tab.active')?.textContent).toContain('Everyone');
    expect(el().querySelector('button.clear')).toBeNull();
  });

  it('should pass the Medical category, the selected member and returnUrl on the header Add button', async () => {
    await start(`/medical-documents?member=${ASHA}&page=2`);
    await flushList(paged([doc(11)], 2, 11));

    const add = [...el().querySelectorAll('a')].find(a => a.textContent?.includes('Add Medical Record'))!;
    expect(add.getAttribute('href'))
      .toBe(`/documents/new?category=${MEDICAL}&member=${ASHA}&returnUrl=%2Fmedical-documents%3Fmember%3D${ASHA}%26page%3D2`);
  });

  it('should leave member out of the Add button when Everyone is selected', async () => {
    await start('/medical-documents');
    await flushList(paged([doc(1)], 1, 1));

    const add = [...el().querySelectorAll('a')].find(a => a.textContent?.includes('Add Medical Record'))!;
    expect(add.getAttribute('href')).toBe(`/documents/new?category=${MEDICAL}&returnUrl=%2Fmedical-documents`);
  });

  it('should label the empty-state button "Add Medical Record" with category, member and returnUrl', async () => {
    await start(`/medical-documents?member=${ASHA}`);
    await flushList(paged([], 1, 0));

    const add = el().querySelector('.empty-state a') as HTMLAnchorElement;
    expect(add.textContent?.trim()).toBe('Add Medical Record');
    expect(add.getAttribute('href'))
      .toBe(`/documents/new?category=${MEDICAL}&member=${ASHA}&returnUrl=%2Fmedical-documents%3Fmember%3D${ASHA}`);
  });

  it('should log out through errorInterceptor when the list answers 401', async () => {
    await start('/medical-documents');
    listReq().flush(null, { status: 401, statusText: 'Unauthorized' });
    await render();

    expect(auth.sessionExpired).toHaveBeenCalled();
  });
});
