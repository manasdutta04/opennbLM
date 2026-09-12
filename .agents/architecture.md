# Architecture

```
apps/desktop   Electron lifecycle, windows, IPC, service start/stop
apps/preload   Narrow typed bridge only
apps/renderer  React UI
packages/*     Contracts and local capabilities (depend inward)
```

## Packages

- `@opennblm/contracts` — shared types, Studio language list, spoken-sentence helpers
- `@opennblm/memory` — SQLite notebooks, conversations, teaching notes
- `@opennblm/notebook-runtime` — ingest, Studio prompts, podcast script parse
- `@opennblm/teaching-engine` — grounded teaching plans
- `@opennblm/rumik-runtime` — local CUDA worker or remote Space
- `@opennblm/llm-providers` / `engine-runtime` / `local-services` — brains and host services

## Rules

- Keep provider, teaching, memory, and Rumik behind abstractions.
- Never expose Node APIs to the renderer.
- Prefer focused, reversible changes.
- Teaching brains come from the notebook **Connect brain** picker.
