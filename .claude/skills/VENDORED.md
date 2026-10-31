# Vendored skills — provenance

These skill folders are **not written by us**. They are copied verbatim from Angular's
official skills repository so that every teammate (and every AI agent session) gets the
same guidance without a per-machine install step.

| Skill | Upstream | License | Author |
| --- | --- | --- | --- |
| `angular-developer/` | https://github.com/angular/skills | MIT | Copyright 2026 Google LLC |
| `angular-new-app/` | https://github.com/angular/skills | MIT | Angular Team @ Google |

- Pinned commit: `8e47411bdab04f8278e23d4b9767648a62751730` (BUILD_INFO date: Fri Aug 7 23:43:52 UTC 2026)
- Vendored on: 2026-08-10
- Upstream source of truth: `angular/angular` repo, `skills/dev-skills/` directory.

## Do not edit these files

Local edits will be lost on the next sync and break the "official, unmodified" guarantee.
Project-specific rules belong in `../../AGENTS.md`, not here.

## Re-syncing to a newer version

```bash
# from the web/ repo root
curl -sSL https://codeload.github.com/angular/skills/tar.gz/main -o /tmp/ng-skills.tar.gz
tar xzf /tmp/ng-skills.tar.gz -C /tmp
rm -rf .claude/skills/angular-developer .claude/skills/angular-new-app
cp -r /tmp/skills-main/angular-developer /tmp/skills-main/angular-new-app .claude/skills/
# then update the pinned commit + date in this file and commit
```

Alternative (community CLI, not required): `npx skills add https://github.com/angular/skills`

## A note on version fit

The upstream skills target modern Angular (v20+ / v21+ APIs: standalone-by-default,
signals, signal forms, Vitest). This repository is Angular 22 but deliberately uses
NgModules, Eager change detection, RxJS services and Karma — see `AGENTS.md` §3 for how
to apply them. Use the skills for API facts, not for restructuring the app.
