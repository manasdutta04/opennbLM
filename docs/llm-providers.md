# LLM Providers / Teaching engines

Teaching brains are **CLI and local engines**, not API-key paste forms.

## Engines (`@opennblm/engine-runtime`)

The lesson **Connect brain** picker lists cloud and local engines, including Claude, Codex, Cursor, OpenCode, Grok, Antigravity, Hermes, Kimi, Qwen, Ollama, and LM Studio.

OpenCode loads its full model catalog from `opencode models` when the CLI is available, then falls back to a curated list. Ollama and LM Studio list locally loaded models over HTTP.

Install commands are **copied to the clipboard** and a blank terminal is opened. The install string is never executed as argv.

`ModelSelection { instanceId, model }` is persisted under the user-data folder and used by `teaching:teach`.

## Teaching path

`createTeachingEngine` still plans lessons. The LLM side is an engine adapter:

- Ollama / LM Studio → local HTTP chat (no user API key)
- CLI engines → one-shot prompt via the agent CLI; JSON parsed when possible, otherwise teaching-engine fallback plan

## Legacy HTTP adapters

`@opennblm/llm-providers` and `ProviderManager` remain in the repo for optional custom HTTP use, but they are **not** the default Settings or Connect brain UX.
