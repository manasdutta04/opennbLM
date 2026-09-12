# Contributing to opennbLM

Thanks for wanting to help. This is an early desktop product (v0.1.0). Small, reversible changes are easier to review than large rewrites.

## Before you start

1. Read [`.agents/README.md`](.agents/README.md) and [`AGENTS.md`](AGENTS.md).
2. Treat `apps/desktop`, `apps/preload`, and `apps/renderer` as hard boundaries. The renderer must not import Node or Electron APIs.
3. Do not claim a feature in docs until you have run it.

## Dev setup

```bash
pnpm install
pnpm typecheck
pnpm --filter @opennblm/renderer build
pnpm --filter @opennblm/desktop build
pnpm desktop:start
```

You need Node 22, pnpm 9.14.4, and (for voice) either NVIDIA CUDA + local Rumik weights or Settings → Voice engine → Remote.

## Good first contributions

- UI copy, wrapping, and accessibility
- Tests around notebook JSON, podcast parsing, or teaching prompts
- Docs that match current behavior
- Bug reports with OS, GPU, Studio language, and whether voice is Local or Remote

## Pull requests

- One concern per PR.
- Update `docs/progress.md` after a meaningful change: decision, check, limitation.
- Do not commit secrets, `.env` files, or Hugging Face tokens.
- Do not add a new LLM or TTS vendor unless it sits behind the existing provider / Rumik abstractions.

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
