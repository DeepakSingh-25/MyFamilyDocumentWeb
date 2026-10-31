import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { errorMessage } from '../../../core/http/error-message';
import { CategoryService } from '../../../core/services/category.service';
import { DocumentService } from '../../../core/services/document.service';
import { MemberService } from '../../../core/services/member.service';
import { UiService } from '../../../core/services/ui.service';
import { DocumentTableComponent } from '../../../shared/components/document-table/document-table.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { DEFAULT_PAGE_SIZE } from '../../../shared/constants';
import { DocumentCounts, DocumentQuery, FamilyDocument, FamilyMember, PagedResult } from '../../../shared/models/models';
import { lastPageIfPastEnd } from '../../../shared/paging';
import { confirmMemberDelete } from '../confirm-member-delete';
import { MemberFormComponent } from '../member-form/member-form.component';
import { InitialsPipe } from '../../../shared/initials.pipe';

type PageState = 'loading' | 'ready' | 'notFound' | 'error';

/** One member's documents, paged on the server; chips and totals from `/documents/counts?memberId=` (spec 010 §B.3). */
@Component({
  selector: 'app-member-documents',
  imports: [InitialsPipe, RouterLink, DocumentTableComponent, MemberFormComponent, PaginatorComponent],
  templateUrl: './member-documents.component.html',
  styleUrl: './member-documents.component.css',
})
export class MemberDocumentsComponent implements OnInit {
  private readonly members = inject(MemberService);
  private readonly documents = inject(DocumentService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  /** Route param bound via withComponentInputBinding(). */
  readonly id = input.required<string>();

  readonly categories = inject(CategoryService).categories();
  readonly category = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly member = signal<FamilyMember | null>(null);
  readonly result = signal<PagedResult<FamilyDocument> | null>(null);
  readonly docs = computed(() => this.result()?.items ?? []);
  readonly counts = signal<DocumentCounts>({ total: 0, byMember: [], byCategory: [] });
  /** All of the member's documents (not just this page). */
  readonly total = computed(() => this.counts().total);
  readonly state = signal<PageState>('loading');
  readonly loadError = signal('');
  readonly docsLoading = signal(false);
  readonly formOpen = signal(false);
  /** Whole family, loaded when Edit opens — only needed to disable a second "Self". */
  readonly family = signal<FamilyMember[]>([]);

  readonly memberId = computed(() => this.id());
  readonly addParams = computed(() => ({ member: this.memberId() }));
  /** Add / Edit come back here (spec 010 §B.4). */
  readonly returnUrl = computed(() => `/family-members/${this.memberId()}`);

  private docsSub?: Subscription;

  ngOnInit(): void {
    this.open();
  }

  /** Member, then their counts and current page. Also used by Retry. */
  open(): void {
    this.state.set('loading');
    this.members.get(this.memberId()).subscribe({
      next: m => {
        this.member.set(m);
        forkJoin({ counts: this.documents.counts({ memberId: this.memberId() }), page: this.documents.list(this.query()) }).subscribe({
          next: ({ counts, page }) => {
            this.result.set(page);
            this.state.set('ready');
            const before = this.category();
            this.setCounts(counts);
            // The selected chip is gone, or the page is past the end — load the right page
            if (this.category() !== before || lastPageIfPastEnd(this.page(), page.items.length, page.totalPages)) this.loadDocs();
          },
          error: err => this.fail(err),
        });
      },
      error: err => this.fail(err),
    });
  }

  selectCategory(categoryId: string): void {
    this.category.set(categoryId);
    this.page.set(1);
    this.loadDocs();
  }

  onPage(page: number): void {
    this.page.set(page);
    this.loadDocs();
  }

  onPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.loadDocs();
  }

  /** After a document was deleted from the table: counts first (the chip may go), then the current page. */
  reloadDocs(): void {
    this.docsLoading.set(true);
    this.documents.counts({ memberId: this.memberId() }).subscribe({
      next: counts => { this.setCounts(counts); this.loadDocs(); },
      error: err => { this.docsLoading.set(false); this.ui.error(errorMessage(err)); },
    });
  }

  countFor(categoryId: string): number {
    return this.counts().byCategory.find(c => c.categoryId === categoryId)?.count ?? 0;
  }

  /** Family first, so "Self" is already disabled when the dialog appears. If that fails, the API's 409 still guards it. */
  openEdit(): void {
    this.members.list().subscribe({
      next: list => { this.family.set(list); this.formOpen.set(true); },
      error: () => { this.family.set([]); this.formOpen.set(true); },
    });
  }

  onSaved(saved: FamilyMember): void {
    this.formOpen.set(false);
    this.member.set(saved);
  }

  onMissing(message: string): void {
    this.formOpen.set(false);
    this.ui.error(message);
    this.state.set('notFound');
  }

  async remove(): Promise<void> {
    const m = this.member();
    // counts.total = all of the member's documents, not the rows on this page (spec 010 §B.3)
    if (!m || !(await confirmMemberDelete(this.ui, { ...m, documentCount: this.total() }))) return;
    this.ui.loading.set(true);
    this.members.delete(m.id).subscribe({
      next: () => {
        this.ui.loading.set(false);
        this.ui.success('Member deleted.');
        void this.router.navigateByUrl('/family-members');
      },
      error: err => {
        this.ui.loading.set(false);
        this.ui.error(errorMessage(err));
        if (err instanceof HttpErrorResponse && err.status === 404) this.state.set('notFound');
      },
    });
  }

  private query(): DocumentQuery {
    return { memberId: this.memberId(), categoryId: this.category(), page: this.page(), pageSize: this.pageSize() };
  }

  /** Current page; a page that is now past the end (its last row was deleted) moves to the last page. */
  private loadDocs(): void {
    this.docsSub?.unsubscribe();
    this.docsLoading.set(true);
    this.docsSub = this.documents.list(this.query()).subscribe({
      next: res => {
        const last = lastPageIfPastEnd(this.page(), res.items.length, res.totalPages);
        if (last) { this.page.set(last); this.loadDocs(); return; }
        this.result.set(res);
        this.docsLoading.set(false);
      },
      error: err => { this.docsLoading.set(false); this.ui.error(errorMessage(err)); },
    });
  }

  /** A selected category with no documents left would hide its own chip — go back to All (spec 008 §B.3). */
  private setCounts(counts: DocumentCounts): void {
    this.counts.set(counts);
    if (this.category() && !this.countFor(this.category())) {
      this.category.set('');
      this.page.set(1);
    }
  }

  /** 404 = the member is not there (or not ours); anything else can be retried. */
  private fail(err: unknown): void {
    if (err instanceof HttpErrorResponse && err.status === 404) { this.state.set('notFound'); return; }
    this.loadError.set(errorMessage(err));
    this.state.set('error');
  }
}
