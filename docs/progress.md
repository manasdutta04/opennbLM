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

## Local conversations — 2026-09-10

### Completed

- Added conversation and message contracts with learning topic, optional learner metadata, audio references, and teaching metadata.
- Added a small SQLite repository owned by local-services, stored under Electron `userData` as `opennblm.sqlite`.
- Added typed preload/main IPC for list/search, create, rename, add message, and delete operations.
- Replaced renderer-only mock conversation loading with persisted conversation loading and sidebar search.
- Added persisted new lesson creation, message writes for user and mock assistant replies, rename/delete controls, and an empty state.
- Added placeholder automatic title generation via `Untitled lesson`.
- Confirmed API keys are not part of conversation or message records.

### Architecture decisions

- Use two SQLite tables (`conversations`, `messages`) with a foreign-key cascade; avoid premature schema for full memory semantics.
- Use the runtime `node:sqlite` API instead of adding a native SQLite addon in this phase.
- Keep all database access in local-services/memory and expose only typed IPC methods to the renderer.

### Verification

- `pnpm install --no-frozen-lockfile` — passed after workspace dependency metadata changes.
- `pnpm build` — passed; contracts, memory, local services, renderer, preload, and desktop compiled.
- Direct SQLite restart test — passed: created a conversation, added two messages, closed the store, reopened it, searched it, and verified both messages remained.

### Known limitations / not implemented

- SQLite uses an experimental runtime API and must be verified against the packaged Electron runtime.
- The automatic title is a placeholder; no LLM title generation exists.
- Credential storage is not implemented; provider secrets remain future secure-storage work.
- The UI uses browser `prompt`/`confirm` for rename/delete and should gain native-feeling dialogs later.

## Brain providers — 2026-09-10

### Completed

- Added the `LLMProvider` abstraction with chat, streaming, structured output, model listing, and health-check capabilities.
- Implemented Groq, OpenAI, OpenRouter, Ollama, and Custom through an OpenAI-compatible adapter, plus a native Gemini adapter.
- Added main-process provider management with model preferences, connection tests, Ollama local detection, and custom endpoint support.
- Added Electron `safeStorage` credential handling for add, replace, remove, and configured-state reporting.
- Added a provider rail/settings UX with model selection, connection status, secure key entry, and no-secret renderer state.
- Updated teaching-engine contracts so the engine receives an abstract `LLMProvider` rather than a concrete vendor.

### Architecture decisions

- Provider keys never enter SQLite, conversation records, renderer state, URLs, or logs.
- Provider status and model lists cross the secure preload bridge; raw keys do not.
- Rumik remains a fixed, separate voice layer and is not touched by provider selection.

### Verification

- `pnpm build` — passed after provider implementation.
- Mock provider test — passed for all six provider ids, including OpenAI-compatible chat/health calls and Gemini response parsing.

### Known limitations / not implemented

- Provider settings preferences are local JSON; secure key storage depends on Electron `safeStorage` availability in the packaged runtime.
- Streaming is implemented for OpenAI-compatible SSE responses; Gemini currently yields the completed response as one chunk.
- No live credentials were used; connection tests require user-configured providers.
- Teaching conversations still use mock assistant responses; the provider abstraction is ready but not yet connected to the teaching flow.

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

- Conversation responses remain mock text, but conversation and message records now persist in SQLite.
- Send responses are mock text; no LLM provider is called.
- Microphone, attachment, Listen, Copy, and More controls are shell affordances only.
- Rumik is represented visually but has no runtime, sidecar, or audio output.
- Interactive navigation and resize behavior were implemented in code but could not be visually exercised in an interactive Electron window because the launch smoke test failed in this environment.

## Rumik voice subsystem — 2026-09-10

### Completed

- Added `RumikManager` with runtime/model detection, status, start, stop, health check, synthesis, cancellation, and supported-speaker discovery.
- Added secure main/preload IPC for Rumik controls; no raw child process is exposed to the renderer.
- Added the official Transformers-based development runner using `generate_audio`, Mimi decoding, and WAV output rather than reimplementing Rumik.
- Added sentence-aware segmentation and sequential per-segment synthesis jobs to respect the documented long-form limitation.
- Added speaker, temperature, top-k, max-token, delivery-description, and language configuration.
- Added `NOTICE.rumik.md` with model source, license, attribution, and redistribution requirements.

### Architecture decisions

- Model reference is `rumik-ai/rumik-oss-1`; revision defaults to `main` and is overrideable through `RUMIK_MODEL_REVISION`.
- The manager requires a local model path (`RUMIK_MODEL_PATH` or the app user-data model directory) and does not silently download weights.
- CPU inference is rejected; the official model card requires an NVIDIA CUDA-capable environment for the development path.

### Verification

- `pnpm build` — passed after the Rumik manager, IPC, and runner integration.
- Runtime manager smoke test — passed for Python detection, model absence reporting, speaker list, and sentence segmentation.
- Actual synthesis — not run; no local Rumik model snapshot and CUDA inference environment were available. No Rumik audio success is claimed.

### Known limitations / not implemented

- No model weights are bundled or downloaded automatically.
- No target-environment CUDA/Python packaging yet.
- Renderer audio playback queue is not connected; the manager currently produces ordered WAV paths for future playback integration.
- No immutable model commit was used for a verified synthesis; the configured revision remains `main`.

## Teaching Engine — 2026-09-10

### Completed

- Replaced the teaching placeholder with provider-independent `TeachingPlan` and `DeliveryPlan` types.
- Added beginner/intermediate/advanced learner adaptation, concise natural-language response rendering, progression, examples, analogy, misconception risk, and comprehension checks.
- Added structured-output schema requests and runtime validation.
- Added one correction retry for malformed provider output, followed by a deterministic graceful fallback.
- Added delivery instructions for tone, pace, emphasis, pauses, energy, language, speaker, vocalization opportunities, and segments.
- Added `docs/teaching-engine.md`.

### Architecture decisions

- The engine receives only `LLMProvider`; no provider adapter is selected in teaching code.
- Raw structured plan JSON is an internal orchestration artifact; the normal user-facing result is rendered lesson prose plus a separate delivery plan.
- Audio synthesis, Rumik lifecycle, persistence, and learner memory remain separate concerns.

### Verification

- `pnpm build` — passed; workspace TypeScript, renderer, preload, and desktop builds completed.
- `pnpm --filter @opennblm/teaching-engine test` — passed; 4 tests cover valid plans, malformed plans, missing fields, correction retry, and fallback behavior.

### Known limitations / not implemented

- Teaching Engine is not yet wired into the conversation IPC path; the desktop composer still uses mock assistant text.
- Delivery planning is deterministic and currently defaults to Ira; user voice preferences will be connected later.
- Learner feedback and memory updates are not yet implemented.
