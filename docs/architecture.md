# Architecture

opennbLM is an Electron desktop application with a React/Vite renderer and local service packages.

## Runtime boundaries

The Electron main process owns lifecycle, windows, filesystem paths, and IPC handlers. The preload process exposes a typed, minimal bridge. The renderer has no Node integration and cannot access SQLite, provider credentials, or sidecar processes directly.

Local services orchestrate persistence and future application capabilities. Provider adapters, teaching contracts, memory, and Rumik runtime integrations are independent packages so the application does not hard-code a brain or voice implementation.

## Dependency direction

UI depends on contracts through preload. Main depends on local services and contracts. Local services may depend on memory. Provider, teaching, memory, and Rumik packages do not depend on the renderer.

## Current status

The renderer requests conversation data through preload IPC. `@opennblm/local-services` owns the database lifecycle and delegates the SQLite repository to `@opennblm/memory`; the renderer never opens SQLite. Conversation records intentionally contain learning metadata and messages only—credentials are outside this model.

SQLite currently uses the runtime's `node:sqlite` `DatabaseSync` API, with WAL mode, foreign keys, and a small two-table schema. This avoids an additional native addon in the foundation and keeps storage local to Electron's user-data directory.
