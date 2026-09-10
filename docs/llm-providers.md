# LLM Providers

The brain layer is represented by the capability-oriented `LLMProvider` interface in `@opennblm/llm-providers`. It exposes `chat`, `stream`, `structured`, `listModels`, and `healthCheck`. The teaching engine receives this interface and does not import a concrete provider.

Implemented provider adapters:

- Groq — OpenAI-compatible API
- OpenAI — OpenAI-compatible API
- Gemini — native `generateContent` API
- OpenRouter — OpenAI-compatible API
- Ollama — local `/api/tags` and chat endpoints, no key required
- Custom — configurable OpenAI-compatible endpoint

The OpenAI-compatible providers share one adapter while retaining distinct provider ids, defaults, model lists, and credential state. A provider can be swapped without changing conversation records or teaching-engine code.

## Secrets

Keys are accepted only by a main-process IPC handler and encrypted with Electron `safeStorage` before being written to the local credential file. The renderer sees only `Configured` / `Not configured` and connection state. Keys are never put in SQLite, conversations, renderer state, URLs, or logs. Remove/replacement and connection-test actions are available in Settings.

Provider model preferences and custom endpoint configuration are separate non-secret local preferences. Ollama defaults to `127.0.0.1:11434`.

Real network calls are not made by the renderer. Provider adapters are directly mockable through an injected `fetch` implementation for unit tests.
