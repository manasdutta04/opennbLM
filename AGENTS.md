# opennbLM Engineering Guide

opennbLM is a native, local-first, voice-first learning companion. Treat this repository as a new product; do not recover or recreate the deleted application.

Longer product notes for coding agents live in [`.agents/`](.agents/). Read that folder on a fresh clone.

## Boundaries

- `apps/desktop` owns Electron lifecycle, windows, IPC registration, and service startup/shutdown.
- `apps/preload` is the only renderer-to-main bridge and must expose narrowly typed APIs.
- `apps/renderer` contains React UI only. It must not import Node or Electron APIs.
- `packages/*` contain contracts and local capabilities. Keep dependencies flowing inward through interfaces.

## Rules

- Keep provider, teaching, memory, and Rumik integrations behind abstractions.
- Never expose Node APIs directly to the renderer.
- Do not claim functionality in documentation until it has been tested.
- After every meaningful implementation, update `docs/progress.md` with decisions, checks, and limitations.
- Prefer focused, reversible changes and preserve unrelated user work.
