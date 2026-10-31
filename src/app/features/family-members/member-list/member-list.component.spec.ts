import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { authInterceptor } from '../../../core/http/auth.interceptor';
import { errorInterceptor } from '../../../core/http/error.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { UiHostComponent } from '../../../shared/components/ui-host/ui-host.component';
import { FamilyMember, Relationship } from '../../../shared/models/models';
import { MemberListComponent } from './member-list.component';

const URL = `${environment.apiBaseUrl}/members`;
const SELF = '20000000-0000-0000-0000-000000000001';
const MOTHER = '20000000-0000-0000-0000-000000000004';
const OTHER = '20000000-0000-0000-0000-000000000013';
const UNCLE = '6a1f0c52-2d4e-4c1b-9a77-0b6f3c2e9a01';
const ASHA_ID = '30000000-0000-4000-8000-000000000001';
const ASHA: FamilyMember = { id: ASHA_ID, name: 'Asha', relationshipId: MOTHER, relationship: 'Mother', dateOfBirth: '1962-03-04', documentCount: 1 };
const ME: FamilyMember = { id: '30000000-0000-4000-8000-000000000002', name: 'Rohit', relationshipId: SELF, relationship: 'Self', documentCount: 0 };
const REL_URL = `${environment.apiBaseUrl}/relationships`;
const RELATIONSHIPS: Relationship[] = [
  { id: SELF, name: 'Self', isSystem: true, sortOrder: 10 },
  { id: MOTHER, name: 'Mother', isSystem: true, sortOrder: 40 },
  { id: OTHER, name: 'Other', isSystem: true, sortOrder: 1000 },
];

describe('MemberListComponent (spec 008)', () => {
  let fixture: ComponentFixture<MemberListComponent>;
  let http: HttpTestingController;
  let ui: UiService;
  let auth: { sessionExpired: ReturnType<typeof vi.fn> };
  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => el().textContent ?? '';
  const button = (label: string) =>
    [...el().querySelectorAll('button')].find(b => b.textContent?.trim().includes(label)) as HTMLButtonElement;

  async function render(): Promise<void> {
    await fixture.whenStable();
  }

  function type(selector: string, value: string): void {
    const input = el().querySelector(selector) as HTMLInputElement | HTMLSelectElement;
    input.value = value;
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'));
    input.dispatchEvent(new Event('blur'));
  }

  /** Picks a select option by its text (ngValue options have generated values). */
  function choose(selector: string, label: string): void {
    const select = el().querySelector(selector) as HTMLSelectElement;
    const option = [...select.options].find(o => o.textContent?.trim() === label)!;
    select.value = option.value;
    select.dispatchEvent(new Event('change'));
    select.dispatchEvent(new Event('blur'));
  }

  /** Opens Add Member; the dialog loads the relationships (spec 013). */
  async function openAddForm(): Promise<void> {
    button('Add Member').click();
    await render();
    http.expectOne(REL_URL).flush(RELATIONSHIPS);
    await render();
  }

  beforeEach(async () => {
    sessionStorage.setItem('fd_token', 'test-token');
    auth = { sessionExpired: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    ui = TestBed.inject(UiService);
    fixture = TestBed.createComponent(MemberListComponent);
    await render();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('shows the members from the API', async () => {
    http.expectOne(URL).flush([ASHA, ME]);
    await render();

    expect(text()).toContain('Asha');
    expect(text()).toContain('Mother · 4 Mar 1962');
    expect(text()).toContain('1 document');
    expect(text()).toContain('0 documents');
  });

  it('shows the empty state only after an empty answer', async () => {
    http.expectOne(URL).flush([]);
    await render();

    expect(text()).toContain('No family members yet.');
  });

  it('shows an error with Retry instead of the empty state, and Retry loads the list', async () => {
    http.expectOne(URL).flush({ detail: 'Database is down.' }, { status: 500, statusText: 'Error' });
    await render();

    expect(text()).toContain('Could not load family members.');
    expect(text()).not.toContain('No family members yet.');

    button('Retry').click();
    http.expectOne(URL).flush([ASHA]);
    await render();
    expect(text()).toContain('Asha');
  });

  it('adds a member and reloads the list', async () => {
    http.expectOne(URL).flush([]);
    await render();
    await openAddForm();

    type('#name', '  Asha  ');
    choose('#relationship', 'Mother');
    (el().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    const post = http.expectOne(r => r.method === 'POST' && r.url === URL);
    expect(post.request.body).toEqual({ name: 'Asha', relationshipId: MOTHER, dateOfBirth: null });
    expect(post.request.headers.get('Authorization')).toBe('Bearer test-token');
    post.flush({ ...ASHA, documentCount: 0 });
    http.expectOne(URL).flush([ASHA]);
    await render();

    expect(el().querySelector('app-member-form')).toBeNull();
    expect(ui.toasts().map(t => t.text)).toContain('Member added.');
  });

  it('keeps the dialog open with the API message on a duplicate name (409)', async () => {
    http.expectOne(URL).flush([ASHA]);
    await render();
    await openAddForm();

    type('#name', 'asha');
    choose('#relationship', 'Mother');
    (el().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    http.expectOne(r => r.method === 'POST').flush(
      { detail: 'A family member with this name already exists.' }, { status: 409, statusText: 'Conflict' });
    await render();

    expect(el().querySelector('app-member-form')).not.toBeNull();
    expect(el().querySelector('.alert-danger')?.textContent).toContain('A family member with this name already exists.');
  });

  it('shows separate name errors and sends nothing for a blank name', async () => {
    http.expectOne(URL).flush([]);
    await render();
    await openAddForm();

    type('#name', '   ');
    await render();
    expect(text()).toContain('Name is required.');

    const input = el().querySelector('#name') as HTMLInputElement;
    expect(input.getAttribute('maxlength')).toBe('100');
    (el().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    http.expectNone(r => r.method === 'POST');
  });

  it('disables "Self" when another member is already Self, but not when editing that member', async () => {
    http.expectOne(URL).flush([ASHA, ME]);
    await render();

    await openAddForm();
    const self = () => [...el().querySelectorAll('#relationship option')].find(o => o.textContent?.startsWith('Self')) as HTMLOptionElement;
    expect(self().disabled).toBe(true);
    expect(self().textContent).toContain('(already added)');

    fixture.componentInstance.formOpen.set(false);
    fixture.componentInstance.openForm(ME);
    await render();
    expect(self().disabled).toBe(false);
  });

  it('asks "Discard changes?" before closing a dirty form, and Esc on that confirm keeps the form', async () => {
    http.expectOne(URL).flush([]);
    await render();
    // The app shell renders the confirm dialog (and its Esc handler) once, before any page dialog opens
    const host = TestBed.createComponent(UiHostComponent);
    await host.whenStable();
    await openAddForm();
    type('#name', 'Half typed');

    button('Cancel').click();
    await render();
    expect(ui.confirmState()?.title).toBe('Discard changes?');
    await host.whenStable();
    expect(document.activeElement?.textContent?.trim()).toBe('Cancel');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await render();
    expect(ui.confirmState()).toBeNull();
    expect(el().querySelector('app-member-form')).not.toBeNull();
  });

  it('does not delete when the confirm is cancelled', async () => {
    http.expectOne(URL).flush([ASHA]);
    await render();

    (el().querySelector('[title="Delete"]') as HTMLButtonElement).click();
    expect(ui.confirmState()?.message).toBe('Asha and all 1 of their documents will be removed from the app.');
    ui.answer(false);
    await render();

    http.expectNone(r => r.method === 'DELETE');
  });

  it('deletes after confirm and reloads', async () => {
    http.expectOne(URL).flush([ASHA]);
    await render();

    (el().querySelector('[title="Delete"]') as HTMLButtonElement).click();
    ui.answer(true);
    await render();
    http.expectOne(r => r.method === 'DELETE' && r.url === `${URL}/${ASHA_ID}`).flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(URL).flush([]);
    await render();

    expect(ui.toasts().map(t => t.text)).toContain('Member deleted.');
    expect(text()).toContain('No family members yet.');
  });

  it('adds a new relationship from the dropdown, selects it and sends its id (spec 013)', async () => {
    http.expectOne(URL).flush([]);
    await render();
    await openAddForm();

    type('#name', 'Mohan');
    choose('#relationship', '+ Add new relationship…');
    await render();
    expect(el().querySelector('app-quick-add')).not.toBeNull();

    type('#quick-name', '  Uncle ');
    (el().querySelector('app-quick-add form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    const create = http.expectOne(r => r.method === 'POST' && r.url === REL_URL);
    expect(create.request.body).toEqual({ name: 'Uncle' });
    create.flush({ id: UNCLE, name: 'Uncle', isSystem: false, sortOrder: 500 });
    await render();

    expect(el().querySelector('app-quick-add')).toBeNull();
    const select = el().querySelector('#relationship') as HTMLSelectElement;
    expect(select.options[select.selectedIndex].textContent?.trim()).toBe('Uncle');
    // Own items sit before "Other"
    expect([...select.options].map(o => o.textContent?.trim()))
      .toEqual(['Select', 'Self', 'Mother', 'Uncle', 'Other', '+ Add new relationship…']);

    (el().querySelector('app-member-form form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    const post = http.expectOne(r => r.method === 'POST' && r.url === URL);
    expect(post.request.body).toEqual({ name: 'Mohan', relationshipId: UNCLE, dateOfBirth: null });
    post.flush({ id: '30000000-0000-4000-8000-000000000003', name: 'Mohan', relationshipId: UNCLE, relationship: 'Uncle', documentCount: 0 });
    http.expectOne(URL).flush([]);
    await render();
  });

  it('Esc closes only the "+ Add new" dialog, not the member dialog under it', async () => {
    http.expectOne(URL).flush([]);
    await render();
    await openAddForm();
    choose('#relationship', '+ Add new relationship…');
    await render();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await render();

    expect(el().querySelector('app-quick-add')).toBeNull();
    expect(el().querySelector('app-member-form')).not.toBeNull();
  });

  it('cancelling "+ Add new" leaves the form untouched, so closing asks nothing', async () => {
    http.expectOne(URL).flush([]);
    await render();
    await openAddForm();
    choose('#relationship', '+ Add new relationship…');
    await render();

    ([...el().querySelectorAll('app-quick-add button')].find(b => b.textContent?.trim() === 'Cancel') as HTMLButtonElement).click();
    await render();
    expect(document.activeElement?.id).toBe('relationship');
    ([...el().querySelectorAll('app-member-form button')].find(b => b.textContent?.trim() === 'Cancel') as HTMLButtonElement).click();
    await render();

    expect(ui.confirmState()).toBeNull();
    expect(el().querySelector('app-member-form')).toBeNull();
  });

  it('shows the API message in the "+ Add new" dialog on a duplicate (409)', async () => {
    http.expectOne(URL).flush([]);
    await render();
    await openAddForm();
    choose('#relationship', '+ Add new relationship…');
    await render();

    type('#quick-name', 'father');
    (el().querySelector('app-quick-add form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    http.expectOne(r => r.method === 'POST' && r.url === REL_URL).flush(
      { detail: 'A relationship with this name already exists.' }, { status: 409, statusText: 'Conflict' });
    await render();

    expect(el().querySelector('app-quick-add .alert-danger')?.textContent).toContain('A relationship with this name already exists.');
  });

  it('ends the session on a 401', async () => {
    http.expectOne(URL).flush(null, { status: 401, statusText: 'Unauthorized' });
    await render();

    expect(auth.sessionExpired).toHaveBeenCalled();
  });
});
