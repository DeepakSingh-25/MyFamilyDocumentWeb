import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { UiService } from '../../../core/services/ui.service';
import { FamilyDocument } from '../../models/models';
import { DocumentTableComponent } from './document-table.component';

const API = environment.apiBaseUrl;
const ASHA = '30000000-0000-4000-8000-000000000005';
const IDENTITY = '10000000-0000-0000-0000-000000000001';
const MEDICAL = '10000000-0000-0000-0000-000000000003';
const PAN_ID = '40000000-0000-4000-8000-000000000007';
const PAN: FamilyDocument = {
  id: PAN_ID, name: 'PAN Card', memberId: ASHA, memberName: 'Asha', categoryId: IDENTITY, categoryName: 'Identity Documents',
  fileName: 'pan.pdf', fileType: 'pdf', fileSize: 10, uploadedOn: '2026-10-16T10:00:00Z',
};

describe('DocumentTableComponent (spec 010)', () => {
  let fixture: ComponentFixture<DocumentTableComponent>;
  let http: HttpTestingController;
  let ui: UiService;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    ui = TestBed.inject(UiService);
    fixture = TestBed.createComponent(DocumentTableComponent);
    fixture.componentRef.setInput('documents', [PAN]);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('asks with the soft-delete wording, deletes and emits deleted', async () => {
    const deleted: FamilyDocument[] = [];
    fixture.componentInstance.deleted.subscribe(d => deleted.push(d));

    (el().querySelector('button[title="Delete"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    const confirm = ui.confirmState()!;
    expect(confirm.title).toBe('Delete document?');
    expect(confirm.message).toBe('"PAN Card" of Asha will be removed from the app.');

    ui.answer(true);
    await fixture.whenStable();
    const req = http.expectOne(`${API}/documents/${PAN_ID}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(deleted).toEqual([PAN]);
    expect(ui.toasts().map(t => t.text)).toContain('Document deleted.');
  });

  it('does nothing when the delete is cancelled', async () => {
    const deleted: FamilyDocument[] = [];
    fixture.componentInstance.deleted.subscribe(d => deleted.push(d));

    (el().querySelector('button[title="Delete"]') as HTMLButtonElement).click();
    ui.answer(false);
    await fixture.whenStable();

    http.expectNone(`${API}/documents/${PAN_ID}`);
    expect(deleted).toEqual([]);
  });

  it('passes returnUrl on the Edit and empty-state Add links', async () => {
    fixture.componentRef.setInput('returnUrl', `/documents?page=3&category=${IDENTITY}`);
    await fixture.whenStable();
    const edit = el().querySelector('a[title="Edit"]')!.getAttribute('href');
    expect(edit).toBe(`/documents/${PAN_ID}/edit?returnUrl=%2Fdocuments%3Fpage%3D3%26category%3D${IDENTITY}`);

    fixture.componentRef.setInput('documents', []);
    fixture.componentRef.setInput('addQueryParams', { member: ASHA });
    await fixture.whenStable();
    const add = [...el().querySelectorAll('a')].find(a => a.textContent?.includes('Add Document'))!;
    expect(add.getAttribute('href')).toBe(`/documents/new?member=${ASHA}&returnUrl=%2Fdocuments%3Fpage%3D3%26category%3D${IDENTITY}`);
  });

  it('should label the empty-state add button with addLabel when it is set', async () => {
    fixture.componentRef.setInput('documents', []);
    await fixture.whenStable();
    expect((el().querySelector('.empty-state a') as HTMLElement).textContent?.trim()).toBe('Add Document');

    fixture.componentRef.setInput('addLabel', 'Add Medical Record');
    await fixture.whenStable();
    expect((el().querySelector('.empty-state a') as HTMLElement).textContent?.trim()).toBe('Add Medical Record');
  });
});

describe('DocumentTableComponent medical view (spec 012 §B.4)', () => {
  let fixture: ComponentFixture<DocumentTableComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const BLOOD: FamilyDocument = {
    id: '40000000-0000-4000-8000-000000000009', name: 'Blood Test', memberId: ASHA, memberName: 'Asha', categoryId: MEDICAL, categoryName: 'Medical Documents',
    fileName: 'b.pdf', fileType: 'pdf', fileSize: 10, uploadedOn: '2026-10-16T10:00:00Z',
    documentDate: '2024-03-12', hospitalOrDoctor: 'Apollo Hospital',
  };
  const headers = () => [...el().querySelectorAll('thead th')].map(th => th.textContent?.trim());
  const mobileCard = () => el().querySelector('.mobile-doc') as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    fixture = TestBed.createComponent(DocumentTableComponent);
    fixture.componentRef.setInput('documents', [BLOOD]);
  });

  it('should show "Uploaded" as the 4th column and the report date under the name when medical', async () => {
    fixture.componentRef.setInput('medical', true);
    await fixture.whenStable();

    expect(headers()).toEqual(['Document', 'Member', 'Hospital / Doctor', 'Uploaded', 'Actions']);
    const cells = [...el().querySelectorAll('tbody tr td')].map(td => td.textContent?.replace(/\s+/g, ' ').trim());
    const nameCell = el().querySelector('tbody tr td') as HTMLElement;
    expect(nameCell.querySelector('.fw-medium')?.textContent?.trim()).toBe('Blood Test');
    expect(nameCell.querySelector('.text-gray')?.textContent?.trim()).toBe('Report: 12 Mar 2024');
    expect(cells[2]).toBe('Apollo Hospital');
    expect(cells[3]).toBe('16 Oct 2026');
  });

  it('should leave the report line out when medical and the record has no report date', async () => {
    fixture.componentRef.setInput('medical', true);
    fixture.componentRef.setInput('documents', [{ ...BLOOD, documentDate: undefined }]);
    await fixture.whenStable();

    expect(el().textContent).not.toContain('Report:');
  });

  it('should show no category pill on the mobile card when medical', async () => {
    fixture.componentRef.setInput('medical', true);
    await fixture.whenStable();

    expect(el().querySelector('.pill')).toBeNull();
    expect(mobileCard().textContent?.replace(/\s+/g, ' ')).toContain('Asha · 16 Oct 2026');
    expect(mobileCard().textContent).toContain('Report: 12 Mar 2024');
  });

  it('should keep the category pill and the "Category" column when not medical', async () => {
    await fixture.whenStable();

    expect(mobileCard().querySelector('.pill')?.textContent?.trim()).toBe('Medical Documents');
    expect(headers()).toEqual(['Document', 'Member', 'Category', 'Uploaded', 'Actions']);
    expect(el().textContent).not.toContain('Report:');
  });
});
