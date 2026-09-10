# opennbLM

opennbLM is a voice-centric learning companion that turns a learner’s question into a structured teaching plan, a delivery plan, and—when a local Rumik server is available—speech. It exists to make explanations adaptive, memorable, and easier to listen to without hiding the learner’s control over language, style, or memory.

## What exists today

The repository contains Python backend foundations for provider abstractions, teaching and delivery planning, Rumik integration, local SQLite memory, PDF and code explanation domains, and a benchmark harness. It also contains a static frontend concept with Home, Conversation, Settings, Provider, Memory, and code-explanation surfaces. Several integrations remain scaffolding or demo-only; the API wiring and production deployment are not complete.

## Architecture

The intended flow is:

`user request → LLM provider → validated TeachingPlan → DeliveryPlan → optional Rumik TTS → audio/text response`

Backend boundaries are organized under `backend/api`, `core`, `schemas`, `services`, `providers`, `storage`, `teaching`, `delivery`, `memory`, `documents`, `code`, and `pipeline`. Provider credentials stay server-side. Memory is explicit and consent-aware; arbitrary code is never executed.

## Rumik-OSS integration

`RumikProvider` targets the documented local Rumik-OSS 1 server endpoint `POST /v1/audio/speech` and supports configurable endpoint, speaker, temperature, top-k, and maximum-token settings. If Rumik is unavailable, text remains available and audio is reported as unavailable; the system does not fake successful audio.

The official model card documents local installation with Python/CUDA requirements, separate model setup, and a local server. This project does not download weights or bundle them. Rumik-OSS 1 is research/non-commercial under the upstream CC-BY-NC 4.0 terms with an acceptable-use addendum. Retain upstream attribution, license links, notices, and modification information. This repository’s MIT license does not change Rumik’s terms or grant commercial rights to its weights. See the [official model card](https://huggingface.co/rumik-ai/rumik-oss-1).

## Brain providers

The provider abstraction is designed for Groq, Ollama, OpenAI, Gemini, and custom OpenAI-compatible endpoints. The current repository includes extension points and partial Groq/Ollama adapters; do not assume every provider is production-ready. Ollama is the intended local fallback when configured. No provider key belongs in frontend JavaScript.

## Local setup

The backend is Python/FastAPI-oriented. Create a virtual environment, install `requirements.txt`, copy `.env.example` to `.env`, and run the ASGI app with Uvicorn when the environment is available:

```bash
python -m venv .venv
python -m pip install -r requirements.txt
uvicorn backend.main:app --reload
```

The repository has historically lacked a stable package/build lock and this setup has not been verified in every environment. Run the available tests before relying on it.

## BYOK setup

Developer-mode provider keys may be supplied through environment variables such as `OPENNBLM_GROQ_API_KEY`. Keys are read by server-side adapters only, are not returned by API schemas, and are not persisted by default. Per-session/user-provided keys should be passed through an authenticated, short-lived server-side credential boundary in a future implementation; do not place them in browser storage or logs.

## Memory

V1 local memory uses SQLite and separates conversation history, learner memory, learning progress, and topic history. Candidate memories are validated and should be approved before persistence. Retrieval uses simple deterministic matching so a vector index can be introduced later. Deletion is supported at the storage boundary; a complete authenticated user-facing deletion flow is not yet finished.

## Teaching Engine

The Teaching Engine validates structured `TeachingPlan` output and has a deterministic fallback for malformed or unavailable LLM output. It supports teaching strategies such as direct, analogy-first, example-first, story, step-by-step, Socratic, simplified, and technical. Code explanations are explanation-only and never execute submitted code. PDF lessons use bounded extraction and lightweight section detection; scanned PDFs require OCR, which is not bundled.

## Delivery Engine

The Delivery Engine converts semantic teaching segments into deterministic speech metadata: emotion, pace, emphasis, pauses, language, pronunciation terms, and conservative Rumik instructions. It avoids adding emotion to every sentence and uses teaching metadata first.

## Screenshots/demo

The static concept UI is in `frontend/`. Open `frontend/index.html` in a browser for the local visual prototype and `frontend/code-explain.html` for the code explanation surface. The frontend currently uses demo state and is not a verified production client of the backend API.

## Benchmark

`bench/` contains opennbLM-Bench tasks and a JSONL harness for comparing plain text, standard TTS, Rumik, and the full teaching/delivery pipeline. It records actual attempts and timings but does not fabricate comprehension, recall, or audio-adherence results. See `bench/README.md`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Before changing code, read all relevant `.agents/*.md` files and update `.agents/progress.md` with verified results and limitations.

## License

Original project code is MIT licensed. Third-party models, codecs, dependencies, and provider services retain their own licenses and terms. In particular, Rumik-OSS 1 has separate upstream licensing and attribution requirements described above.
