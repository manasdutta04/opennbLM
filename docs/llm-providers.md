# LLM Providers / Teaching engines

Teaching brains are **CLI and local engines**, not API-key paste forms.

## Engines (`@opennblm/engine-runtime`)

The lesson **Connect brain** picker lists cloud and local engines, including Claude, Codex, Cursor, OpenCode, Grok, Antigravity, Hermes, Kimi, Qwen, Ollama, and LM Studio.

Model rows are **discovered live for the signed-in user** — there is no shipped static catalog of fantasy models.

| Engine | Discovery |
|--------|-----------|
| Codex | `codex app-server` → `model/list` (subscription catalog) |
| Cursor | `cursor-agent models` / `--list-models` + auth via `status` |
| OpenCode | `opencode models --verbose` (providers the CLI can actually use) |
| Claude | CLI model list when available, else `~/.claude/settings.json` configured ids + `auth status` |
| Grok | CLI model list when available, else `~/.grok/config.toml` + `auth.json` |
| Kimi | CLI / `provider list` when available, else `~/.kimi-code/config.toml` + credentials |
| Antigravity | CLI model list when available, else local settings extras |
| Hermes | ACP `session/new` `models.availableModels` when a hosted provider is configured |
| Qwen | CLI model list only (no invented cloud rows) |
| Ollama / LM Studio | Local HTTP tags / `/v1/models` — empty until models are loaded |

Install commands are **copied to the clipboard** and a blank terminal is opened. The install string is never executed as argv.

`ModelSelection { instanceId, model }` is persisted under the user-data folder and cleared if a refresh shows that model is no longer available. It is used by `teaching:teach`.

## Teaching path

`createTeachingEngine` still plans lessons. The LLM side is an engine adapter:

- Ollama / LM Studio → local HTTP chat (no user API key)
- CLI engines → one-shot prompt via the agent CLI; JSON parsed when possible, otherwise teaching-engine fallback plan

## Legacy HTTP adapters

`@opennblm/llm-providers` and `ProviderManager` remain in the repo for optional custom HTTP use, but they are **not** the default Settings or Connect brain UX.
