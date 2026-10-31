import { Component, computed, effect, ElementRef, inject, input, linkedSignal, OnInit, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, EMPTY, map, Subject, switchMap, tap } from 'rxjs';
import { errorMessage } from '../../core/http/error-message';
import { DocumentService } from '../../core/services/document.service';
import { MemberService } from '../../core/services/member.service';
import { DocumentTableComponent } from '../../shared/components/document-table/document-table.component';
import { PaginatorComponent } from '../../shared/components/paginator/paginator.component';
import { MEDICAL_CATEGORY_ID, SEARCH_MAX } from '../../shared/constants';
import { DocumentCounts, FamilyDocument, FamilyMember, PagedResult } from '../../shared/models/models';
import { lastPageIfPastEnd, pagingParams, toId, toPage, toPageSize, toSearch } from '../../shared/paging';
import { InitialsPipe } from '../../shared/initials.pipe';

interface MedicalState {
  search: string;
  memberId: string;
  page: number;
  pageSize: number;
}

/**
 * Medical Records, paged on the server (spec 010 §B.3). URL: `/medical-documents?member=&search=&page=&size=`.
 * Tab counts come from `/documents/counts?categoryId=<Medical GUID>` and ignore the search text.
 */
@Component({
  selector: 'app-medical-list',
  imports: [InitialsPipe, RouterLink, DocumentTableComponent, PaginatorComponent],
  templateUrl: './medical-list.component.html',
  styleUrl: './medical-list.component.css',
})
export class MedicalListComponent implements OnInit {
  private readonly docs = inject(DocumentService);
  private readonly memberService = inject(MemberService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Query params, bound via withComponentInputBinding(). */
  readonly member = input<string>();
  readonly search = input<string>();
  readonly page = input<string>();
  readonly size = input<string>();

  readonly medicalId = MEDICAL_CATEGORY_ID;
  readonly searchMax = SEARCH_MAX;
  readonly members = signal<FamilyMember[]>([]);
  private readonly membersLoaded = signal(false);
  readonly counts = signal<DocumentCounts | null>(null);
  readonly result = signal<PagedResult<FamilyDocument> | null>(null);
  readonly records = computed(() => this.result()?.items ?? []);
  readonly loading = signal(true);
  readonly loadError = signal('');
  private readonly reload = signal(0);

  readonly state = computed<MedicalState>(() => ({
    search: toSearch(this.search()),
    memberId: toId(this.member()),
    page: toPage(this.page()),
    pageSize: toPageSize(this.size()),
  }));

  readonly searchText = linkedSignal<string, string>({
    source: () => this.state().search,
    computation: (search, previous) => previous && previous.value.trim() === search.trim() ? previous.value : search,
  });

  readonly currentUrl = computed(() =>
    this.router.serializeUrl(this.router.createUrlTree(['/medical-documents'], { queryParams: this.params(this.state()) })));
  readonly hasFilters = computed(() => {
    const s = this.state();
    return !!s.search.trim() || !!s.memberId;
  });

  /** Add pre-selects Medical and the selected tab's member (spec 012 §B.5); "Everyone" → no member. */
  readonly addQuery = computed<Record<string, string | number>>(() => {
    const query: Record<string, string | number> = { category: this.medicalId };
    const memberId = this.state().memberId;
    if (memberId) query['member'] = memberId;
    return query;
  });
  readonly addParams = computed(() => ({ ...this.addQuery(), returnUrl: this.currentUrl() }));

  private readonly card = viewChild<ElementRef<HTMLElement>>('card');
  private readonly typed = new Subject<string>();

  constructor() {
    toObservable(computed(() => ({ ...this.state(), reload: this.reload() }))).pipe(
      tap(() => { this.loading.set(true); this.loadError.set(''); }),
      switchMap(query => this.docs.list({ ...query, categoryId: MEDICAL_CATEGORY_ID }).pipe(
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

    this.typed.pipe(debounceTime(250), takeUntilDestroyed()).subscribe(text => {
      if (text !== this.searchText() || text.trim() === this.state().search.trim()) return;
      this.go({ search: text, page: 1 }, true);
    });

    // A member id from the URL that is not ours (e.g. deleted) → back to "Everyone" (spec 010 §B.6).
    effect(() => {
      const memberId = this.state().memberId;
      if (memberId && this.membersLoaded() && !this.members().some(m => m.id === memberId)) {
        untracked(() => this.go({ memberId: '', page: 1 }, true));
      }
    });
  }

  ngOnInit(): void {
    this.memberService.list().subscribe({
      next: list => { this.members.set(list); this.membersLoaded.set(true); },
      error: () => this.members.set([]),
    });
    this.loadCounts();
  }

  /** Tab numbers; when they cannot be loaded the tabs show without numbers. */
  loadCounts(): void {
    this.docs.counts({ categoryId: MEDICAL_CATEGORY_ID }).subscribe({
      next: c => this.counts.set(c),
      error: () => this.counts.set(null),
    });
  }

  countFor(memberId: string): number {
    return this.counts()?.byMember.find(m => m.memberId === memberId)?.count ?? 0;
  }

  onSearch(text: string): void {
    this.searchText.set(text);
    this.typed.next(text);
  }

  onMember(id: string): void { this.go({ memberId: id, page: 1 }); }
  onPageSize(size: number): void { this.go({ pageSize: size, page: 1 }); }

  onPage(page: number): void {
    this.go({ page });
    this.card()?.nativeElement.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }

  clear(): void {
    this.searchText.set('');
    this.go({ search: '', memberId: '', page: 1 });
  }

  /** Retry, and reload after a delete: counts and the current page (an emptied page moves back one). */
  refresh(): void {
    this.loadCounts();
    this.reload.update(n => n + 1);
  }

  private go(patch: Partial<MedicalState>, replaceUrl = false): void {
    const next = { ...this.state(), ...patch };
    void this.router.navigate([], { relativeTo: this.route, queryParams: this.params(next), replaceUrl });
  }

  private params(s: MedicalState): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (s.memberId) params['member'] = s.memberId;
    if (s.search.trim()) params['search'] = s.search.trim();
    return { ...params, ...pagingParams(s.page, s.pageSize) };
  }
}
