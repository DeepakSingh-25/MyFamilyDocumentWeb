# What is in `frontend/.claude/` and where it came from

Copied on 2026-10-16 from the reference app `D:\Working\work\angular\.claude` (which got them from
the OM.HRMS web checkout).

## Written for this repo (edit freely)

`agents/frontend-architect.md`, `frontend-coder.md`, `frontend-code-reviewer.md`,
`frontend-designer.md`, `frontend-security-auditor.md`, `frontend-tester.md` — rewritten for
My Family Documents (standalone + signals, mock services, document ownership, file uploads).
Also `settings.json`, this file and `../CLAUDE.md`.

## Tier 1 — Official, unmodified (trust these first)

| Path | Source | License |
| --- | --- | --- |
| `skills/angular-developer/` | github.com/angular/skills @ `8e47411` | MIT — Copyright 2026 Google LLC |
| `skills/angular-new-app/` | github.com/angular/skills @ `8e47411` | MIT — Angular Team @ Google |
| `context/best-practices.md` | angular.dev/assets/context/best-practices.md | Angular / Google |
| `context/guidelines.md` | angular.dev/assets/context/guidelines.md | Angular / Google |
| `context/llms.txt` | angular.dev/llms.txt | Angular / Google |

Re-sync commands: `skills/VENDORED.md`, `context/SOURCES.md`.

## Tier 2 — Community / personal skills (copied unchanged)

Angular-specific (4): `angular`, `angular-best-practices`, `angular-state-management`,
`angular-ui-patterns`

Design / UI (18): `frontend-design`, `design-brief`, `design-flow`, `design-review`,
`design-tokens`, `design-taste-frontend`, `information-architecture`, `minimalist-ui`,
`high-end-visual-design`, `industrial-brutalist-ui`, `redesign-existing-projects`,
`review-animations`, `emil-design-eng`, `gpt-taste`, `image-to-code`, `imagegen-frontend-web`,
`brandkit`, `stitch-design-taste`

### Before relying on them

1. The Angular skills target standalone + signals — the same style this app uses, so they fit
   better here than in the reference app. `../CLAUDE.md` still wins on folder layout and mock rules.
2. Design skills push bold redesigns. This app follows the reference theme and must stay simple for
   family use. Use them for ideas only, and only when the user asks for a redesign.
3. Documentation only — no executables. Keep it that way; review any script before adding it.
4. `review-animations` is manual-invoke only (`disable-model-invocation: true`).

## Not copied

The reference `launch.json` (this workspace has its own at `D:\Working\Documents\.claude\launch.json`).
