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

## Desktop shell — 2026-09-10

### Completed

- Replaced the placeholder renderer with a conversation-first desktop shell: branded sidebar, new lesson action, recent lessons, Library, Memory, and Settings navigation.
- Added local mock conversation state with lesson selection, unread/active states, new lesson creation, composer submission, and mock assistant replies.
- Added prominent voice-state treatment for idle, listening, thinking, and speaking, plus mock listen/pause controls.
- Added provider selection, local/light theme toggle, keyboard focus shortcut (`Ctrl/Cmd+K`), Enter-to-send, responsive sizing, reduced-motion support, and a restrained dark-first visual system.
- Kept visual assets inline and removed remote font loading so the shell remains local-first.

### Architecture decisions

- The shell is implemented as React state in the renderer only; persistence and provider calls remain unimplemented behind existing package boundaries.
- Voice UI state is a visual contract for future Rumik integration, not audio playback.

### Verification

- `pnpm typecheck` — passed.
- `pnpm build` — passed; renderer, preload, and Electron main builds completed.
- `electron --version` — passed (`v34.5.8`).
- `pnpm desktop:start` — attempted; Electron exited with Windows status `3221225477` in the current desktop sandbox before an interactive window could be verified.

### Known limitations / not implemented

- Conversation data is mock/in-memory and resets on reload.
- Send responses are mock text; no LLM provider is called.
- Microphone, attachment, Listen, Copy, and More controls are shell affordances only.
- Rumik is represented visually but has no runtime, sidecar, or audio output.
- Interactive navigation and resize behavior were implemented in code but could not be visually exercised in an interactive Electron window because the launch smoke test failed in this environment.
