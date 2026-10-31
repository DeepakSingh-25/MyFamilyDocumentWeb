# Official Angular LLM context files — provenance

Downloaded verbatim from angular.dev on **2026-08-10**. Unmodified. Do not edit;
re-download to update.

| File | Source URL |
| --- | --- |
| `best-practices.md` | https://angular.dev/assets/context/best-practices.md |
| `guidelines.md` | https://angular.dev/assets/context/guidelines.md |
| `llms.txt` | https://angular.dev/llms.txt |

Not vendored (too large — fetch on demand):

- Full docs corpus: https://angular.dev/assets/context/llms-full.txt
- Cursor rules file: https://angular.dev/assets/context/angular-20.mdc
- Antigravity/Gemini rules: https://angular.dev/assets/context/GEMINI.md

Index page these come from: https://angular.dev/ai/develop-with-ai

## Refresh command

```bash
# from the web/ repo root
for f in best-practices.md guidelines.md; do
  curl -sSL -o .claude/context/$f https://angular.dev/assets/context/$f
done
curl -sSL -o .claude/context/llms.txt https://angular.dev/llms.txt
```

## Which file does what

- `best-practices.md` — short, rule-shaped. This is what the Angular CLI MCP server's
  `get_best_practices` tool returns. Use it as the coding-rules baseline.
- `guidelines.md` — the longer version Angular publishes for VS Code / JetBrains /
  Windsurf instruction files.
- `llms.txt` — a link index of angular.dev, for agents that can fetch pages.

**Version caveat:** these files are written against Angular v20+ defaults (e.g. "standalone
is the default in v20+", "OnPush is the default in v22+"). This repo is on v19. See
`AGENTS.md` § "Applying the official guidance" before following them literally.
