import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { UiService } from '../../../core/services/ui.service';
import { LookupItem } from '../../models/models';
import { QuickAddComponent } from './quick-add.component';

const API = environment.apiBaseUrl;
const OWN_ID = '6a1f0c52-2d4e-4c1b-9a77-0b6f3c2e9a01';

describe('QuickAddComponent (spec 013)', () => {
  let fixture: ComponentFixture<QuickAddComponent>;
  let http: HttpTestingController;
  let saved: LookupItem[];
  let closed: number;
  const el = () => fixture.nativeElement as HTMLElement;
  const render = () => fixture.whenStable();

  function type(selector: string, value: string): void {
    const input = el().querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  }

  const submit = () => (el().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

  async function create(kind: 'category' | 'relationship', item: LookupItem | null = null): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(QuickAddComponent);
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('item', item);
    saved = [];
    closed = 0;
    fixture.componentInstance.saved.subscribe(i => saved.push(i));
    fixture.componentInstance.closed.subscribe(() => closed++);
    await render();
  }

  afterEach(() => http.verify());

  it('adds a relationship with the trimmed name and has no hint field', async () => {
    await create('relationship');
    expect(el().querySelector('h5')?.textContent).toBe('Add Relationship');
    expect(el().querySelector('#quick-examples')).toBeNull();
    expect(el().querySelector('#quick-name')?.getAttribute('maxlength')).toBe('30');

    type('#quick-name', '  Uncle  ');
    submit();
    const post = http.expectOne(r => r.method === 'POST' && r.url === `${API}/relationships`);
    expect(post.request.body).toEqual({ name: 'Uncle' });
    post.flush({ id: OWN_ID, name: 'Uncle', isSystem: false, sortOrder: 500 });
    await render();

    expect(saved.map(s => s.id)).toEqual([OWN_ID]);
  });

  it('renames a category with its hint', async () => {
    await create('category', { id: OWN_ID, name: 'Pets', icon: 'bi-tag', examples: 'Vet bills', isSystem: false, sortOrder: 500 } as LookupItem);
    expect(el().querySelector('h5')?.textContent).toBe('Rename Category');
    expect((el().querySelector('#quick-examples') as HTMLInputElement).value).toBe('Vet bills');

    type('#quick-name', 'Pet Records');
    submit();
    const put = http.expectOne(r => r.method === 'PUT' && r.url === `${API}/categories/${OWN_ID}`);
    expect(put.request.body).toEqual({ name: 'Pet Records', examples: 'Vet bills' });
    put.flush({ id: OWN_ID, name: 'Pet Records', icon: 'bi-tag', examples: 'Vet bills', isSystem: false, sortOrder: 500 });
    await render();

    expect(saved.length).toBe(1);
  });

  it('sends nothing for a blank name', async () => {
    await create('category');

    type('#quick-name', '   ');
    submit();
    await render();

    expect(el().textContent).toContain('Name is required.');
    http.expectNone(r => r.method === 'POST');
  });

  it('keeps the dialog open with the API message on a duplicate (409)', async () => {
    await create('category');

    type('#quick-name', 'medical documents');
    submit();
    http.expectOne(r => r.method === 'POST').flush(
      { detail: 'A category with this name already exists.' }, { status: 409, statusText: 'Conflict' });
    await render();

    expect(el().querySelector('.alert-danger')?.textContent).toContain('A category with this name already exists.');
    expect(saved.length).toBe(0);
    expect(closed).toBe(0);
  });

  it('closes on Esc, but not while a confirm dialog is open', async () => {
    await create('relationship');
    const ui = TestBed.inject(UiService);

    void ui.confirm('Something?', 'A confirm is open.');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toBe(0);

    ui.answer(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toBe(1);
  });
});
