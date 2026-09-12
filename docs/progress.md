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
- Keep SQLite behind the memory service; the packaged runtime uses `sql.js` WebAssembly instead of Electron's unavailable `node:sqlite` builtin or a native addon.
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

## Product-quality UI/UX pass — 2026-09-10

### Completed

- Refined the renderer toward a quieter premium desktop feel: stronger editorial typography hierarchy, tighter reading measure, calmer spacing, restrained surfaces, and improved sidebar density.
- Made Rumik state more central and truthful by connecting live runtime state to the voice orb, adding idle/thinking/speaking/error treatments, and reducing motion when requested by the operating system.
- Improved focus-visible keyboard affordances, hover states, composer focus treatment, provider controls, audio transport, empty states, and responsive desktop sizing.
- Added accessible labels/expanded state to explanation actions and made Copy actually copy the explanation text.
- Kept the conversational workspace, local-first behavior, and existing provider/memory/voice functionality intact; no dashboard metrics or fake status badges were introduced.

### Verification

- `pnpm check` — passed; typecheck and production builds completed.
- `pnpm --filter @opennblm/memory test` — passed, 2/2.
- `pnpm --filter @opennblm/teaching-engine test` — passed, 4/4.

### Known limitations

- Full interactive keyboard navigation, context-menu behavior, and visual comparison across native Windows/macOS window chrome still require target-machine manual QA.
- Electron startup remains smoke-tested, not fully interaction-tested inside this environment.

## Production audit — 2026-09-10

### Completed

- Audited renderer/main/preload separation, provider and Rumik boundaries, local persistence, packaging configuration, lifecycle, failure paths, and documentation against the current source.
- Removed the Gemini API-key URL exposure: Gemini keys now use a request header and regression coverage asserts the key is absent from the URL.
- Added a 15-second timeout/abort boundary to provider HTTP calls and changed Teaching Engine provider exceptions to use the deterministic fallback without an unnecessary correction retry.
- Fixed selected model propagation so the provider-specific model configured in Settings reaches the Teaching Engine request.
- Hardened Rumik synthesis with a three-minute process timeout, failure/error state, cancellation cleanup, failed-WAV cleanup, punctuation-free text preservation, and application shutdown cleanup.
- Hardened local file permissions where supported for SQLite, provider encrypted credentials, and provider preferences.
- Prevented renderer navigation and new-window escape paths; development renderer URLs are limited to localhost/127.0.0.1.
- Removed obsolete broken `better-sqlite3` workspace links that caused electron-builder native dependency scans to fail, without adding a SQLite native addon.
- Added provider and Rumik regression suites; existing memory and teaching suites remain green.

### Remaining

- macOS Apple Silicon and Intel packaging must be run on macOS; this Windows host cannot verify DMG creation, launch, signing, notarization, microphone/audio behavior, or Apple Silicon runtime behavior.
- Production code signing, notarization, installer identity, and Rumik redistribution approval remain release-environment work.
- Rumik actual inference remains unverified: model revision is `main`, no immutable commit is pinned, and no licensed model snapshot/CUDA runtime is present.
- No live provider credentials were used; real provider health, streaming under network failure, and provider quota/rate-limit behavior remain target-environment checks.
- Full interactive accessibility, keyboard traversal, native context menus, and visual QA were not executed in a native Windows UI automation session.

### Known limitations

- SQLite uses packaged `sql.js` WebAssembly and has been verified through the packaged Electron startup path on Windows x64.
- Audio files generated by successful playback are retained under user data for now; failed/cancelled synthesis outputs are cleaned up. A retention policy for completed audio remains to be designed.
- IPC channels are exposed only through the typed preload bridge, but a full sender-allowlist test harness is not yet present.
- Rumik is still an optional local subsystem until the licensed bundled Python/model package exists; text learning is the supported degraded mode.

### Exact verification record

- Host tested: Windows x64, Windows `10.0.26200`.
- Node tested: `v25.1.0`.
- pnpm tested: `9.14.4`.
- Electron tested: `34.5.8`.
- `pnpm build` — passed.
- `pnpm --filter @opennblm/llm-providers test` — passed, 2/2.
- `pnpm --filter @opennblm/rumik-runtime test` — passed, 2/2.
- `pnpm --filter @opennblm/memory test` — passed, 2/2; includes SQLite reopen persistence.
- `pnpm --filter @opennblm/teaching-engine test` — passed, 4/4; includes malformed structure, retry/fallback, and selected-model propagation.
- `pnpm package:dir` — passed; unpacked Windows x64 package built and launched for a five-second smoke check.
- `pnpm package:win` — passed; unsigned Windows x64 NSIS artifact produced at `release/opennbLM-0.1.0-win-x64.exe`.
- `pnpm package:mac` and `pnpm package:mac:intel` — not run; no macOS host.
- Rumik model/runtime: `rumik-ai/rumik-oss-1`, configured revision `main`, official Python runner; actual synthesis not tested.
- Electron installer/DMG signing, notarization, and launch smoke tests remain target-environment checks.

## Packaged Electron startup fixes — 2026-09-10

### Completed

- Diagnosed and fixed three packaged-runtime failures found from real Windows startup dialogs: missing workspace package paths, unavailable `node:sqlite`, and ESM path/preload incompatibilities.
- Mapped workspace packages into `node_modules/@opennblm/*` inside the ASAR.
- Replaced the Electron-incompatible `node:sqlite` dependency with `sql.js` WebAssembly and made local-service initialization asynchronous.
- Added the `sql.js` WASM and loader files to electron-builder packaging.
- Made Electron main path resolution ESM-safe with `fileURLToPath(import.meta.url)`.
- Emitted the preload bridge as CommonJS for Electron's preload loader.

### Verification

- `pnpm --filter @opennblm/memory test` — passed, 2/2 after the SQLite runtime change.
- `pnpm check` — passed.
- `pnpm package:dir` — passed.
- Packaged ASAR inspection — passed; `sql-wasm.js` and `sql-wasm.wasm` are present.
- Packaged startup with Electron logging — passed; process alive after eight seconds, real window handle present, no preload/runtime startup error.
- `pnpm package:win` — passed; final unsigned Windows installer rebuilt at `release/opennbLM-0.1.0-win-x64.exe`.
- Final unpacked Windows launch — running with process ID `24456` and a real window handle.

## Conversational desktop UI refinement — 2026-09-10

### Completed

- Refined the renderer into a denser roster-and-thread workspace: persistent lesson roster, clearer active state, compact navigation, calmer chat rhythm, stronger voice focus, and more tactile composer/transport controls.
- Added an original opennbLM visual direction with a restrained moss/lime accent, dark workspace surfaces, tighter desktop spacing, and improved light-theme tokens.
- Removed the default Electron application menu for the Windows desktop shell; the renderer remains responsible for in-app navigation and settings.
- Preserved the existing conversation, provider, memory, teaching, Rumik, and IPC behavior while changing presentation styles only.

### Verification

- `pnpm check` — passed.
- `pnpm package:dir` — passed.
- Updated packaged Windows launch — passed; process ID `7432` remained alive after eight seconds with a real window handle.

### Known limitation

- The NSIS installer should be rebuilt from this UI revision with `pnpm package:win` before distribution; the unpacked packaged build is the one currently running.

## Renderer packaged asset fix — 2026-09-10

### Completed

- Diagnosed the blank packaged window: Vite emitted absolute `/assets/...` URLs, which fail when Electron loads the renderer from a `file://` URL.
- Set the renderer Vite base to `./`, producing relative asset URLs suitable for packaged Electron loading.

### Verification

- `pnpm build` — passed; generated renderer HTML references `./assets/...`.
- `pnpm package:dir` — passed.
- Packaged Windows launch — passed; process ID `14408` remained alive with a real window handle and no renderer startup errors in Electron logging.

### Known limitation

- The final NSIS installer must be rebuilt after this renderer fix before distribution.

## Packaged workspace dependency fix — 2026-09-10

### Completed

- Fixed the Electron packaging layout for pnpm workspace packages. Built packages are now mapped into `node_modules/@opennblm/*` inside the ASAR, so bare imports from the Electron main process resolve in the packaged application.
- Rebuilt the unpacked Windows package after closing the stale process that had locked the previous package files.
- Confirmed the ASAR contains `contracts`, `local-services`, `llm-providers`, `memory`, `rumik-runtime`, and `teaching-engine` under the packaged `node_modules/@opennblm` path.
- Launched the corrected packaged app and confirmed it remained running for five seconds.

### Verification

- `pnpm package:dir` — passed after the packaging fix.
- ASAR package inspection — passed; all six workspace runtime packages were present at the expected bare-import paths.
- Corrected packaged Windows launch — passed; process remained alive after five seconds, process ID `24636`.

### Known limitations

- `pnpm package:win` was subsequently rerun successfully; the corrected unsigned installer is `release/opennbLM-0.1.0-win-x64.exe`.
- The corrected unpacked app was launched with a real window for verification; process ID `8140` was alive after five seconds.

## Smooth Graphite UI pass — 2026-09-10

### Completed

- Relaunched the full Electron desktop app after a renderer rebuild.
- Rebuilt the renderer shell inspired by opencrew’s Graphite desktop feel: quiet panel/raised/card/inset tokens, Tide teaching accent, IBM Plex Sans + Literata, soft hairlines, and fast `msg-in` / `pop-in` motion.
- Added a compact provider/model picker in the composer (provider rail + searchable models)..
- Replaced browser `prompt`/`confirm` with in-app rename/delete/clear-memory dialogs.
- Upgraded the composer to an auto-growing textarea with toolbar, teaching shimmer state, and live Rumik readiness in Settings.

### Verification

- `pnpm --filter @opennblm/renderer build` — passed.
- `pnpm --filter @opennblm/desktop start` — Electron processes remained alive after relaunch.

### Known limitations

- Microphone / STT remains a UI affordance only; voice synthesis still depends on optional Rumik runtime assets.
- Library remains starter invitations rather than a full curriculum store.

## Graphite UI port — 2026-09-10

### Completed

- Installed Tailwind CSS v4 (`@tailwindcss/vite`), `lucide-react`, and `clsx`/`tailwind-merge` in the renderer.
- Applied Graphite design tokens, motion keyframes, and IBM Plex Sans into the renderer stylesheet.
- Rebuilt the shell to match desk patterns: raised sidebar rows with avatars, chat header model pill (provider rail + searchable models), bubble transcript (`bg-bubble-user` / `bg-card`), and the floating composer pill with ArrowUp send.
- Relaunched Electron after a successful renderer build and monorepo typecheck.

### Verification

- `pnpm --filter @opennblm/renderer build` — passed.
- `pnpm typecheck` — passed.
- `pnpm --filter @opennblm/desktop start` — Electron launched with the new UI.

## Product IA cleanup (NotebookLM-style) — 2026-09-10

### Completed

- Removed the duplicate sidebar “Conversations / Your workspace → Settings” loop.
- Home is now a NotebookLM-style dashboard: featured starts + recent lesson cards, Create new, top-bar Settings only.
- Lesson view is Chat + Studio (voice, styles); model/brain picker lives only in the lesson header.
- Settings connects engines (API keys / test) and no longer selects the teaching model; unconfigured engines in the chat picker show a setup CTA.
- Library and Memory are separate pages reached from home tabs, not a second conversation list.

### Verification

- `pnpm --filter @opennblm/renderer build` — passed.
- `pnpm typecheck` — passed.
- `pnpm --filter @opennblm/desktop start` — Electron launched with the redesigned IA.

## Brand mark + model picker — 2026-09-10

### Completed

- Added unique opennbLM app icon to packaging, renderer, and desktop window icon; wired `electron-builder.yml` `icon`.
- Added Cloud/Local model picker with brand marks, setup cards for unconfigured engines, and searchable models when ready.
- Ollama is “ready” only when the local runtime responds (health check), matching install-then-use flow.
- Removed repetitive Create buttons and moved engine connection out of Settings into the lesson picker; Settings is appearance/voice/status only.

### Verification

- `pnpm --filter @opennblm/renderer build` + `pnpm typecheck` + desktop start — passed.

## CLI engine picker components — 2026-09-10

### Completed

- Added provider marks, CLI install/sign-in setup cards, and a Cloud/Local engine model picker.
- Kept engine setup behind the typed preload bridge with no renderer API-key forms.

### Verification

- `pnpm --filter @opennblm/renderer build` — passed.

## CLI engines + icon/UI cleanup — 2026-09-10

### Completed

- Unified brand icon across packaging, desktop window, and renderer header.
- Fixed Featured/Library glyphs with Lucide and restored `View all ›`.
- Settings is appearance + Rumik only; engines are managed in-lesson via **Connect brain**.
- Added `@opennblm/engine-runtime` with Claude, Codex, Cursor, OpenCode, Grok, Ollama, LM Studio.
- Contracts + IPC for engines list/selection and blank-terminal install helper.
- `teaching:teach` resolves persisted `modelSelection` through the engine LLM adapter.

### Verification

- `pnpm typecheck` / renderer / preload / desktop builds — passed.

## Logo refresh, expanded engines, shell polish — 2026-09-10

### Completed

- Replaced shipped icons with `packaging/icons/opennblm-icon.png` (removed obsolete `icon-source.png`).
- Expanded Connect brain fleet: Antigravity, Hermes, Kimi, Qwen; richer catalogs; OpenCode discovers live models via `opencode models`.
- Windows Mac-style title strip (File/Edit/View/Window/Help) with native overlay chrome; macOS uses the system menu bar.
- Home: removed Library/Memory tabs; Memory is a dedicated page from the header; View all opens the templates page; optional second featured row.
- Lesson actions use a compact three-dot overflow menu (double-click still opens lessons).
- Removed product-facing references to external inspiration repos from docs/UI.
- Imported official Kimi, Qwen, and Hermes marks into `ProviderIcons` / `HermesMark` (full SVG paths).
- Connect brain catalogs are live-only: per-engine discovery (Codex app-server, Cursor/OpenCode CLI lists, Hermes ACP, config/credential gates). No shipped static model lists; empty picker until the account/CLI exposes models. Stale selections are cleared on refresh.

### Verification

- `pnpm typecheck` — passed.
- Renderer `tsc --noEmit` after provider icon import — passed.
- Engine-runtime live discovery smoke test on this machine: OpenCode returned 31 account models; Codex app-server returned 3 subscription models (`gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5`) — not the old static list.
- Fixed Antigravity discovery: was parsing `agy` help flags as models; now uses `agy models` tab rows only (14 live models verified).
- Settings → Voice engine shows Rumik install/bind steps, live bind path, copyable download command, Hugging Face link, and refresh/health recheck.
- Rumik runner: auto **low-VRAM / 4-bit NF4** on ≤6 GB GPUs (`bitsandbytes`), FP16 compute, shorter token cap — not Unsloth.

## Rumik remote fallback + quant decision — 2026-09-11

### Completed

- Added `rumik` modes: **local** (CUDA + weights) vs **remote** (public rumik-ai Gradio/ZeroGPU Space). No CUDA → remote by default; Settings shows **Remote fallback** (explicitly not “runs on Mac locally”).
- Renderer `rumik:*` IPC unchanged; mode owned in `@opennblm/rumik-runtime` (`cuda.ts`, `remote.ts`).
- Documented auto load-time 4-bit quant; **no** plan to publish a separate quantized HF checkpoint.
- README + `docs/demo/rumik-expressive-sample.wav` safety-net clip; UI screen-cap instructions in `docs/demo/README.md`.

### Verification

- `pnpm --filter @opennblm/rumik-runtime test` — 4/4 passed (forced local fail + remote mode select + delivery parse).
- Contracts + rumik-runtime `tsc`, preload/renderer/desktop build — passed.
- Remote smoke: `synthesizeRemoteSegment` → ~150 KB WAV from `https://rumik-ai-rumik-oss-1.hf.space`.
- Desktop launch check (2026-09-11): app boots; Settings shows **Remote fallback** + CUDA detected when weights unbound; setup copy distinguishes missing weights vs missing CUDA.
- Anonymous ZeroGPU quota on this machine is exhausted (~24h cooldown); remote errors now surface the Gradio/HF quota message (via `@gradio/client`). Optional `HF_TOKEN` documented. Local CUDA path remains preferred once weights are bound.

## Rumik free dual paths — 2026-09-11

### Completed

- Settings → Voice engine: **Two free paths** copy (local preferred / remote fallback), auto 4-bit note (no separate quant download), surfaces `rumik.status.error`.
- `teaching:teach` awaits `rumik.synthesize` and returns `voiceError` on failure (no optimistic `voiceStarted` from health alone).
- Docs: Electron `userData` bind path (`%@opennblm\desktop\models\rumik-oss-1`), HF token env-only (not Settings), no static quant publish.

### Verification

- Official weights downloaded to `%APPDATA%\@opennblm\desktop\models\rumik-oss-1` (~6.4 GB shards).
- Python 3.12 CUDA torch `2.6.0+cu124` + transformers/soundfile/accelerate/bitsandbytes; desktop auto-resolves CUDA Python when `RUMIK_PYTHON` unset.
- Local smoke: `preferredMode: local` synthesize → ~100 KB WAV (`Hello from local Rumik.`).
- Build: renderer + desktop `tsc`/`vite` passed after Settings dual-path + honest teach voice.
- Fix (same day): do **not** await Rumik inside `teaching:teach` — that blocked the lesson answer on “Preparing how to teach…” until voice finished. Text returns immediately; voice runs in background.
- Fix (same day): Antigravity teaching used invalid `agy -m`; switched to `--model` + `--json-schema` / `--output-format json`. Silent `fallbackPlan` was why Gemini answers looked like “Build a clear working understanding…”. Teaching engine now retries after parse errors instead of aborting the correction pass.

## Notebooks + Rumik parity — 2026-09-11

### Completed

- Phase 0: teaching engine prefers natural `learner_facing` prose; UI surfaces `usedFallback` on lesson/notebook answers.
- Phase 1: SQLite notebooks/sources/chunks/notes/podcasts (`@opennblm/memory`), ingest package (`@opennblm/notebook-runtime`), desktop IPC + preload `notebooks` API, Home notebooks + Sources/Chat/Notes UI.
- Ingest: paste text, PDF, URL fetch, Ready/Error status, per-source Full/Summary/Excluded context.
- Grounded notebook chat + Ask citations; Rumik speaks answers asynchronously.
- Phase 2: multi-term local search, AI note transforms (summarize/concepts/FAQ), Rumik multi-speaker study audio (1–4 voices) with in-app playlist paths.
- Phase 3: DOCX/PPTX via JSZip (tested DOCX), YouTube captions best-effort; audio/video without captions explicitly not claimed. Settings Privacy copy: local-first defaults.

### Architecture decisions

- Desktop-native parity only — no Docker/Next/Surreal stack; product copy never attributes third-party notebook apps.
- Voice for chat/notes/podcast remains Rumik-only.
- Retrieval is tokenized substring search over chunks; vector embeddings deferred until quality needs them.

### Verification

- Package tests: teaching-engine (4), memory notebooks CRUD/search (3), notebook-runtime chunk + DOCX/PPTX extract (3) — all passed.
- `pnpm install` + `pnpm typecheck` + `pnpm build` after wiring `@opennblm/notebook-runtime` into desktop — passed.
- Electron relaunched via `pnpm desktop:start` for UI smoke.

### Known limitations

- YouTube depends on public timedtext availability; empty captions fall back to a placeholder note urging paste transcript.
- Podcast generation synthesizes lines sequentially (slow on local Rumik).

## Studio UX polish — 2026-09-11

### Completed

- Compact Studio tiles; entire Studio column scrolls; “Generating…” spinner rows (no Add note).
- Sources: Upload file + Website/YouTube only (paste text removed).
- Audio Overview: script then silent Rumik batch (`broadcast: false`), WAV concat to one file, **no autoplay** — circular play + seek/speed player.
- Notebook Ask no longer auto-speaks (avoids fighting the overview player).

### Root cause of stutter

Global `rumik.onSegmentReady` autoplay was receiving each dialogue segment while the next segment was still synthesizing — short bursts then long silence. Fixed by silent batch + single merged WAV.

## Guide cache, faster audio, Markdown reports — 2026-09-11

### Completed

- Notebook guides cached per `(notebook, language, selected sources)` in SQLite — switching languages reuses prior generations.
- Studio label: **Studio output language** (applies to guide + all Studio tiles, not audio-only).
- Audio Overview word/line caps cut sharply (Shorter ≤4 lines / ~180 words) to reduce Rumik passes.
- Reports/guides render with Markdown headings, lists, and bold instead of raw `#` / `**`.
- No STT path for raw audio/video yet — UI states this clearly.
- Embeddings / true SQLite FTS5 not enabled yet.

## NotebookLM-style three-column shell — 2026-09-11

### Completed

- Home is notebooks-only (lessons removed from primary Home); rename/delete notebooks; source counts on cards.
- Notebook workspace: Sources | Chat+notebook guide | Studio (collapsible side panels).
- Source checkboxes ground chat, guide, Audio Overview, and Studio artifacts.
- Audio Overview: Deep Dive / Brief / Critique / Debate; Shorter / Default / Longer word budgets; language chips; focus prompt; Rumik playlist.
- Studio artifacts table: report, mind_map, flashcards, quiz, slide_deck, infographic, data_table (no Video).
- Docs updated; package tests extended.

### Verification

- `pnpm typecheck` / package tests / `pnpm build` / `pnpm desktop:start`.

### Known limitations

- Longer Audio Overview synthesizes a capped number of lines for local Rumik feasibility (not a guaranteed multi-dozen-minute podcast).
- Studio visuals are local structured viewers (JSON → UI), not Google Slides / pixel-perfect infographics.
- Interactive Audio “join the hosts” mode is not implemented.

## Auto-rename from guide — 2026-09-11

### Completed

- Fresh guide generation asks the model for `TITLE: …` then body; `parseGuideResponse` strips the title line from cached guide text.
- If the notebook is still `Untitled notebook`, main renames it to a short subject label (2–6 words) and returns `title` to the renderer for header/Home refresh.
- Cached guide loads do not rename again.
- Verified: `pnpm typecheck`, notebook-runtime tests (incl. parseGuideResponse), `pnpm build`, `pnpm desktop:start`.

## Audio Overview re-engineered — 2026-09-11

### Problem

Prior speed caps made “Shorter” ~30s and cracked playback: ≤4 lines / 180 words, hard `.slice(0, 420)` mid-line, `maxTokens: 768` cutting utterances, and WAV concat with zero gap.

### Completed

- Duration targets moved to **word budgets**: Shorter 300–400, Default 550–700, Longer 900–1200 (no minute labels in UI).
- Prompt requires complete short sentences; one speaker finishes before the next.
- `parsePodcastScript` + `utterancesFromPodcastTurns`: Rumik synthesizes **one sentence per job** (packing sentences caused mid-utterance cuts / apparent overlaps).
- `segmentForRumik` also emits one sentence per chunk.
- `concatWavFiles` inserts ~450ms silence between segments.
- Studio Audio Overview helper copy / minute hints removed.

### Verification

- Package tests + `pnpm typecheck` / `pnpm build` / `pnpm desktop:start`.

### Known limitations

- Generation wall time scales with sentence count (each Rumik pass is still a full model run).
- Exact spoken length follows the word budget and model pacing.

## Rumik worker + Studio error hygiene — 2026-09-11

### Problem

Audio Overview failed with “The command line is too long” and Studio showed raw Rumik/tqdm weight-loading logs. Root cause: each sentence spawned a new Python process (reloading the LM), Windows argv limits, and a 3-minute spawn timeout that killed mid-load and stuffed stderr into `artifact.error`.

### Completed

- Persistent local Rumik `--serve` worker: load once, JSONL jobs on stdin, spoken text via temp file (not CLI args).
- Longer first-load timeout (15 min); per-sentence timeout stays separate.
- `summarizeRumikFailure` + UI clamp so progress bars never fill Studio.
- Progress bars disabled in the runner (`TQDM_DISABLE` / HF hub flags).

### Verification

- Package tests + build + desktop start.

## Rumik-first Audio Overview quality — 2026-09-11

### Completed

- `buildRumikDescription` emits canonical `<description="tone, accent, pace">` only (no instructional prose, no `language=`).
- Speakable script prompt + `sanitizeSpokenText`; sparse `<laugh>`/`<chuckle>`/`<sigh>` on happy/excited lines.
- Overview synth uses 2048 tokens on the persistent worker; cleaned script stored in artifact meta.

### Verification

- Package tests + `pnpm build` + `pnpm desktop:start`.

## Audio Overview delivery UX — 2026-09-11

### Completed

- Removed Studio Tone / Accent / Pace dropdowns. Users only choose format, length, language, and focus.
- Pace is always `steady pace`. Accent is derived from Studio language via `accentFromLanguage`.
- Script lines use `Speaker [tone]: dialogue`; the model varies tone per line for a human-teacher feel.
- Each Rumik utterance gets its own description from that line’s tone + language accent + steady pace.

### Verification

- Package tests + `pnpm build` + `pnpm desktop:start`.

## Audio Overview teaching tone refine — 2026-09-11

### Completed

- Restricted script tones to `excited` (default) and `professional` only; remap sad/angry/happy away from melodrama.
- Format-specific delivery: Deep Dive/Brief lean excited; Debate = calm host + excited host; Critique mixes clear + lively.
- Stripped `<laugh>` / `<chuckle>` / `<sigh>` from spoken text — teaching focus, no theatre.

### Verification

- Package tests + `pnpm build` + `pnpm desktop:start`.

## Audio Overview product craft — 2026-09-11

### Completed

- Distinct structures per format (Deep Dive, Brief, Critique, Debate) instead of one shared lecture skeleton.
- Debate is Challenger (Ira, professional, questions/rebuts) vs Advocate (Aisha, excited, answers/defends) with strict alternation, short turns, and a learner wrap.
- Format-specific system prompts; debate gets more turn budget; closing turns preserved when trimming; short rebuttals allowed; slightly longer WAV gaps for debate handoffs.

### Verification

- Package tests + `pnpm build` + `pnpm desktop:start`.

## Audio Overview Rumik mid-run failure — 2026-09-11

### Completed

- Diagnosed Debate failure: script OK (20 utterances); local Rumik completed ~16 sentences then died; UI showed generic "Rumik voice synthesis failed" because summarizer dropped timeout/worker messages.
- Preserve real timeout/worker errors; retry once after worker restart; keep partial overview audio when most lines already synthesized; raise sentence timeout; cap overview tokens at 1536 for stability.

### Verification

- Package tests + `pnpm build` + `pnpm desktop:start`.

## Studio visuals + Memory sync — 2026-09-12

### Completed

- Mind Map uses `@xyflow/react` graph view; Infographic uses poster layout with optional stats.
- Quiz / flashcards / slides are interactive; JSON artifacts strip fences before save.
- Memory (top-bar) lists named notebooks alongside teaching notes so the page is useful even before chat notes exist; Settings stays in the top bar.

### Verification

- `pnpm build` + `pnpm desktop:start`.

## Mind map layout + home-only chrome — 2026-09-12

### Completed

- Mind map: subtree width layout (no overlapping leaves), hidden connection handles, removed MiniMap artifact, dark zoom controls, wider artifact modal.
- Top Memory / Settings / theme bar shows on Home only; notebooks use their own toolbar without that chrome.

### Verification

- `pnpm build` + `pnpm desktop:start`.

## Setup onboarding + web landing + Windows CI — 2026-09-12

### Completed

- Settings rewritten with tabs: Setup guide, Teaching brain, Voice engine (install/connect/copy bind path + download command), Appearance.
- Home setup banner stays until a teaching brain is connected; voice remains optional with remote Rumik fallback.
- Added `web/` Next.js static site (landing + docs) with Download pointing at GitHub Releases (Windows).
- Added GitHub Actions: `ci.yml` (typecheck/build), `release-windows.yml` (versioned `v*` tags), `continuous-windows.yml` (moving `latest-windows` prerelease on main).

### Verification

- `pnpm install`, `pnpm typecheck`, `pnpm build`, `pnpm --filter @opennblm/web build` (run in this session).

### Known limitations

- First Windows GitHub Release appears after a successful Actions run (tag push or workflow_dispatch) with repo write permissions.
- Landing Download opens `/releases/latest`; until a non-prerelease exists, point users at the `latest-windows` prerelease or create `v0.1.0`.

## Clean CI typecheck for Windows release — 2026-09-12

### Completed

- Stopped tracking `*.tsbuildinfo` (they made `tsc --build` skip emit on clean CI, so workspace packages had JS or nothing and no `.d.ts`).
- `pnpm typecheck` now runs `tsc --build --force` so GitHub Actions always rebuilds declarations before packaging.

## Heritage Grove landing footer — 2026-09-12

### Completed

- Replaced the previous Next.js marketing home with a full-viewport Heritage Grove footer (ink landscape video, no desktop scrim; portrait viewports flow the 16:9 clip under the copy).
- Added a self-contained root `index.html` with the same markup, CSS, and inline SVGs (Google Fonts only).
- Replaced Heritage Grove copy with opennbLM product text, Windows download, setup, and GitHub links.

## Web site pages + smooth loop — 2026-09-12

### Completed

- Homepage keeps the single-screen landscape layout; app `icon.png` is the wordmark mark; contact rows and email capture removed.
- Subpages (docs, setup, studio, voice, download, privacy, terms) share the same video shell and stay one viewport.
- Socials are GitHub + X (`x.com/manasdutta04`) only. Talk to us opens GitHub Issues.
- Background video crossfades onto a second player before the clip ends so the loop does not hard-cut.
- Studio and Setup home links each have their own route (notebooks, audio overview, mind map, infographic, quiz, flashcards, slides, brain, architecture). Subpages are plain cream with a diagram or layout, not the home video.
- Docs, architecture, voice, setup, and Studio pages now describe the shipped Windows app in product language. Voice copy states that remote Rumik is built in after install (no HTTPS field). Settings and the home banner say the same.

## Download cue + explicit voice mode — 2026-09-12

### Completed

- Shortened the Windows download popup to three steps plus one start-failure line, removed the Ollama block, and made the modal itself scroll with normal word wrapping (the footer `overflow-wrap` was jamming copy).
- Settings → Voice engine now has an explicit Remote (HTTPS) vs Local (this PC) choice. The selection persists in `userData/rumik-preference.json` and is passed into `createRumikManager({ preferredMode })`. Default for a new install is remote.
- Local CUDA install steps appear only after Local is selected. Remote shows the built-in Space endpoint. Site voice/setup/docs copy matches that control.

### Verification

- `pnpm typecheck` and rumik-runtime tests (run in this session).

### Known limitations

- Remote still uses the built-in public Space URL; there is no custom HTTPS field in Settings (env `RUMIK_REMOTE_URL` remains a developer override).
- Switching to Local without CUDA/weights reports not connected; it does not silently fall back to remote.

## EXE remote voice + optional HF token — 2026-09-12

### Completed

- Clarified that Remote (HTTPS) is already inside the Windows installer: the desktop process calls the public rumik-ai Space. Users do not clone the repo or start a server.
- Settings → Voice engine (Remote) now has an optional Hugging Face token field. Anonymous quota works without a token; a saved token is encrypted with OS `safeStorage` on this PC.
- Site voice/setup copy matches: token is optional, not a required local install step.

### Verification

- `pnpm typecheck` and rumik-runtime tests (run in this session).

### Known limitations

- Remote still depends on the public Space / ZeroGPU quota. A user token can raise quota; it is not a private rumik host.
- Token storage needs Windows DPAPI (`safeStorage`). If encryption is unavailable, Settings reports that instead of writing a plaintext key.

## Memory screen is teaching notes only — 2026-09-12

### Completed

- Memory no longer lists notebooks or redirects into them (Home already does that).
- The page is teaching notes only: forget one or clear all. Empty state says notes appear after a teaching-brain answer, not from creating a notebook.

### Verification

- Renderer rebuild + desktop launch (this session).

## Notebook chat thinking indicator — 2026-09-12

### Completed

- After a notebook question is sent, a live status stream cycles 12 gerunds (Thinking, Reading, Finding, …) on a loop until the answer arrives.

### Verification

- Renderer rebuild (this session). Not claimed against a live teaching-brain wait in this environment.

## Notebook chat persist + language + no Rumik on chat — 2026-09-12

### Completed

- Chat answers are text only. `teaching:teach` no longer starts Rumik. Rumik stays for Audio Overview.
- Opening a notebook reuses the saved conversation for that notebook and reloads messages from SQLite instead of creating a blank chat.
- Teaching prompt now requires the selected language for every learner-visible field, even if the question is in another language. Language is chosen once in Studio and also applies to chat.

## Non-English infographic JSON + fonts — 2026-09-12

### Completed

- Studio JSON artifacts (especially infographic) now require English keys and selected-language values, then retry once if the model returns invalid JSON.
- Parser recovers smart quotes / trailing commas. UI uses Nirmala UI / Noto so Kannada, Telugu, and other Indic scripts can render.

## Studio artifact visuals — 2026-09-12

### Completed

- Restyled infographic, slides, flashcards, quiz, reports, and data tables as quiet editorial layouts (no rainbow orbs). Mind map unchanged.
- Text wrapping avoids breaking Indic scripts. Studio tiles keep full labels instead of jamming words.
- Generated list and the open artifact footer show the Studio language used (`1 source · today · Kannada`).

## Home polish + open-source docs — 2026-09-12

### Completed

- Home no longer shows a Home label. Notebooks grid is quieter; source counts use singular/plural.

## First-run setup widgets — 2026-09-12

### Completed

- After install, first launch is a five-step setup: welcome, this PC, teaching brain, optional Rumik voice, then create a notebook. Home shows three setup widgets until a brain is connected.
- Site footer credit: “A craft of Manas Dutta with Xiaa” — Manas Dutta opens manasdutta.com; Xiaa opens “sitting on Manas's computer.” Download and setup copy mention the in-app widgets.

### Verification

- Renderer rebuild (this session). First-run only appears when `setup-complete.json` is missing.
- Added Apache-2.0 `LICENSE`, `NOTICE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`, `.agents/` notes, and GitHub issue/PR templates. README states this is an early MVP and that Rumik weights are not Apache.

### Verification

- Renderer rebuild (this session).

### Limitations

- Indic Audio Overview quality is unchanged. Publishing as 0.1.0 is appropriate only with the README caveats.

## Seven-language Audio Overview — 2026-09-12

### Completed

- Studio language picker is now the seven rumik-oss-1 delivery languages: English, Hindi, Telugu, Tamil, Kannada, Bengali, Punjabi.
- Audio Overview scripts must use native script (no Latin transliteration), short spoken lines, and matching Rumik accents. Indic sentences split on danda `।` and stay under a 200-character segment cap.

### Verification

- notebook-runtime, rumik-runtime, and teaching-engine tests (this session). Existing Audio Overviews stay as recorded until regenerated.

### Limitations

- Live Rumik quality across all six Indic languages was not certified in this pass. English behavior is unchanged.

### Verification

- Renderer rebuild (this session). Existing artifacts pick up the new views immediately.

### Verification

- notebook-runtime tests + typecheck (this session). Existing broken posters need a regenerate.

### Verification

- `pnpm typecheck` plus memory and teaching-engine tests (this session).

## Marketing site mobile layout — 2026-09-12

### Completed

- Landing page no longer locks to `100svh` with `overflow: hidden` below 1100px, so phones can scroll.
- Studio, setup, and source columns move into a top three-line menu on small screens. The overlay lists the same links.
- Mobile landing keeps the study line and the download control at the top. The “get the build” heading and installer blurb are hidden on small screens. The control reads “open in Windows” with “this is not a Windows device.”

### Limitations

- Desktop wide layout is unchanged. The Windows installer link is the same file; phones cannot run it.

## Packaged notebook-runtime — 2026-09-12

### Completed

- The Windows installer crashed on launch because Electron could not resolve `@opennblm/notebook-runtime`. The package is now copied into the ASAR `node_modules` layout with jszip and pdf-parse, matching the other workspace packages.

### Limitations

- A new Release Windows run is required before installed copies pick this up. Existing 0.1.0 installs stay broken until they reinstall.

## Latest Windows download — 2026-09-12

### Completed

- Desktop download control keeps “download for windows” on one line.
- The button resolves the latest GitHub release `.exe` and starts that download. New installers publish as `opennbLM-win-x64.exe` so `/releases/latest/download/` stays stable.

### Limitations

- Until a release publishes the unversioned filename, the site uses the GitHub API to find the current `.exe`. `/releases/latest` ignores prereleases such as `latest-windows`.

## Immutable release tags — 2026-09-12

### Completed

- Local `v0.1.0` and `latest-windows` tags were force-updated to match origin so Cursor pull no longer hits a tag conflict.
- Windows release workflows now replace installer assets on an existing release and do not move those git tags.

### Limitations

- If a tag is deleted and recreated on GitHub, clones will need another tag update. Do not retarget `v0.1.0` or `latest-windows`.
