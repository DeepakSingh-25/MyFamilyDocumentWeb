import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { DocumentService } from './document.service';

const URL = `${environment.apiBaseUrl}/documents`;
const MEMBER = '30000000-0000-0000-0000-000000000004';
const IDENTITY = '10000000-0000-0000-0000-000000000001';
const MEDICAL = '10000000-0000-0000-0000-000000000003';

describe('DocumentService (spec 010 §B.1, §B.3)', () => {
  let service: DocumentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DocumentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list leaves out empty filters and the default page / size', () => {
    service.list({ search: '  ', memberId: '', categoryId: '', page: 1, pageSize: 10 }).subscribe();
    expect(http.expectOne(r => r.url === URL).request.params.keys()).toEqual([]);
  });

  it('list sends trimmed search, filters, page and size', () => {
    service.list({ search: ' aadhaar ', memberId: MEMBER, categoryId: IDENTITY, page: 2, pageSize: 20 }).subscribe();
    const p = http.expectOne(r => r.url === URL).request.params;
    expect(p.keys().map(k => `${k}=${p.get(k)}`)).toEqual([`memberId=${MEMBER}`, `categoryId=${IDENTITY}`, 'search=aadhaar', 'page=2', 'pageSize=20']);
  });

  it('counts sends only member / category', () => {
    service.counts({ categoryId: MEDICAL }).subscribe();
    const req = http.expectOne(r => r.url === `${URL}/counts`);
    expect(req.request.params.keys()).toEqual(['categoryId']);
    req.flush({ total: 0, byMember: [], byCategory: [] });
  });
});
