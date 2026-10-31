# My Family Documents — web (Angular 22) — guide for Claude

Private web app to store and manage the important documents of ~10 family members.
Backend lives in `../backend` (see `../backend/CLAUDE.md`). Run with `npm start` → http://localhost:5500.

## What exists (verified 2026-10-16)

| Fact | Value |
| --- | --- |
| Angular | 22.2.x, `@angular/build:application`, TypeScript ~6.0, **zoneless**, `strictTemplates` on |
| Component style | **Standalone**, `inject()`, signals / `computed` / `linkedSignal`, `@if` / `@for` / `@let`; route params via `withComponentInputBinding()` |
| Styling | Bootstrap 5 + Bootstrap Icons + `src/styles.css` (theme tokens `--fd-*`, Poppins, primary `#0043E0`). Theme taken from `D:\Working\work\angular` |
| Forms | Reactive, `fb.nonNullable.group`, camelCase control names, errors in `.field-error` |
| Routing | `src/app/app.routes.ts`, every page `loadComponent`. App pages under `ShellComponent` + `authGuard`; login / sign-up use `guestGuard` |
| Data | **Live API, no mock.** `core/services/{auth,member,document,category,relationship}.service.ts` call the .NET API (category + relationship share `lookup-store.ts`, spec 013) (`../backend`, contract in `../docs/specs/001-api-real-database.md` §3.3). The old `core/mock/` folder is deleted — don't bring seed data back |
| HTTP | `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))` in `app.config.ts`; `environment.apiBaseUrl` (dev `http://localhost:5000/api`, prod `/api`); JWT in `sessionStorage['fd_token']`, restored via `/auth/me` in `provideAppInitializer`; 401 → `AuthService.sessionExpired()`; user-facing error text via `core/http/error-message.ts` (ProblemDetails `detail`) |
| Tests | `npx ng test --watch=false` — `@angular/build:unit-test` (Vitest + happy-dom, added 2026-10-16 for spec 008). Specs so far: `features/family-members/**`. Zoneless: act → `await fixture.whenStable()` → assert; HTTP via `HttpTestingController`. On this server, run it from PowerShell — from Git Bash the DOM library loads too slowly and Vitest's 60 s worker-start limit fails |
| UI feedback | `core/services/ui.service.ts` — `success()`, `error()`, `confirm()`, `loading`; rendered by `shared/components/ui-host.component.ts` |

## Folder layout (fixed by the product spec)

```
src/app/core       layout (shell + sidebar), guards, http/ (interceptors, error-message), services, file-rules.ts
src/app/shared     models/models.ts, validators.ts, constants.ts (MEDICAL_CATEGORY_ID, SELF_RELATIONSHIP_ID = fixed GUIDs, ADD_NEW_ID = 'new'; all ids are GUID strings, spec 014), paging.ts (toId: GUID or ''), components/ (document-table + preview, ui-host, quick-add)
src/app/features   auth, dashboard, family-members, documents, medical-documents, lists (spec 013), account
```

## Rules that are easy to break

1. **Ownership.** Every member/document read or write is scoped to the signed-in user. Never add a
   service method that skips it.
2. **API is the source of truth.** No mock or seed data in the web app. A new service method needs a
   real endpoint in `../backend/Documents.Api/Controllers/`. The interceptor adds the token only for
   URLs under `environment.apiBaseUrl` — keep it that way.
3. **Files.** Upload checks live in `core/file-rules.ts` (PDF / JPG / PNG, 10 MB, real file header).
   Reuse them; the API must repeat them server-side.
4. **One `bypassSecurityTrustResourceUrl`** (`shared/components/document-table.component.ts`), limited to
   our own `blob:` URLs. Don't add more. No `innerHTML =`, no `eval`.
5. **No new npm packages** without asking. Write files UTF-8 with Write/Edit, not PowerShell `Set-Content`.
6. Keep it simple — personal family app, no enterprise features.

## JSON casing (decided)

**camelCase** on both sides — the API uses ASP.NET's default.

## Commands (from `frontend/`)

```bash
npm install
npm start          # http://localhost:5500 (port set in angular.json)
npm run build      # gate before "done"
```

## Agents and skills in `.claude/`

Agents (written for this repo): `frontend-architect`, `frontend-coder`, `frontend-code-reviewer`,
`frontend-designer`, `frontend-security-auditor`, `frontend-tester`.
Skills + `context/`: copied from the reference app — see `.claude/PROVENANCE.md`. Where a skill
disagrees with this file, **this file wins**.
