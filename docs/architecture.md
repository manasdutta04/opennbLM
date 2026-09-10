# Architecture

opennbLM is an Electron desktop application with a React/Vite renderer and local service packages.

## Runtime boundaries

The Electron main process owns lifecycle, windows, filesystem paths, and IPC handlers. The preload process exposes a typed, minimal bridge. The renderer has no Node integration and cannot access SQLite, provider credentials, or sidecar processes directly.

Local services orchestrate persistence and future application capabilities. Provider adapters, teaching contracts, memory, and Rumik runtime integrations are independent packages so the application does not hard-code a brain or voice implementation.

## Dependency direction

UI depends on contracts through preload. Main depends on local services and contracts. Local services may depend on memory. Provider, teaching, memory, and Rumik packages do not depend on the renderer.

## Current status

The renderer requests conversation data through preload IPC. `@opennblm/local-services` owns the database lifecycle and delegates the SQLite repository to `@opennblm/memory`; the renderer never opens SQLite. Conversation records intentionally contain learning metadata and messages only—credentials are outside this model.

SQLite is implemented with `sql.js` (SQLite compiled to WebAssembly) behind the memory repository. This avoids depending on Electron's optional/unstable `node:sqlite` builtin or a native addon ABI. The repository loads and exports the SQLite database at the platform user-data path, with foreign keys and a small schema.

The brain provider manager lives in Electron main. It loads encrypted provider keys through OS-backed `safeStorage`, keeps provider/model preferences separate from conversations, and constructs an abstract `LLMProvider` for future teaching orchestration. The renderer receives provider status and models through preload but never receives raw credentials.

Rumik follows a parallel main-process boundary: Electron main owns `RumikManager`, which owns the local Python/official-Transformers runtime and WAV output. Rumik status and commands cross preload as sanitized typed IPC only; the renderer cannot spawn or inspect the runtime process.

The Teaching Engine sits between provider output and voice delivery. It depends on `LLMProvider`, validates a structured `TeachingPlan`, creates a provider-neutral `DeliveryPlan`, renders user-facing lesson text, and leaves Rumik invocation to the voice subsystem. It has no provider-specific or renderer dependency.

Learner memory is a separate local-services concern from conversation history. Main retrieves a bounded set of SQLite learner notes before teaching, passes them into the provider-independent Teaching Engine as context, and extracts bounded structured signals from the resulting plan afterward. The renderer can inspect or delete notes through typed IPC, but cannot query SQLite directly. Clearing learner memory does not delete conversations; deleting a conversation only nulls its optional source reference.

Packaging preserves these boundaries: immutable Electron app code is packaged in ASAR, optional Rumik runtime/model resources are externalized under `resources/rumik`, and mutable SQLite/audio/preferences/setup state stays under the platform user-data and logs paths. First-run diagnostics are main-process computed and cross preload as sanitized status only.

The main-process teaching handler now composes the selected provider, Teaching Engine, and Rumik Manager. It persists the user message and rendered assistant lesson text, returns text immediately, and starts Rumik synthesis asynchronously. Rumik emits sanitized segment-ready events as each WAV is completed; the renderer owns sequential audio playback and transport controls.
