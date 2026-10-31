import { Router, UrlTree } from '@angular/router';

/** Lists the document form may go back to (spec 010 §B.4). */
export const DOCUMENT_RETURN_ROOTS = ['documents', 'medical-documents', 'family-members'];

/** Signed-in pages the login page may send the user back to. */
export const APP_RETURN_ROOTS = ['dashboard', 'family-members', 'documents', 'medical-documents', 'account'];

/**
 * A `returnUrl` from the query string, made safe to navigate to — or `null` (use the page's fallback).
 * The value must be an app path (one leading `/`, not `//` or `/\`), and its first path segment must be one of
 * `roots`. Navigate only with `router.navigateByUrl(tree)` / `[routerLink]="tree"`, never with the raw string.
 */
export function safeReturnUrl(router: Router, value: string | null | undefined, roots: readonly string[]): UrlTree | null {
  if (!value || value[0] !== '/' || value[1] === '/' || value[1] === '\\') return null;
  // Control characters and backslashes have no place in our own URLs
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;
  let tree: UrlTree;
  try {
    tree = router.parseUrl(value);
  } catch {
    return null;
  }
  const outlets = Object.keys(tree.root.children);
  if (outlets.length !== 1 || outlets[0] !== 'primary') return null;
  const first = tree.root.children['primary'].segments[0]?.path;
  return first && roots.includes(first) ? tree : null;
}

/**
 * Return URL for the document form: one of our lists, but never a form page itself
 * (`/documents/new`, `/documents/{id}/edit`) — Save or Cancel would only open another form.
 */
export function safeDocumentReturnUrl(router: Router, value: string | null | undefined): UrlTree | null {
  const tree = safeReturnUrl(router, value, DOCUMENT_RETURN_ROOTS);
  const paths = tree?.root.children['primary'].segments.map(s => s.path) ?? [];
  if (paths[0] === 'documents' && paths.length > 1) return null;
  return tree;
}

/** A copy of `tree` without the `page` query param (back on page 1, filters kept). */
export function withoutPage(router: Router, tree: UrlTree): UrlTree {
  const copy = router.parseUrl(router.serializeUrl(tree));
  const { page: _page, ...rest } = copy.queryParams;
  copy.queryParams = rest;
  return copy;
}
