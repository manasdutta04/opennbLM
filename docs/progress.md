# Progress

## Foundation — 2026-09-10

### Completed

- Confirmed the repository was empty apart from `.git`; no legacy application was migrated or recovered.
- Added pnpm workspace structure for Electron desktop, preload, React renderer, and capability packages.
- Added secure Electron window defaults and a typed `contextBridge` API for the app-info smoke contract.
- Added provider, teaching, memory, local-services, and Rumik runtime interfaces.
- Added Windows x64 NSIS and macOS DMG packaging configuration.
- Added architecture and product documentation.

### Architecture decisions

- pnpm workspace is the package-management foundation.
- Electron main owns lifecycle and IPC; preload is the only renderer bridge.
- Brain providers and Rumik remain replaceable runtime boundaries.
- SQLite is a future local-service implementation, not yet enabled.

### Verification

Successful commands:

- `pnpm install` — passed; workspace dependencies installed. pnpm reported deprecated transitive packages.
- `pnpm typecheck` — passed after adding React type declarations.
- `pnpm build` — passed; TypeScript, Vite renderer build, preload build, and Electron main build completed.
- `node_modules/.bin/electron-builder.cmd --config electron-builder.yml --dir --publish never` — configuration validation passed and packaging reached the Windows x64 packaging stage, then failed because the sandbox blocked downloading Electron's Windows runtime from GitHub.

Not run: interactive Electron startup smoke test and completed native installer/DMG packaging. Packaging configuration was validated, but the artifact build requires downloading the Electron runtime from GitHub and target signing/runtime environments.

### Known limitations / not implemented

- No LLM provider adapters or network calls.
- No teaching engine behavior.
- No SQLite driver or schema.
- No Rumik binary, model, sidecar, or audio playback.
- Native installer/DMG builds are configuration-only until packaging is tested on target environments.
