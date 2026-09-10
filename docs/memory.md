# Memory and Persistence

Local services will own SQLite persistence and future conversation/memory repositories. The renderer will never open the database directly.

The current `MemoryStore` is an interface-level placeholder and does not open SQLite or define conversation schema. Future work must document retention, deletion, export, and privacy behavior before shipping memory features.
