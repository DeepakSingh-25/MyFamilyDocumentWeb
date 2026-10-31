import { Component, computed, effect, ElementRef, inject, input, linkedSignal, OnInit, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, EMPTY, map, Subject, switchMap, tap } from 'rxjs';
import { errorMessage } from '../../../core/http/error-message';
import { CategoryService } from '../../../core/services/category.service';
import { DocumentService } from '../../../core/services/document.service';
import { MemberService } from '../../../core/services/member.service';
import { DocumentTableComponent } from '../../../shared/components/document-table/document-table.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { SEARCH_MAX } from '../../../shared/constants';
import { FamilyDocument, FamilyMember, PagedResult } from '../../../shared/models/models';
import { lastPageIfPastEnd, pagingParams, toId, toPage, toPageSize, toSearch } from '../../../shared/paging';

interface ListState {
  search: string;
  memberId: string;
  categoryId: string;
  page: number;
  pageSize: number;
}

/**
 * All Documents. The URL is the single source of truth (spec 010 §B.1):
 * `/documents?search=&member=&category=&page=&size=` — the page only reads it and navigates to change it.
 */
@Component({
  selector: 'app-document-list',
  imports: [RouterLink, DocumentTableComponent, PaginatorComponent],
  templateUrl: './document-list.component.html',
  styleUrl: './document-list.component.css',
})
export class DocumentListComponent implements OnInit {
  private readonly docs = inject(DocumentService);
  private readonly memberService = inject(MemberService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Query params, bound via withComponentInputBinding(). `member` / `category` are also used by dashboard links. */
  readonly search = input<string>();
  readonly member = input<string>();
  readonly category = input<string>();
  readonly page = input<string>();
  readonly size = input<string>();

  readonly searchMax = SEARCH_MAX;
  readonly categories = inject(CategoryService).categories();
  readonly members = signal<FamilyMember[]>([]);
  private readonly membersLoaded = signal(false);
  readonly result = signal<PagedResult<FamilyDocument> | null>(null);
  readonly documents = computed(() => this.result()?.items ?? []);
  readonly loading = signal(true);
  readonly loadError = signal('');
  private readonly reload = signal(0);

  readonly state = computed<ListState>(() => ({
    search: toSearch(this.search()),
    memberId: toId(this.member()),
    categoryId: toId(this.category()),
    page: toPage(this.page()),
    pageSize: toPageSize(this.size()),
  }));

  /** What the search box shows. Follows the URL, but keeps the user's own spaces while typing. */
  readonly searchText = linkedSignal<string, string>({
    source: () => this.state().search,
    computation: (search, previous) => previous && previous.value.trim() === search.trim() ? previous.value : search,
  });

  readonly hasFilters = computed(() => {
    const s = this.state();
    return !!s.search.trim() || !!s.memberId || !!s.categoryId;
  });

  /** This list's URL, passed to Add / Edit as `returnUrl` (spec 010 §B.4). */
  readonly currentUrl = computed(() =>
    this.router.serializeUrl(this.router.createUrlTree(['/documents'], { queryParams: this.params(this.state()) })));

  private readonly card = viewChild<ElementRef<HTMLElement>>('card');
  private readonly typed = new Subject<string>();

  constructor() {
    // Every URL change (and Retry / delete) loads at once; switchMap drops older answers.
    toObservable(computed(() => ({ ...this.state(), reload: this.reload() }))).pipe(
      tap(() => { this.loading.set(true); this.loadError.set(''); }),
      switchMap(query => this.docs.list(query).pipe(
        map(res => ({ query, res })),
        catchError(err => { this.loadError.set(errorMessage(err)); this.loading.set(false); return EMPTY; }),
      )),
      takeUntilDestroyed(),
    ).subscribe(({ query, res }) => {
      const last = lastPageIfPastEnd(query.page, res.items.length, res.totalPages);
      if (last) { this.go({ page: last }, true); return; }
      this.result.set(res);
      this.loading.set(false);
    });

    // Only typing is debounced; a value the user has already changed (or cleared) is dropped.
    this.typed.pipe(debounceTime(250), takeUntilDestroyed()).subscribe(text => {
      if (text !== this.searchText() || text.trim() === this.state().search.trim()) return;
      this.go({ search: text, page: 1 }, true);
    });

    // A member / category id from the URL that is not ours (e.g. deleted) → back to "All".
    effect(() => {
      const s = this.state();
      const patch: Partial<ListState> = {};
      if (s.memberId && this.membersLoaded() && !this.members().some(m => m.id === s.memberId)) patch.memberId = '';
      const categories = this.categories();
      if (s.categoryId && categories.length && !categories.some(c => c.id === s.categoryId)) patch.categoryId = '';
      if (Object.keys(patch).length) untracked(() => this.go({ ...patch, page: 1 }, true));
    });
  }

  ngOnInit(): void {
    this.memberService.list().subscribe({
      next: list => { this.members.set(list); this.membersLoaded.set(true); },
      error: () => this.members.set([]),
    });
  }

  onSearch(text: string): void {
    this.searchText.set(text);
    this.typed.next(text);
  }

  onMember(id: string): void { this.go({ memberId: id, page: 1 }); }
  onCategory(id: string): void { this.go({ categoryId: id, page: 1 }); }
  onPageSize(size: number): void { this.go({ pageSize: size, page: 1 }); }

  onPage(page: number): void {
    this.go({ page });
    this.card()?.nativeElement.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }

  clear(): void {
    this.searchText.set('');
    this.go({ search: '', memberId: '', categoryId: '', page: 1 });
  }

  /** Retry after an error, and reload after a delete (an emptied page then moves back one page). */
  refresh(): void {
    this.reload.update(n => n + 1);
  }

  /** Changes the URL; the list follows. Typing and corrections replace the history entry, clicks add one. */
  private go(patch: Partial<ListState>, replaceUrl = false): void {
    const next = { ...this.state(), ...patch };
    void this.router.navigate([], { relativeTo: this.route, queryParams: this.params(next), replaceUrl });
  }

  private params(s: ListState): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (s.search.trim()) params['search'] = s.search.trim();
    if (s.memberId) params['member'] = s.memberId;
    if (s.categoryId) params['category'] = s.categoryId;
    return { ...params, ...pagingParams(s.page, s.pageSize) };
  }
}
