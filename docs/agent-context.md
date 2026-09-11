# Agent context — what is built (opennbLM)

Short handoff for agents. Product: native, local-first, voice-first learning companion. Do **not** recreate deleted apps or name inspiration repos in UI/docs.

## Architecture

| Layer | Owns |
|-------|------|
| `apps/desktop` | Electron lifecycle, IPC, window chrome, service startup |
| `apps/preload` | Only renderer↔main bridge (typed) |
| `apps/renderer` | React UI only — no Node/Electron imports |
| `packages/*` | Contracts + capabilities (engines, teaching, memory, Rumik) |

## Teaching brains (Connect brain)

- Package: `@opennblm/engine-runtime` (`fleet.ts`, `registry.ts`, `discover.ts`, `adapter.ts`, `cli.ts`).
- Fleet: Claude, Codex, Cursor, OpenCode, Grok, Antigravity, Hermes, Kimi, Qwen, Ollama, LM Studio.
- **No static model catalogs.** Models are discovered live per engine (CLI / app-server / ACP / HTTP / config). Empty list until the user’s install exposes models.
- Auth gates are real where possible (Claude status, Cursor status, Codex/OpenCode/Grok/Kimi credential files, etc.).
- Selection persisted as `ModelSelection { instanceId, model }`; cleared if refresh drops that model.
- Windows: prefer `.cmd`/`.exe` via `cmd.exe /c` for npm shims.
- Antigravity: only `agy models` (tab `id\tLabel`) — do not parse help text as models.
- Lesson UI: **Connect brain** `ModelPicker` (cloud/local rail, setup cards, suggested / show all). Settings is **not** for engines.

## Rumik voice

- Fixed engine: `rumik-ai/rumik-oss-1` via `@opennblm/rumik-runtime` + `runtime/rumik_runner.py`.
- Modes: **`local`** (CUDA + weights) preferred; **`remote`** HTTPS fallback to public Space `rumik-ai/rumik-oss-1` when CUDA/weights missing. Renderer IPC unchanged.
- Do **not** claim “Rumik works on Mac” — remote means voice output, not local Apple Silicon inference.
- Bind order (local): `RUMIK_MODEL_PATH` → bundled `resources/rumik/model` → `{userData}/models/rumik-oss-1`.
- Does **not** auto-download weights. Settings shows mode badge, bind path, download command, HF link, refresh.
- Low-VRAM: auto 4-bit NF4 (`bitsandbytes`) at load time on ≤6 GB GPUs. No separately published quantized HF checkpoint — users always pull official weights.
- Demo safety net: `docs/demo/rumik-expressive-sample.wav` + README.

## UI / shell

- Brand icon: `packaging/icons/opennblm-icon.png` (copied to desktop/renderer/packaging).
- Provider marks: official SVGs including Kimi, Qwen, Hermes (`ProviderIcons` / `HermesMark`).
- Home: no Library/Memory tabs; Memory from header; View all → templates; Featured rows.
- Lesson: three-dot overflow (rename/delete); double-click opens.
- Windows: Mac-style title bar (`AppTitleBar` + `window-chrome` / `app-menu`); macOS system menu.

## IPC surface (high level)

- `engines:list|refresh|get-selection|set-selection`, `engine:open-terminal` (clipboard + blank terminal).
- `teaching:teach` → selected engine adapter → teaching-engine.
- `rumik:*`, `setup:status` (includes `dataPaths.rumikModel`, `rumik.mode`), `shell:open-external` (https only).

## Docs to trust

- `docs/progress.md` — decisions / checks / limitations after work.
- `docs/llm-providers.md` — live discovery table.
- `docs/rumik.md` — local vs remote + auto quant.
- `AGENTS.md` — boundaries.

## Do not

- Ship fantasy static model lists.
- Expose Node to the renderer.
- Claim Rumik “works on Mac” for local inference, or “quantized = better quality for everyone.”
- Publish a separate static quantized rumik checkpoint to our HF account (redundant with dynamic bitsandbytes).
- Mention OpenCrew / OpenFolks / OpenClaw in product UI or user-facing docs.
