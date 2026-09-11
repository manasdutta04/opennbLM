# opennbLM

Native, local-first, voice-first learning companion.

## Demo

Expressive Rumik voice (official showcase sample used as a safety-net clip for reviewers without a local CUDA GPU):

[docs/demo/rumik-expressive-sample.wav](docs/demo/rumik-expressive-sample.wav)

Full UI flow (ask → expressive answer → say it differently → language switch): see [docs/demo/README.md](docs/demo/README.md). Prefer recording on a CUDA machine with local mode, or on any machine with **remote fallback** enabled.

## Quick start

```bash
pnpm install
pnpm build
pnpm desktop:start
```

Teaching brains: open a lesson or notebook → **Connect brain** (live CLI/local catalogs).  
Notebooks: Home → create a notebook → add sources (paste / PDF / URL / office) → Chat, Notes, Search, or Rumik study audio.  
Voice: **Settings → Voice engine** — **Local** when NVIDIA CUDA + weights are present; otherwise **Remote fallback** (hosted rumik-ai Space) so voice still plays without claiming local Mac/CPU inference.

## Docs

- [docs/rumik.md](docs/rumik.md) — local vs remote, auto 4-bit quantization
- [docs/llm-providers.md](docs/llm-providers.md) — engine discovery
- [docs/progress.md](docs/progress.md) — implementation log
- [AGENTS.md](AGENTS.md) — engineering boundaries
