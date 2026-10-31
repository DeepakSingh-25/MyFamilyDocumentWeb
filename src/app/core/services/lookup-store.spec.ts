import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Relationship } from '../../shared/models/models';
import { RelationshipService } from './relationship.service';

const URL = `${environment.apiBaseUrl}/relationships`;
const SELF = '20000000-0000-0000-0000-000000000001';
const OTHER = '20000000-0000-0000-0000-000000000013';
const UNCLE = '6a1f0c52-2d4e-4c1b-9a77-0b6f3c2e9a01';
const AUNT = '6a1f0c52-2d4e-4c1b-9a77-0b6f3c2e9a02';
const SYSTEM: Relationship[] = [
  { id: SELF, name: 'Self', isSystem: true, sortOrder: 10 },
  { id: OTHER, name: 'Other', isSystem: true, sortOrder: 1000 },
];

/** LookupStore through its relationship subclass (spec 013). */
describe('LookupStore', () => {
  let service: RelationshipService;
  let http: HttpTestingController;
  const names = () => service.relationships()().map(r => r.name);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RelationshipService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads once, however many pages ask', () => {
    service.relationships();
    service.relationships();
    http.expectOne(URL).flush(SYSTEM);
    service.relationships();

    expect(names()).toEqual(['Self', 'Other']);
  });

  it('puts a created item in API order (own items before "Other")', () => {
    service.load();
    http.expectOne(URL).flush(SYSTEM);

    service.create({ name: 'Uncle' }).subscribe();
    http.expectOne(r => r.method === 'POST').flush({ id: UNCLE, name: 'Uncle', isSystem: false, sortOrder: 500 });
    service.create({ name: 'Aunt' }).subscribe();
    http.expectOne(r => r.method === 'POST').flush({ id: AUNT, name: 'Aunt', isSystem: false, sortOrder: 500 });

    expect(names()).toEqual(['Self', 'Aunt', 'Uncle', 'Other']);
  });

  it('replaces a renamed item and drops a removed one', () => {
    service.load();
    http.expectOne(URL).flush([...SYSTEM, { id: UNCLE, name: 'Uncle', isSystem: false, sortOrder: 500 }]);

    service.update(UNCLE, { name: 'Chacha' }).subscribe();
    http.expectOne(r => r.method === 'PUT' && r.url === `${URL}/${UNCLE}`).flush({ id: UNCLE, name: 'Chacha', isSystem: false, sortOrder: 500 });
    expect(names()).toEqual(['Self', 'Chacha', 'Other']);

    service.remove(UNCLE).subscribe();
    http.expectOne(r => r.method === 'DELETE').flush(null, { status: 204, statusText: 'No Content' });
    expect(names()).toEqual(['Self', 'Other']);
  });

  it('clear() drops a load still on its way, so the next user never sees it', () => {
    service.load();
    const pending = http.expectOne(URL);

    service.clear();

    expect(pending.cancelled).toBe(true);
    expect(names()).toEqual([]);
    service.load();
    http.expectOne(URL).flush(SYSTEM);
  });

  it('does not start a list from one late-saved item after clear()', () => {
    service.load();
    http.expectOne(URL).flush(SYSTEM);
    service.create({ name: 'Uncle' }).subscribe();
    const post = http.expectOne(r => r.method === 'POST');

    service.clear();
    post.flush({ id: UNCLE, name: 'Uncle', isSystem: false, sortOrder: 500 });

    expect(names()).toEqual([]);
    http.expectOne(URL);
  });

  it('reports a failed load and tries again on the next request', () => {
    service.load();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Error' });
    expect(service.loadFailed()).toBe(true);

    service.load();
    expect(service.loadFailed()).toBe(false);
    http.expectOne(URL).flush(SYSTEM);
  });
});
