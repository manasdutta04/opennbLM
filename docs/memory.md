# Memory and Persistence

opennbLM has two deliberately separate local stores in `<userData>/opennblm.sqlite`:

- Conversation history: the complete user-visible lesson transcript and message metadata.
- Learner memory: a small set of durable learning notes that can improve future teaching.

The renderer never opens SQLite. Electron main/local-services owns the database and exposes only typed preload APIs.

## Learner memory

Learner memory is not an archive of every message. After a Teaching Engine result, the main process deterministically extracts bounded signals: topics studied, current learner level, completed lesson summaries, recent context, selected explanation style, language, and possible misconception risks. Weak concepts are intentionally stored with lower confidence and phrased as things to revisit—not as definitive judgments.

The Memory screen (top-bar) also lists named notebooks from the local notebook store so learners can reopen study work even when teaching notes are still empty. Notebooks and teaching notes stay separate: Clear notes does not delete notebooks.

The `learner_memory` table stores `id`, `kind`, `memory_key`, `value`, confidence, optional source conversation id, and created/updated timestamps. `(kind, memory_key)` is unique so later evidence updates a note instead of creating an unbounded log. There is no vector database in v1.

Before planning a new lesson, the main process retrieves a bounded recent memory context and passes it to the provider-independent Teaching Engine. The prompt instructs the engine to use it gently and never reveal hidden context in the lesson. For example, a recurring recursion difficulty can bias the next plan toward simpler intuition and concrete analogies.

The Memory screen makes every note visible. Each note has “Forget this”; “Clear learner memory” removes all learner notes while leaving conversation history intact. This is local deletion, not a remote account operation.

API keys and provider secrets are never extracted into learner memory, conversation records, renderer state, URLs, or logs. Provider credentials remain in the separate Electron `safeStorage` path.

SQLite uses `sql.js`, a WebAssembly SQLite runtime packaged with the application. The memory service asynchronously opens/exports the database at the user-data path, with foreign keys and a small schema. This avoids relying on Electron's unavailable `node:sqlite` builtin or an unverified native addon ABI.
