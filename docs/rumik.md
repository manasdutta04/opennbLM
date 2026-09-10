# Rumik Runtime

Rumik-OSS-1 is opennbLM's fixed, first-class local voice engine. It is not interchangeable with arbitrary cloud TTS and this project is not a generic TTS marketplace.

## Source and model

- Official model: `rumik-ai/rumik-oss-1`
- Source: https://huggingface.co/rumik-ai/rumik-oss-1
- Model revision configured by the runtime: `RUMIK_MODEL_REVISION`, default `main`.
- Exact immutable revision used for a verified synthesis: none yet; this repository has not downloaded model weights or claimed an actual synthesis.
- The model card documents a 3B multilingual model, 24 kHz output, four speakers (Ira, Aisha, Siya, Zoya), and Transformers `trust_remote_code=True` inference.

## Runtime architecture

Electron main owns `RumikManager`. The manager detects Python and the configured local model, starts/stops the runtime boundary, runs the official Transformers inference flow through `runtime/rumik_runner.py`, writes WAV output, cancels active work, and reports sanitized status through preload IPC. The renderer never receives a raw process handle.

The runner follows the official model-card path: `AutoTokenizer`, `AutoModelForCausalLM.generate_audio`, `audio_tokens_to_codes`, `MimiModel.decode`, and `soundfile` WAV output. It does not reimplement the model architecture.

## Configuration

Supported config: speaker, temperature, top-k, max tokens, delivery description, language. Defaults follow the official example (`0.8`, `30`, and `2048` max new tokens). Delivery descriptions are placed in the model's `<description="...">` prompt format.

### Install and bind (Windows)

1. NVIDIA CUDA GPU + Python 3 with the model card’s `requirements.txt` deps (`torch`, `transformers`, `soundfile`, …).
2. Download into the app bind path (default `%APPDATA%\opennbLM\models\rumik-oss-1`):

```powershell
pip install -U huggingface_hub
huggingface-cli download rumik-ai/rumik-oss-1 --revision main --local-dir "$env:APPDATA\opennbLM\models\rumik-oss-1"
```

3. Optional overrides: `RUMIK_MODEL_PATH`, `RUMIK_PYTHON`, `RUMIK_MODEL_REVISION`.
4. Restart the app. **Settings → Voice engine** shows Ready when Python and the model folder both exist.

The Settings page repeats these steps with the live bind path and a copyable download command.

## Segmentation and playback

Rumik's documented long-form limitation is approximately 30–35 seconds. `segmentForRumik` preserves sentence boundaries and groups sentences under a bounded character budget. `synthesize()` creates one sequential WAV job per segment and emits each completed segment through the main-process event boundary; the renderer queues those files in order and preserves the Teaching Engine's delivery description across jobs.

## License and attribution

The model is CC BY-NC 4.0 with the applicable acceptable-use addendum. Commercial products, paid synthesis, and commercial self-hosted deployment require separate permission. The Mimi codec is separately CC BY 4.0. Redistribution must retain upstream `LICENSE` and `NOTICE` files, attribution, license links, and modification notices. See `NOTICE.rumik.md` for the integration notice mechanism.

## Runtime requirements and limitations

Development inference requires Python, `torch`, `transformers`, `soundfile`, and an NVIDIA CUDA-capable GPU according to the model card. The current implementation expects a local model directory through `RUMIK_MODEL_PATH`; it does not download weights automatically. CPU fallback is deliberately rejected because it would create a misleading “working” path for a 3B BF16 model.

Packaging the Python runtime, model weights, CUDA compatibility, upstream notices, and model-license constraints remains a release-job responsibility. The electron-builder resource boundary is `packaging/rumik` → `resources/rumik`; missing resources are detected and reported rather than crashing the app. The repository does not commit model weights or generated Python environments.

The packaged lookup order is: explicit `RUMIK_PYTHON`/`RUMIK_MODEL_PATH` for development, bundled `resources/rumik/python` and `resources/rumik/model`, then the development system Python and user-data model directory. A release must populate the bundled paths only after the CC BY-NC 4.0 and acceptable-use constraints, Mimi notices, model revision, and target runtime redistribution permissions have been reviewed.

The first-run setup check reports runtime availability, model availability, model id/revision, free memory, GPU feature status, and platform architecture. Voice is optional at startup; text learning remains available when checks fail.

The runtime manager bounds each synthesis process to three minutes, marks failures as error, removes failed/cancelled WAV outputs, preserves punctuation-free short text as a segment, and is stopped from Electron's `before-quit` lifecycle hook. No actual Rumik WAV synthesis has been verified in this repository because no licensed model snapshot/CUDA environment is present.
