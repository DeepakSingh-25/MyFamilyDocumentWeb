import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnDestroy, output, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { formatSize } from '../../../core/file-rules';
import { errorMessage } from '../../../core/http/error-message';
import { DocumentService } from '../../../core/services/document.service';
import { UiService } from '../../../core/services/ui.service';
import { MEDICAL_CATEGORY_ID } from '../../constants';
import { FamilyDocument } from '../../models/models';

interface PreviewState { doc: FamilyDocument; url?: string; pdfUrl?: SafeResourceUrl; }

/** Documents table (desktop) / card list (mobile) with view, download, edit and delete. */
@Component({
  selector: 'app-document-table',
  imports: [DatePipe, RouterLink],
  templateUrl: './document-table.component.html',
  styleUrl: './document-table.component.css',
})
export class DocumentTableComponent implements OnDestroy {
  private readonly docs = inject(DocumentService);
  private readonly ui = inject(UiService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly documents = input.required<FamilyDocument[]>();
  readonly loading = input(false);
  readonly emptyText = input('No documents found.');
  /** Medical view: hospital/doctor instead of category, report date under the name, no category pill (spec 012 §B.4). */
  readonly medical = input(false);
  /** Text of the empty-state add button. */
  readonly addLabel = input('Add Document');
  readonly medicalId = MEDICAL_CATEGORY_ID;
  /** Query params for the empty-state "Add Document" link, e.g. `{ member: '<member GUID>' }` to pre-select the member. */
  readonly addQueryParams = input<Record<string, string | number> | null>(null);
  /** Current list URL (with filters and page) — Add / Edit come back to it (spec 010 §B.4). */
  readonly returnUrl = input<string | null>(null);

  readonly editParams = computed(() => {
    const returnUrl = this.returnUrl();
    return returnUrl ? { returnUrl } : null;
  });
  readonly addParams = computed(() => {
    const returnUrl = this.returnUrl();
    return returnUrl ? { ...this.addQueryParams(), returnUrl } : this.addQueryParams();
  });
  readonly deleted = output<FamilyDocument>();

  readonly preview = signal<PreviewState | null>(null);
  readonly size = formatSize;

  openPreview(doc: FamilyDocument): void {
    this.preview.set({ doc });
    this.docs.getFile(doc.id).subscribe({
      next: blob => {
        // Purani / doosri request ka jawab — ya preview pehle hi khul chuka (blob URL leak na ho)
        const current = this.preview();
        if (current?.doc.id !== doc.id || current.url) return;
        const url = URL.createObjectURL(blob);
        // Only our own blob: URLs are ever trusted for the iframe.
        const pdfUrl = doc.fileType === 'pdf' && url.startsWith('blob:')
          ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : undefined;
        this.preview.set({ doc, url, pdfUrl });
      },
      error: err => { this.preview.set(null); this.ui.error(errorMessage(err)); },
    });
  }

  closePreview(): void {
    const url = this.preview()?.url;
    if (url) URL.revokeObjectURL(url);
    this.preview.set(null);
  }

  download(doc: FamilyDocument): void {
    this.docs.getFile(doc.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: err => this.ui.error(errorMessage(err)),
    });
  }

  async remove(doc: FamilyDocument): Promise<void> {
    const ok = await this.ui.confirm('Delete document?', `"${doc.name}" of ${doc.memberName} will be removed from the app.`);
    if (!ok) return;
    this.ui.loading.set(true);
    this.docs.delete(doc.id).subscribe({
      next: () => {
        this.ui.loading.set(false);
        this.ui.success('Document deleted.');
        this.deleted.emit(doc);
      },
      error: err => { this.ui.loading.set(false); this.ui.error(errorMessage(err)); },
    });
  }

  ngOnDestroy(): void {
    this.closePreview();
  }
}
