import { Component, computed, input, output } from '@angular/core';
import { PAGE_SIZES } from '../../constants';

type PageItem = number | 'gap';

let nextId = 0;

/** "Showing 11–20 of 57 · Rows [10] · ‹ 1 2 [3] 4 … 6 ›" under a paged table (spec 010 §B.1). */
@Component({
  selector: 'app-paginator',
  templateUrl: './paginator.component.html',
  styleUrl: './paginator.component.css',
})
export class PaginatorComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly totalCount = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly disabled = input(false);
  /** Name of the `<nav>` landmark for screen readers. */
  readonly label = input('Documents pages');
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  readonly sizes = PAGE_SIZES;
  readonly sizeId = `paginator-size-${nextId++}`;

  readonly from = computed(() => Math.min((this.page() - 1) * this.pageSize() + 1, this.totalCount()));
  readonly to = computed(() => Math.min(this.page() * this.pageSize(), this.totalCount()));

  /** First, last, current ± 1 and "…" for gaps — at most 7 entries. */
  readonly pages = computed<PageItem[]>(() => {
    const total = this.totalPages();
    const current = Math.min(Math.max(this.page(), 1), total);
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, 'gap', total];
    if (current >= total - 3) return [1, 'gap', total - 4, total - 3, total - 2, total - 1, total];
    return [1, 'gap', current - 1, current, current + 1, 'gap', total];
  });

  go(page: number): void {
    if (this.disabled() || page < 1 || page > this.totalPages() || page === this.page()) return;
    this.pageChange.emit(page);
  }

  /** While disabled (loading) the choice is undone, so the select keeps showing the size in use. */
  changeSize(select: HTMLSelectElement): void {
    const size = Number(select.value);
    if (this.disabled()) { select.value = String(this.pageSize()); return; }
    if (size !== this.pageSize()) this.pageSizeChange.emit(size);
  }
}
