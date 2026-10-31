import { Component, computed, DestroyRef, ElementRef, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, UrlTree } from '@angular/router';
import { ACCEPT_ATTR, checkFile, formatSize, MAX_FILE_MB } from '../../../core/file-rules';
import { errorMessage } from '../../../core/http/error-message';
import { safeDocumentReturnUrl, withoutPage } from '../../../core/navigation/safe-return-url';
import { CategoryService } from '../../../core/services/category.service';
import { QuickAddComponent } from '../../../shared/components/quick-add/quick-add.component';
import { watchAddNewOption } from '../../../shared/add-new-option';
import { ADD_NEW_ID, MEDICAL_CATEGORY_ID } from '../../../shared/constants';
import { DocumentService } from '../../../core/services/document.service';
import { MemberService } from '../../../core/services/member.service';
import { UiService } from '../../../core/services/ui.service';
import { FamilyDocument, FamilyMember, LookupItem } from '../../../shared/models/models';
import { toId } from '../../../shared/paging';

@Component({
  selector: 'app-document-form',
  imports: [ReactiveFormsModule, RouterLink, QuickAddComponent],
  templateUrl: './document-form.component.html',
  styleUrl: './document-form.component.css',
})
export class DocumentFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly docs = inject(DocumentService);
  private readonly memberService = inject(MemberService);
  private readonly ui = inject(UiService);

  /** Route param (edit) and ?member= / ?category= query params (add). */
  readonly id = input<string>();
  readonly member = input<string>();
  readonly category = input<string>();
  /** The list to come back to (spec 010 §B.4); checked by safeReturnUrl, otherwise ignored. */
  readonly returnUrl = input<string>();

  /** Checked return URL, or null when missing / not one of our lists. */
  readonly back = computed(() => safeDocumentReturnUrl(this.router, this.returnUrl()));
  /** Cancel, breadcrumb and "Back" target: the return URL, else All Documents. */
  readonly backTree = computed(() => this.back() ?? this.router.parseUrl('/documents'));
  readonly backLabel = computed(() => {
    const first = this.backTree().root.children['primary']?.segments[0]?.path;
    return first === 'medical-documents' ? 'Medical Records' : first === 'family-members' ? 'Family Members' : 'All Documents';
  });

  readonly categories = inject(CategoryService).categories();
  readonly addNewId = ADD_NEW_ID;
  /** "+ Add new category…" dialog is open (spec 013). */
  readonly addingCategory = signal(false);
  readonly maxMb = MAX_FILE_MB;
  readonly accept = ACCEPT_ATTR;
  readonly size = formatSize;

  readonly members = signal<FamilyMember[]>([]);
  readonly existing = signal<FamilyDocument | null>(null);
  readonly ready = signal(false);
  readonly loadError = signal('');
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly file = signal<File | null>(null);
  readonly fileError = signal('');
  /** File box ke upar kuch drag ho raha hai. */
  readonly dragging = signal(false);
  /** Small thumbnail for a chosen JPG / PNG (our own blob: URL; revoked on change and destroy). */
  readonly previewUrl = signal<string | null>(null);
  readonly isEdit = computed(() => !!this.id());
  /** Opened from Medical Records (or a plain "add medical" link): medical heading and toasts (spec 012 §B.6). */
  readonly medicalContext = computed(() => this.backLabel() === 'Medical Records'
    || (!this.back() && !this.isEdit() && toId(this.category()) === MEDICAL_CATEGORY_ID));
  readonly heading = computed(() =>
    `${this.isEdit() ? 'Edit' : 'Add'} ${this.medicalContext() ? 'Medical Record' : 'Document'}`);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    memberId: ['', Validators.required],
    categoryId: ['', Validators.required],
    documentDate: [''],
    hospitalOrDoctor: ['', Validators.maxLength(150)],
    notes: ['', Validators.maxLength(1000)],
  });

  private readonly categoryValue = toSignal(this.form.controls.categoryId.valueChanges, { initialValue: '' });
  readonly selectedCategory = computed(() => this.categories().find(c => c.id === this.categoryValue()));
  readonly isMedical = computed(() => this.categoryValue() === MEDICAL_CATEGORY_ID);

  private readonly categorySelect = viewChild<ElementRef<HTMLSelectElement>>('categorySelect');

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.setPreview(null));
    watchAddNewOption(this.form.controls.categoryId, destroyRef, () => this.addingCategory.set(true));
  }

  /** New category from the dialog: select it. */
  onCategoryAdded(item: LookupItem): void {
    this.form.controls.categoryId.setValue(item.id);
    this.form.controls.categoryId.markAsDirty();
    this.closeAddCategory();
  }

  /** Dialog closed: keyboard focus back on the select. */
  closeAddCategory(): void {
    this.addingCategory.set(false);
    this.categorySelect()?.nativeElement.focus();
  }

  ngOnInit(): void {
    this.memberService.list().subscribe({
      next: list => {
        this.members.set(list);
        if (this.isEdit()) this.loadExisting();
        else {
          this.form.patchValue({ memberId: toId(this.member()), categoryId: toId(this.category()) });
          this.ready.set(true);
        }
      },
      error: err => this.loadError.set(errorMessage(err)),
    });
  }

  private loadExisting(): void {
    this.docs.get(this.id() ?? '').subscribe({
      next: d => {
        this.existing.set(d);
        this.form.patchValue({
          name: d.name,
          memberId: d.memberId,
          categoryId: d.categoryId,
          documentDate: d.documentDate ?? '',
          hospitalOrDoctor: d.hospitalOrDoctor ?? '',
          notes: d.notes ?? '',
        });
        this.ready.set(true);
      },
      error: err => this.loadError.set(errorMessage(err)),
    });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.pickFile(file);
  }

  onDragOver(event: DragEvent): void {
    // Sirf files ke liye drop allow (text / link nahi)
    if (!event.dataTransfer?.types.includes('Files') || this.saving()) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    this.dragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    // Andar ke child element par jaane se bhi dragleave aata hai — box se bahar nikalne par hi band
    const zone = event.currentTarget as HTMLElement;
    if (!zone.contains(event.relatedTarget as Node | null)) this.dragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file && !this.saving()) this.pickFile(file);
  }

  /** Cross button: chuni hui file hatao. Label ke andar hai, isliye file picker na khule. */
  removeFile(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.pickFile(null);
  }

  private pickFile(file: File | null): void {
    this.file.set(null);
    this.setPreview(null);
    this.fileError.set('');
    if (!file) return;
    const problem = checkFile(file);
    if (problem) { this.fileError.set(problem); return; }
    this.file.set(file);
    if (file.type.startsWith('image/')) this.setPreview(file);
  }

  private setPreview(file: File | null): void {
    const old = this.previewUrl();
    if (old) URL.revokeObjectURL(old);
    this.previewUrl.set(file ? URL.createObjectURL(file) : null);
  }

  save(): void {
    if (!this.isEdit() && !this.file() && !this.fileError()) this.fileError.set('Please choose a file to upload.');
    if (this.form.invalid || this.fileError()) { this.form.markAllAsTouched(); return; }

    const input = { ...this.form.getRawValue(), file: this.file() };
    this.saving.set(true);
    this.saveError.set('');
    const request = this.isEdit() ? this.docs.update(this.id() ?? '', input) : this.docs.create(input);
    request.subscribe({
      next: () => {
        const what = this.medicalContext() ? 'Medical record' : 'Document';
        this.ui.success(`${what} ${this.isEdit() ? 'updated' : 'saved'}.`);
        void this.router.navigateByUrl(this.afterSave(input.categoryId));
      },
      error: err => { this.saving.set(false); this.saveError.set(errorMessage(err)); },
    });
  }

  /** Edit → back to the same list page. Add → same filters, page 1 (the new document is first). No return URL → as before. */
  private afterSave(categoryId: string): UrlTree | string {
    const back = this.back();
    if (back) return this.isEdit() ? back : withoutPage(this.router, back);
    return categoryId === MEDICAL_CATEGORY_ID ? '/medical-documents' : '/documents';
  }
}
