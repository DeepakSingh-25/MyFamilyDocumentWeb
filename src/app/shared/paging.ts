import { DEFAULT_PAGE_SIZE, PAGE_SIZES, SEARCH_MAX } from './constants';

/** Largest value the API binds to an `int`; anything above is a 400 there, so it counts as "not set" here. */
const INT_MAX = 2147483647;

/**
 * Reading list state from query params (`?search=&member=&category=&page=&size=`, spec 010 §B.1).
 * Bad values fall back to the default, so a hand-edited URL never reaches the API as a 400.
 */

/** A GUID as the API sends it (spec 014); anything else in `memberId` / `categoryId` is a 400 there. */
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `?member=` / `?category=` → GUID id in lower case (as the API sends it), '' = all. */
export function toId(value: string | null | undefined): string {
  const id = (value ?? '').trim().toLowerCase();
  return GUID.test(id) ? id : '';
}

/** `?page=` → 1 or more. */
export function toPage(value: string | null | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= INT_MAX ? n : 1;
}

/** `?size=` → one of PAGE_SIZES, else the default. */
export function toPageSize(value: string | null | undefined): number {
  const n = Number(value);
  return PAGE_SIZES.includes(n) ? n : DEFAULT_PAGE_SIZE;
}

/** `?search=` → at most SEARCH_MAX characters. */
export function toSearch(value: string | null | undefined): string {
  return (value ?? '').slice(0, SEARCH_MAX);
}

/** Query params for paging; the defaults are left out of the URL. */
export function pagingParams(page: number, pageSize: number): Record<string, number> {
  const params: Record<string, number> = {};
  if (page > 1) params['page'] = page;
  if (pageSize !== DEFAULT_PAGE_SIZE) params['size'] = pageSize;
  return params;
}

/** The page asked for is past the end (e.g. `?page=99`, or the last row of a page was deleted) — go to this page instead. */
export function lastPageIfPastEnd(page: number, itemCount: number, totalPages: number): number | null {
  return itemCount === 0 && totalPages > 0 && page > totalPages ? totalPages : null;
}
