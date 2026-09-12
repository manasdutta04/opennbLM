# opennbLM

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![CI](https://github.com/manasdutta04/opennbLM/actions/workflows/ci.yml/badge.svg)](https://github.com/manasdutta04/opennbLM/actions/workflows/ci.yml)
[![Windows release](https://github.com/manasdutta04/opennbLM/actions/workflows/release-windows.yml/badge.svg)](https://github.com/manasdutta04/opennbLM/actions/workflows/release-windows.yml)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![pnpm](https://img.shields.io/badge/pnpm-9.14.4-F69220.svg)](https://pnpm.io)

Native, local-first learning companion for Windows. Create a notebook, add sources, connect a teaching brain, then chat and generate Studio work on your machine.

**Status:** v0.1.0 early MVP. Fine to open for contributors if docs stay honest. English Studio and chat are the reliable path. Indic Audio Overview is limited by [rumik-oss-1](https://huggingface.co/rumik-ai/rumik-oss-1); a larger GPU makes it faster, not more natural.

## What works now

- Local notebooks, sources, and grounded chat
- Studio: mind map, slides, report, flashcards, quiz, infographic, data table
- Audio Overview through Rumik (Local CUDA or Remote HTTPS)
- Seven Studio languages: English, Hindi, Bengali, Telugu, Tamil, Kannada, Punjabi
- Teaching notes in Memory (only after a brain answers a question)

## What is still rough

- Indic speech quality and long Audio Overviews (many minutes on a laptop GPU)
- macOS / non-CUDA local voice (use Remote, or skip voice)
- No claim that this matches a commercial NotebookLM + TTS stack

## Quick start

```bash
pnpm install
pnpm build
pnpm desktop:start
```

Needs Node 22 and pnpm 9.14.4.

1. Create a notebook.
2. Add a PDF, link, or pasted text.
3. Open the notebook → **Connect brain** (Claude, Codex, Gemini, OpenCode, Ollama, or LM Studio).
4. Ask in chat or generate Studio. Language is the Studio picker.

Voice is optional. **Settings → Voice engine**: Remote (public Hugging Face Space) or Local (NVIDIA CUDA + `rumik-ai/rumik-oss-1`). A Hugging Face token is optional for Remote ZeroGPU quota.

## Repo map

```
apps/desktop     Electron main, IPC, services
apps/preload     Typed renderer bridge
apps/renderer    React UI
packages/*       Contracts and local capabilities
web/             Marketing site (Vercel static export)
.agents/         Product notes for coding agents
docs/            Rumik, providers, progress log
```


## Docs

- [CONTRIBUTING.md](CONTRIBUTING.md) — how to help
- [SUPPORT.md](SUPPORT.md) — how to get help
- [SECURITY.md](SECURITY.md) — how to report a vulnerability
- [docs/rumik.md](docs/rumik.md) — local vs remote voice
- [docs/llm-providers.md](docs/llm-providers.md) — engine discovery
- [AGENTS.md](AGENTS.md) and [.agents/](.agents/) — boundaries for humans and agents

## License

Application source is **Apache License 2.0**. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

Rumik OSS-1 weights and the hosted Space are **not** Apache. They remain under the model authors’ CC-BY-NC terms. Connecting Claude, Codex, Gemini, Ollama, or LM Studio is covered by those products’ own licenses.
