import { HttpClient } from '@angular/common/http';
import { inject, Signal, signal } from '@angular/core';
import { Observable, Subscription, tap } from 'rxjs';
import { LookupItem } from '../../shared/models/models';
import { UiService } from './ui.service';

/**
 * One shared list of built-in + the user's own items from a lookup endpoint (spec 013), loaded once and
 * kept in step with create / update / remove. `clear()` on sign-out so the next user never sees it.
 */
export abstract class LookupStore<T extends LookupItem, TInput> {
  private readonly http = inject(HttpClient);
  private readonly ui = inject(UiService);
  private pending: Subscription | null = null;
  private readonly list = signal<T[]>([]);
  private readonly failed = signal(false);
  /** The last load failed (pages show a message instead of "Loading…"). */
  readonly loadFailed = this.failed.asReadonly();

  /** Full API URL, e.g. `${apiBaseUrl}/categories`. */
  protected abstract readonly url: string;
  /** Toast when the list cannot be loaded. */
  protected abstract readonly loadErrorText: string;

  /**
   * The list for a page. Loads it if it is not there yet — so a page opened after a failed
   * load tries again instead of showing empty dropdowns for the whole session.
   */
  items(): Signal<T[]> {
    this.load();
    return this.list.asReadonly();
  }

  load(): void {
    if (this.pending || this.list().length) return;
    this.failed.set(false);
    this.pending = this.http.get<T[]>(this.url).subscribe({
      next: list => { this.list.set(list); this.pending = null; },
      error: () => {
        this.pending = null;
        this.failed.set(true);
        this.ui.error(this.loadErrorText);
      },
    });
  }

  /** Forget the list (sign-out) and drop a load still on its way. The next `items()` loads it again. */
  clear(): void {
    this.pending?.unsubscribe();
    this.pending = null;
    this.list.set([]);
  }

  create(input: TInput): Observable<T> {
    return this.http.post<T>(this.url, input).pipe(tap(item => this.upsert(item)));
  }

  update(id: string, input: TInput): Observable<T> {
    return this.http.put<T>(`${this.url}/${id}`, input).pipe(tap(item => this.upsert(item)));
  }

  /** Built-in items: 403. In use (documents / members): 409 with a message to show. */
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      tap(() => this.list.update(list => list.filter(i => i.id !== id))));
  }

  /** Insert or replace, in the API's order (sort order, then name). */
  private upsert(item: T): void {
    // Empty = not loaded (built-in rows always exist) or cleared at sign-out while a save was on its way:
    // never start a list from one item — the next load() brings it anyway
    if (!this.list().length) return;
    this.list.update(list => [...list.filter(i => i.id !== item.id), item].sort((a, b) =>
      a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));
  }
}
