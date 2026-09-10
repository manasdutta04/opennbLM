# Memory and Persistence

Local services own SQLite persistence at `<userData>/opennblm.sqlite`; the renderer never opens the database directly. Every learning session is a conversation. The schema has `conversations` and `messages` tables with a foreign-key cascade and indexes for updated ordering and message lookup.

Conversations store: id, title, created/updated timestamps, learning topic, optional subject, optional language, optional learner context, and messages. Messages store: id, conversation id, role, text, timestamp, optional audio reference, and optional JSON teaching metadata.

The current UI supports local create, open, search, rename, delete, and message persistence through typed IPC. New conversations use an “Untitled lesson” title as the automatic-title placeholder. API keys and provider secrets are not stored in either table; a separate secure credential mechanism remains future work.

The repository opens SQLite in the main/local-services runtime and creates its schema if missing. Future work must document retention, deletion, export, and privacy behavior before shipping richer memory features. The SQLite API is currently experimental in the development Node runtime and must be verified against the packaged Electron runtime during desktop packaging.
