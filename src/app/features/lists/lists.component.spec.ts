import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { routes } from '../../app.routes';
import { UiService } from '../../core/services/ui.service';
import { DocumentCategory, Relationship } from '../../shared/models/models';
import { ListsComponent } from './lists.component';

const API = environment.apiBaseUrl;
const PETS = '6a1f0c52-2d4e-4c1b-9a77-0b6f3c2e9a01';
const UNCLE = '6a1f0c52-2d4e-4c1b-9a77-0b6f3c2e9a02';
const CATEGORIES: DocumentCategory[] = [
  { id: '10000000-0000-0000-0000-000000000001', name: 'Identity Documents', icon: 'bi-person-vcard', examples: 'Aadhaar, PAN', isSystem: true, sortOrder: 10 },
  { id: PETS, name: 'Pets', icon: 'bi-tag', examples: 'Vet bills', isSystem: false, sortOrder: 500 },
];
const RELATIONSHIPS: Relationship[] = [
  { id: '20000000-0000-0000-0000-000000000001', name: 'Self', isSystem: true, sortOrder: 10 },
  { id: UNCLE, name: 'Uncle', isSystem: false, sortOrder: 500 },
];

describe('ListsComponent (spec 013)', () => {
  let fixture: ComponentFixture<ListsComponent>;
  let http: HttpTestingController;
  let ui: UiService;
  const el = () => fixture.nativeElement as HTMLElement;
  const render = () => fixture.whenStable();
  const rows = () => [...el().querySelectorAll('.lookup-row')] as HTMLElement[];
  const row = (name: string) => rows().find(r => r.textContent?.includes(name))!;

  /** Opens the Categories page or the Relationships page — each loads only its own list. */
  async function create(kind: 'category' | 'relationship'): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    ui = TestBed.inject(UiService);
    fixture = TestBed.createComponent(ListsComponent);
    fixture.componentRef.setInput('kind', kind);
    await render();
    if (kind === 'category') http.expectOne(`${API}/categories`).flush(CATEGORIES);
    else http.expectOne(`${API}/relationships`).flush(RELATIONSHIPS);
    await render();
  }

  afterEach(() => http.verify());

  it('Categories page: marks built-in items and offers Rename / Delete only on the user\'s own', async () => {
    await create('category');

    expect(el().querySelector('h2')?.textContent).toContain('Document Categories');
    expect(row('Identity Documents').textContent).toContain('Built-in');
    expect(row('Identity Documents').querySelector('[title="Delete"]')).toBeNull();
    expect(row('Pets').textContent).toContain('Vet bills');
    expect(row('Pets').querySelector('[title="Rename"]')).not.toBeNull();
    expect(rows().some(r => r.textContent?.includes('Uncle'))).toBe(false);
  });

  it('Relationships page: shows only relationships', async () => {
    await create('relationship');

    expect(el().querySelector('h2')?.textContent).toContain('Relationships');
    expect(row('Self').textContent).toContain('Built-in');
    expect(row('Uncle').querySelector('[title="Delete"]')).not.toBeNull();
    expect(rows().some(r => r.textContent?.includes('Pets'))).toBe(false);
  });

  it('deletes after confirm and removes the row', async () => {
    await create('relationship');
    (row('Uncle').querySelector('[title="Delete"]') as HTMLButtonElement).click();
    ui.answer(true);
    await render();
    http.expectOne(r => r.method === 'DELETE' && r.url === `${API}/relationships/${UNCLE}`).flush(null, { status: 204, statusText: 'No Content' });
    await render();

    expect(rows().some(r => r.textContent?.includes('Uncle'))).toBe(false);
    expect(ui.toasts().map(t => t.text)).toContain('Relationship deleted.');
  });

  it('keeps the row and shows the API message when the item is in use (409)', async () => {
    await create('category');
    (row('Pets').querySelector('[title="Delete"]') as HTMLButtonElement).click();
    ui.answer(true);
    await render();
    http.expectOne(r => r.method === 'DELETE' && r.url === `${API}/categories/${PETS}`).flush(
      { detail: 'This category has documents. Move them to another category first.' }, { status: 409, statusText: 'Conflict' });
    await render();

    expect(row('Pets')).toBeTruthy();
    expect(ui.toasts().map(t => t.text)).toContain('This category has documents. Move them to another category first.');
  });

  it('renames an own category in place', async () => {
    await create('category');
    (row('Pets').querySelector('[title="Rename"]') as HTMLButtonElement).click();
    await render();
    const name = el().querySelector('#quick-name') as HTMLInputElement;
    expect(name.value).toBe('Pets');
    name.value = 'Pet Records';
    name.dispatchEvent(new Event('input'));
    (el().querySelector('app-quick-add form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    const put = http.expectOne(r => r.method === 'PUT' && r.url === `${API}/categories/${PETS}`);
    expect(put.request.body).toEqual({ name: 'Pet Records', examples: 'Vet bills' });
    put.flush({ ...CATEGORIES[1], name: 'Pet Records' });
    await render();

    expect(el().querySelector('app-quick-add')).toBeNull();
    expect(row('Pet Records')).toBeTruthy();
  });
});

describe('Categories / Relationships routes', () => {
  it('pass the right kind to each page, and the old /lists goes to Categories', () => {
    const pages = routes.flatMap(r => r.children ?? []);
    expect(pages.find(r => r.path === 'categories')?.data).toEqual({ kind: 'category' });
    expect(pages.find(r => r.path === 'relationships')?.data).toEqual({ kind: 'relationship' });
    expect(pages.find(r => r.path === 'lists')?.redirectTo).toBe('categories');
  });
});
