# Rumik Runtime

Rumik-OSS-1 is opennbLM's fixed, first-class voice engine. It is not interchangeable with arbitrary cloud TTS and this project is not a generic TTS marketplace.

Local-first stays the preferred path. When NVIDIA CUDA (and local weights) are unavailable, the app falls back to a **remote** hosted endpoint so evaluators without an NVIDIA GPU can still hear expressive voice — without claiming that local inference runs on Mac or CPU.

## Source and model

- Official model: `rumik-ai/rumik-oss-1`
- Source: https://huggingface.co/rumik-ai/rumik-oss-1
- Public Space (remote fallback): https://huggingface.co/spaces/rumik-ai/rumik-oss-1 (`https://rumik-ai-rumik-oss-1.hf.space`)
- Model revision configured by the runtime: `RUMIK_MODEL_REVISION`, default `main`.
- The model card documents a 3B multilingual model, 24 kHz output, four speakers (Ira, Aisha, Siya, Zoya), and Transformers `trust_remote_code=True` inference.

## Modes: `local` vs `remote`

| Mode | When | What happens |
|------|------|----------------|
| **local** | CUDA available **and** local weights bound | Runs `runtime/rumik_runner.py` on this machine (official Transformers path). Preferred. |
| **remote** | No CUDA, missing local weights, or `RUMIK_FORCE_REMOTE=1` | HTTPS call to the public rumik-ai Gradio/ZeroGPU Space `synthesize` API; WAV saved under user-data audio. Reachability fallback only. |

Detection: `nvidia-smi` / `torch.cuda.is_available()` at startup and on Settings refresh. Renderer IPC (`rumik:*`) is unchanged — mode switching is owned by `@opennblm/rumik-runtime` in the main process.

**Copy rule:** remote mode means the app *produces Rumik audio*. It does **not** mean “Rumik works on Mac” or “local inference without CUDA.” Settings labels this **Remote fallback**.

Overrides:

- `RUMIK_FORCE_REMOTE=1` — always remote
- `RUMIK_FORCE_LOCAL=1` — always local (fails if CUDA/weights missing)
- `RUMIK_REMOTE_URL` — alternate Gradio Space root (default `https://rumik-ai-rumik-oss-1.hf.space`)
- `RUMIK_REMOTE_SPACE` — Hugging Face Space id for the Gradio client (default `rumik-ai/rumik-oss-1`)
- `HF_TOKEN` / `HUGGING_FACE_HUB_TOKEN` — optional; raises ZeroGPU quota on the public Space (anonymous quota is small and resets daily)

## Runtime architecture

Electron main owns `RumikManager`. The manager selects mode, detects Python/CUDA/model (or remote readiness), synthesizes WAV segments, cancels work, and reports sanitized status through preload IPC. The renderer never receives a raw process handle and does not branch on mode.

Local runner follows the official model-card path: `AutoTokenizer`, `AutoModelForCausalLM.generate_audio`, `audio_tokens_to_codes`, `MimiModel.decode`, and `soundfile` WAV output.

## Automatic quantization (local only)

Quantization happens **automatically at load time** on this machine when VRAM is tight (≤6 GB by default): **4-bit NF4 via bitsandbytes** + FP16 compute (`RUMIK_LOW_VRAM` / `RUMIK_LOAD_IN_4BIT`).

- Users always download the **official** `rumik-ai/rumik-oss-1` weights (Settings download command / HF link).
- opennbLM does **not** publish or host a separate statically quantized checkpoint.
- We never redistribute modified weights; dynamic quant is ephemeral to the local process.
- Quantization improves **reachability** on small GPUs; it is not “better quality” than full precision.

## Configuration

Supported config: speaker, temperature, top-k, max tokens, delivery description, language. Defaults follow the official example (`0.8`, `30`, and `2048` max new tokens). Delivery descriptions are placed in the model's `<description="...">` prompt format (local) or mapped to Space tone/accent/pace controls (remote).

### Install and bind local CUDA (Windows)

1. NVIDIA CUDA GPU + Python 3 with the model card’s `requirements.txt` deps (`torch`, `transformers`, `soundfile`, …).
2. On **≤6 GB VRAM** laptops, also: `pip install -U bitsandbytes accelerate`
3. Download into the bind path (default `%APPDATA%\opennbLM\models\rumik-oss-1`):

```powershell
pip install -U huggingface_hub
huggingface-cli download rumik-ai/rumik-oss-1 --revision main --local-dir "$env:APPDATA\opennbLM\models\rumik-oss-1"
```

4. Optional: `RUMIK_MODEL_PATH`, `RUMIK_PYTHON`, `RUMIK_MODEL_REVISION`, `RUMIK_LOW_VRAM`, `RUMIK_LOAD_IN_4BIT`.
5. Restart. **Settings → Voice engine** shows **Local** + Ready when CUDA and the folder exist.

## Segmentation and playback

Rumik's documented long-form limitation is approximately 30–35 seconds. `segmentForRumik` preserves sentence boundaries and groups sentences under a bounded character budget. `synthesize()` creates one sequential WAV job per segment and emits each completed segment through the main-process event boundary.

## License and attribution

The model is CC BY-NC 4.0 with the applicable acceptable-use addendum. Commercial products, paid synthesis, and commercial self-hosted deployment require separate permission. The Mimi codec is separately CC BY 4.0. See `NOTICE.rumik.md`. Remote fallback uses the public Space under the same upstream research / non-commercial terms — do not treat it as a commercial TTS API.

## Packaging notes

The electron-builder resource boundary is `packaging/rumik` → `resources/rumik`. The repository does not commit model weights or generated Python environments. Missing local resources are detected and report remote fallback rather than crashing the app.
