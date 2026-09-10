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

## Say it differently — 2026-09-10

### Completed

- Added semantic teaching styles: Teacher, Friend, 10-year-old, Story, Simple, Technical, and Hype.
- Added a contextual “Didn't click?” action on assistant explanations with a compact inline style menu.
- Style selection creates a new TeachingPlan and DeliveryPlan using the current explanation as reference context.
- New style responses are appended as new assistant messages; existing conversation history is not regenerated.
- Style-specific vocabulary, structure, examples, pace, tone, energy, pauses, and Rumik delivery instructions are generated in the Teaching Engine.
- Added style-aware Rumik synthesis through the existing teaching-to-voice pipeline.

### Verification

- `pnpm build` — passed.
- `pnpm --filter @opennblm/teaching-engine test` — passed, 4/4 tests.

### Known limitations

- Language variants are not yet exposed in the contextual menu; the API already carries language for future variants.
- Style responses depend on the selected provider; fallback remains available if structured output fails.

## Teaching → Rumik integration — 2026-09-10

### Completed

- Connected the selected LLM brain to the Teaching Engine through a main-process `teaching:teach` orchestration handler.
- Persisted user questions and rendered teaching responses while keeping TeachingPlan/DeliveryPlan JSON internal to the main process.
- Converted DeliveryPlan intent into Rumik-supported description conditioning (`tone`, `pace`, `language`, `speaker`) without exposing raw syntax to the user.
- Started Rumik synthesis asynchronously after the text response is available, so lessons remain usable if voice generation fails.
- Added Rumik segment-ready IPC events and renderer-side sequential audio queue.
- Added Play, Pause, Resume, Stop, Replay, and Regenerate controls.
- Added sanitized Rumik state propagation for idle, preparing, speaking, paused, and error states.
- Added provider selection persistence so the selected brain drives future teaching requests without changing conversations.

### Architecture decisions

- Text response persistence is independent of voice success; Rumik errors do not erase or block the lesson text.
- The renderer receives audio paths only as segment playback payloads and never receives a child-process handle or delivery prompt syntax.
- Segment generation remains sequential in the local Rumik manager, while playback starts on the first completed segment through event-driven queueing.

### Verification

- `pnpm build` — passed after teaching/voice orchestration changes.
- `pnpm --filter @opennblm/teaching-engine test` — passed, 4/4 tests.
- No actual Rumik audio synthesis was claimed; model weights and CUDA runtime remain unavailable in this environment.

### Known limitations / not implemented

- The Electron desktop launch remains unverified in this sandbox, so local WAV playback needs target-environment validation.
- Regenerate currently reuses the persisted teaching text with a fresh Rumik synthesis job; it does not yet regenerate the TeachingPlan.
- Audio playback uses renderer `Audio` with local file URLs and requires packaged Electron security/runtime validation.

## Learner memory — 2026-09-10

### Completed

- Added a separate SQLite `learner_memory` table; learner notes are not permanent copies of conversation messages.
- Added deterministic extraction after Teaching Engine results for topics, learner level, completed lessons, recent context, language, selected explanation style, and bounded possible misconception risks.
- Added bounded memory retrieval to teaching requests so future plans can adapt without coupling the Teaching Engine to a provider.
- Added typed secure IPC for listing, forgetting one note, and clearing all learner memory.
- Replaced the Memory placeholder with an inspectable UI, grouped notes, empty state, local-only explanation, “Forget this”, and “Clear learner memory”.
- Added memory repository tests covering separation from conversation history, update/upsert behavior, forgetting, and clearing.

### Architecture decisions

- Learner memory is intentionally small, explicit, and user-deletable; no vector database or hidden transcript summarization is used in v1.
- Possible weak concepts are stored with lower confidence and a non-judgmental “revisit” description. They are not treated as verified learner deficits.
- Memory extraction is local and deterministic from structured teaching output; it never sees or stores provider API keys.

### Verification

- `pnpm build` — passed; contracts, SQLite repository, renderer, preload, and Electron main compiled.
- `pnpm --filter @opennblm/memory test` — passed, 2/2 tests.
- `pnpm --filter @opennblm/teaching-engine test` — passed, 4/4 tests.

### Known limitations

- Memory extraction currently uses plan signals and selected request options; explicit learner feedback capture is not implemented yet.
- Interactive Electron UI verification remains unavailable in this sandbox, so native confirmation behavior and packaged SQLite compatibility still need target-environment testing.

## Distributable desktop packaging — 2026-09-10

### Completed

- Added reproducible commands for Windows x64 NSIS, macOS Apple Silicon DMG, optional macOS Intel DMG, and unpacked directory smoke output.
- Added ASAR packaging, explicit preload/renderer/package files, platform artifact names, per-user Windows installer settings, macOS education category, hardened-runtime settings, and project entitlements.
- Added an external `resources/rumik` packaging boundary without committing Python runtimes, CUDA components, wheels, or model weights.
- Added first-run main-process diagnostics for Rumik runtime/model, audio status, free memory, GPU feature status, platform, architecture, and user-data/log/resource paths.
- Added a first-run setup sheet that keeps text learning usable and clearly reports “Voice engine unavailable” when the optional voice subsystem is incomplete.
- Added platform data-path documentation and kept mutable databases/audio outside the install directory and macOS bundle.

### Architecture decisions

- Rumik assets are optional packaged resources until licensing, model revision, CUDA compatibility, and redistribution permissions are verified for each target.
- User data remains in Electron-managed platform directories; uninstall does not remove it by default.
- Native signing/notarization is release-environment work and is not faked in local packaging configuration.

### Verification

- `pnpm build` — passed after packaging and first-run changes.
- `pnpm package:dir` — passed; electron-builder produced `release/win-unpacked` and the packaged app launched for a five-second Windows smoke check.
- `pnpm package:win` — passed; produced `release/opennbLM-0.1.0-win-x64.exe`. The local build is intentionally unsigned; signing must be supplied by the release environment.
- Windows x64 packaged launch — passed as a short process smoke check. Interactive navigation and first-run visual behavior were not manually exercised here.
- macOS Apple Silicon DMG and Intel DMG — not run on this Windows host; commands and configuration are present for native macOS release workers.

### Known limitations

- The repository does not ship Rumik Python/model assets. A licensed release job must populate `packaging/rumik` before claiming bundled voice.
- Electron installer/DMG signing, notarization, and launch smoke tests remain target-environment checks.
