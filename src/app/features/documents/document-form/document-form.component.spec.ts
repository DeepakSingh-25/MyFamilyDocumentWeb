import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { UiService } from '../../../core/services/ui.service';
import { DocumentCategory, FamilyDocument, FamilyMember } from '../../../shared/models/models';
import { DocumentFormComponent } from './document-form.component';

@Component({ template: 'list' })
class ListStubComponent {}

const API = environment.apiBaseUrl;
const ASHA = '30000000-0000-4000-8000-000000000004';
const MOTHER = '20000000-0000-0000-0000-000000000004';
const IDENTITY = '10000000-0000-0000-0000-000000000001';
const MEDICAL = '10000000-0000-0000-0000-000000000003';
const PETS = '6a1f0c52-2d4e-4c1b-9a77-0b6f3c2e9a01';
const DOC = '40000000-0000-4000-8000-000000000012';
const MEMBERS: FamilyMember[] = [{ id: ASHA, name: 'Asha', relationshipId: MOTHER, relationship: 'Mother', documentCount: 1 }];
const CATEGORIES: DocumentCategory[] = [{ id: IDENTITY, name: 'Identity Documents', icon: 'bi-person-vcard', examples: '', isSystem: true, sortOrder: 10 }];
const PAN: FamilyDocument = {
  id: DOC, name: 'PAN Card', memberId: ASHA, memberName: 'Asha', categoryId: IDENTITY, categoryName: 'Identity Documents',
  fileName: 'pan.pdf', fileType: 'pdf', fileSize: 10, uploadedOn: '2026-10-16T10:00:00Z',
};
const enc = encodeURIComponent;

describe('DocumentFormComponent returnUrl (spec 010 §B.4)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;
  const el = () => harness.routeNativeElement as HTMLElement;
  const render = () => harness.fixture.whenStable();
  const cancelHref = () => [...el().querySelectorAll('a')].find(a => a.textContent?.trim() === 'Cancel')!.getAttribute('href');
  const form = () => harness.routeDebugElement!.componentInstance as DocumentFormComponent;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'documents', component: ListStubComponent },
          { path: 'medical-documents', component: ListStubComponent },
          { path: 'documents/new', component: DocumentFormComponent },
          { path: 'documents/:id/edit', component: DocumentFormComponent },
        ], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function openEdit(returnUrl: string): Promise<void> {
    await harness.navigateByUrl(`/documents/${DOC}/edit?returnUrl=${enc(returnUrl)}`);
    await render();
    http.expectOne(`${API}/categories`).flush(CATEGORIES);
    http.expectOne(`${API}/members`).flush(MEMBERS);
    await render();
    http.expectOne(`${API}/documents/${DOC}`).flush(PAN);
    await render();
  }

  it('accepts a list URL: Cancel and Save go back to the same page and filters', async () => {
    await openEdit(`/documents?category=${IDENTITY}&page=3`);
    expect(cancelHref()).toBe(`/documents?category=${IDENTITY}&page=3`);

    form().save();
    await vi.waitFor(() => http.expectOne(r => r.method === 'PUT' && r.url === `${API}/documents/${DOC}`).flush(PAN));
    await render();

    expect(router.url).toBe(`/documents?category=${IDENTITY}&page=3`);
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', '/documentsX', 'javascript:alert(1)', '/documents/new', `/documents/${DOC}/edit`])(
    'rejects %s and falls back to /documents', async bad => {
      await openEdit(bad);
      expect(cancelHref()).toBe('/documents');

      form().save();
      await vi.waitFor(() => http.expectOne(r => r.method === 'PUT').flush(PAN));
      await render();
      expect(router.url).toBe('/documents');
    });

  it('after adding, returns to the same filters on page 1', async () => {
    await harness.navigateByUrl(`/documents/new?member=${ASHA}&category=${IDENTITY}&returnUrl=${enc(`/documents?category=${IDENTITY}&page=3`)}`);
    await render();
    http.expectOne(`${API}/categories`).flush(CATEGORIES);
    http.expectOne(`${API}/members`).flush(MEMBERS);
    await render();

    form().form.patchValue({ name: 'Aadhaar' });
    form().file.set(new File(['%PDF-1.4 test'], 'a.pdf', { type: 'application/pdf' }));
    form().save();
    await vi.waitFor(() => http.expectOne(r => r.method === 'POST').flush(PAN));
    await render();

    expect(router.url).toBe(`/documents?category=${IDENTITY}`);
  });

  // ---- spec 012 §B.6 ----

  async function openAdd(url: string): Promise<void> {
    await harness.navigateByUrl(url);
    await render();
    http.expectOne(`${API}/categories`).flush(CATEGORIES);
    http.expectOne(`${API}/members`).flush(MEMBERS);
    await render();
  }

  async function save(): Promise<void> {
    form().form.patchValue({ name: 'Blood Test', memberId: ASHA, categoryId: IDENTITY });
    form().file.set(new File(['%PDF-1.4 test'], 'a.pdf', { type: 'application/pdf' }));
    form().save();
    await vi.waitFor(() => http.expectOne(r => r.method === 'POST').flush(PAN));
    await render();
  }

  it('should say "Add Medical Record" and toast "Medical record saved." when opened from Medical Records', async () => {
    await openAdd(`/documents/new?category=${MEDICAL}&member=${ASHA}&returnUrl=${enc(`/medical-documents?member=${ASHA}`)}`);
    const ui = TestBed.inject(UiService);

    expect(el().querySelector('h2')?.textContent?.trim()).toBe('Add Medical Record');
    expect(el().textContent?.replace(/\s+/g, ' ')).toContain('Medical Records / Add');

    await save();
    expect(ui.toasts().map(t => t.text)).toEqual(['Medical record saved.']);
    expect(router.url).toBe(`/medical-documents?member=${ASHA}`);
  });

  it('should say "Add Document" and toast "Document saved." when opened from /documents', async () => {
    await openAdd(`/documents/new?returnUrl=${enc('/documents')}`);
    const ui = TestBed.inject(UiService);

    expect(el().querySelector('h2')?.textContent?.trim()).toBe('Add Document');

    await save();
    expect(ui.toasts().map(t => t.text)).toEqual(['Document saved.']);
    expect(router.url).toBe('/documents');
  });

  // ---- File box: drag & drop + remove ----

  const dropEvent = (file: File) =>
    ({ preventDefault: () => {}, dataTransfer: { files: [file] } }) as unknown as DragEvent;

  it('attaches a dropped file and shows its name', async () => {
    await openAdd('/documents/new');

    form().onDrop(dropEvent(new File(['%PDF-1.4 test'], 'bill.pdf', { type: 'application/pdf' })));
    await render();

    expect(form().file()?.name).toBe('bill.pdf');
    expect(el().querySelector('.drop-zone')?.textContent).toContain('bill.pdf');
  });

  it('shows the size error for a dropped file that is too big', async () => {
    await openAdd('/documents/new');

    form().onDrop(dropEvent(new File([new Uint8Array(11 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' })));
    await render();

    expect(form().file()).toBeNull();
    expect(el().querySelector('.field-error')?.textContent).toContain('Maximum size is 10 MB');
  });

  it('removes the chosen file with the cross button without opening the file picker', async () => {
    await openAdd('/documents/new');
    form().onDrop(dropEvent(new File(['%PDF-1.4 test'], 'bill.pdf', { type: 'application/pdf' })));
    await render();
    const pickerClick = vi.spyOn(HTMLInputElement.prototype, 'click');

    (el().querySelector('.remove-file') as HTMLButtonElement).click();
    await render();

    expect(form().file()).toBeNull();
    expect(el().querySelector('.remove-file')).toBeNull();
    expect(el().querySelector('.drop-zone')?.textContent).toContain('Click to choose a file');
    expect(pickerClick).not.toHaveBeenCalled();
    pickerClick.mockRestore();
  });

  // ---- spec 013: "+ Add new category…" ----

  function choose(label: string): void {
    const select = el().querySelector('#category') as HTMLSelectElement;
    select.value = [...select.options].find(o => o.textContent?.trim() === label)!.value;
    select.dispatchEvent(new Event('change'));
  }

  const selectedCategory = () => {
    const select = el().querySelector('#category') as HTMLSelectElement;
    return select.options[select.selectedIndex].textContent?.trim();
  };

  it('adds a new category from the dropdown, selects it and shows its hint', async () => {
    await openAdd(`/documents/new?category=${IDENTITY}&returnUrl=${enc('/documents')}`);

    choose('+ Add new category…');
    await render();
    expect(el().querySelector('app-quick-add')).not.toBeNull();
    expect(selectedCategory()).toBe('Identity Documents');

    const name = el().querySelector('#quick-name') as HTMLInputElement;
    name.value = ' Pets ';
    name.dispatchEvent(new Event('input'));
    const hint = el().querySelector('#quick-examples') as HTMLInputElement;
    hint.value = 'Vet bills';
    hint.dispatchEvent(new Event('input'));
    (el().querySelector('app-quick-add form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    const post = http.expectOne(r => r.method === 'POST' && r.url === `${API}/categories`);
    expect(post.request.body).toEqual({ name: 'Pets', examples: 'Vet bills' });
    post.flush({ id: PETS, name: 'Pets', icon: 'bi-tag', examples: 'Vet bills', isSystem: false, sortOrder: 500 });
    await render();

    expect(el().querySelector('app-quick-add')).toBeNull();
    expect(form().form.controls.categoryId.value).toBe(PETS);
    expect(selectedCategory()).toBe('Pets');
    expect(el().textContent).toContain('Vet bills');
  });

  it('keeps the old category when the "+ Add new" dialog is cancelled', async () => {
    await openAdd(`/documents/new?category=${IDENTITY}&returnUrl=${enc('/documents')}`);

    choose('+ Add new category…');
    await render();
    ([...el().querySelectorAll('app-quick-add button')].find(b => b.textContent?.trim() === 'Cancel') as HTMLButtonElement).click();
    await render();

    expect(el().querySelector('app-quick-add')).toBeNull();
    expect(form().form.controls.categoryId.value).toBe(IDENTITY);
    http.expectNone(r => r.method === 'POST');
  });
});
