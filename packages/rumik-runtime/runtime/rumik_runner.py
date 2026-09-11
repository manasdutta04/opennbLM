"""Development runner using the official Rumik Transformers inference API.

Follows the model-card flow: generate_audio → audio_tokens_to_codes → Mimi decode → WAV.

On GPUs with little VRAM (e.g. 4 GB laptop cards), prefers 4-bit NF4 loading via
bitsandbytes instead of full bfloat16. Unsloth is not used — it targets LLM
fine-tuning, not this TTS path.
"""
from __future__ import annotations

import argparse
import gc
import os

import soundfile as sf
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, MimiModel

parser = argparse.ArgumentParser()
parser.add_argument("--model-path", required=True)
parser.add_argument("--revision", default="main")
parser.add_argument("--text", required=True)
parser.add_argument("--speaker", required=True)
parser.add_argument("--temperature", type=float, default=0.8)
parser.add_argument("--top-k", type=int, default=30)
parser.add_argument("--max-new-tokens", type=int, default=2048)
parser.add_argument("--description", default="professional, steady pace")
parser.add_argument("--language", default="English")
parser.add_argument("--output", required=True)
parser.add_argument(
    "--low-vram",
    action="store_true",
    help="Force 4-bit / memory-saving load (also set by RUMIK_LOW_VRAM=1 or auto on ≤6GB GPUs).",
)
parser.add_argument(
    "--load-in-4bit",
    action="store_true",
    help="Force bitsandbytes 4-bit NF4 (also RUMIK_LOAD_IN_4BIT=1).",
)
args = parser.parse_args()

if not torch.cuda.is_available():
    raise RuntimeError("Rumik development inference requires an NVIDIA CUDA device")

props = torch.cuda.get_device_properties(0)
vram_gb = props.total_memory / (1024**3)
env_low = os.environ.get("RUMIK_LOW_VRAM", "").strip().lower() in {"1", "true", "yes"}
env_4bit = os.environ.get("RUMIK_LOAD_IN_4BIT", "").strip().lower() in {"1", "true", "yes"}
# Auto low-VRAM on typical laptop 4–6 GB cards unless explicitly disabled.
auto_low = vram_gb <= 6.5 and os.environ.get("RUMIK_LOW_VRAM", "").strip().lower() not in {"0", "false", "no"}
low_vram = args.low_vram or env_low or env_4bit or args.load_in_4bit or auto_low
want_4bit = args.load_in_4bit or env_4bit or low_vram

# Keep generation shorter on tiny cards so activations fit.
max_new_tokens = args.max_new_tokens
if low_vram and max_new_tokens > 1024:
    max_new_tokens = 1024

repo = args.model_path
revision = args.revision
compute_dtype = torch.float16  # consumer GeForce (3050 Ti) is happier with FP16 than BF16

print(
    f"[rumik] GPU={props.name} VRAM={vram_gb:.1f}GB low_vram={low_vram} "
    f"4bit={want_4bit} max_new_tokens={max_new_tokens}",
    flush=True,
)

tokenizer = AutoTokenizer.from_pretrained(repo, revision=revision, trust_remote_code=True)


def load_model_4bit():
    from transformers import BitsAndBytesConfig

    quant = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=compute_dtype,
    )
    return AutoModelForCausalLM.from_pretrained(
        repo,
        revision=revision,
        trust_remote_code=True,
        quantization_config=quant,
        device_map={"": 0},
        low_cpu_mem_usage=True,
    ).eval()


def load_model_fp16():
    return (
        AutoModelForCausalLM.from_pretrained(
            repo,
            revision=revision,
            trust_remote_code=True,
            torch_dtype=compute_dtype,
            low_cpu_mem_usage=True,
        )
        .eval()
        .to("cuda")
    )


model = None
load_error = None
if want_4bit:
    try:
        model = load_model_4bit()
        print("[rumik] loaded LM in 4-bit NF4 (bitsandbytes)", flush=True)
    except Exception as err:  # noqa: BLE001 — fall through to fp16
        load_error = err
        print(f"[rumik] 4-bit load failed ({err}); trying FP16…", flush=True)
        gc.collect()
        torch.cuda.empty_cache()

if model is None:
    try:
        # Cap visible CUDA memory so transformers / allocator leave headroom for Mimi + activations.
        if low_vram:
            # ~3.2 GiB of 4 GB for the LM; rest for codec / KV / fragmentation.
            torch.cuda.set_per_process_memory_fraction(0.82, device=0)
        model = load_model_fp16()
        print("[rumik] loaded LM in FP16", flush=True)
    except Exception as err:  # noqa: BLE001
        hint = (
            "Install bitsandbytes for 4-bit: pip install -U bitsandbytes accelerate. "
            "A 4 GB GPU usually needs 4-bit; full BF16/FP16 will OOM."
        )
        raise RuntimeError(f"Failed to load Rumik LM on {vram_gb:.1f}GB VRAM. {hint}") from (load_error or err)

# Mimi is much smaller than the LM; keep it on GPU in FP16 when possible.
try:
    mimi = MimiModel.from_pretrained(repo, revision=revision, subfolder="codec").eval().to("cuda", dtype=compute_dtype)
    mimi_device = torch.device("cuda")
    print("[rumik] Mimi codec on CUDA", flush=True)
except Exception as err:  # noqa: BLE001
    print(f"[rumik] Mimi on CUDA failed ({err}); using CPU codec", flush=True)
    mimi = MimiModel.from_pretrained(repo, revision=revision, subfolder="codec").eval()
    mimi_device = torch.device("cpu")

prompt = f'<text>{args.speaker}: <description="{args.description}"> {args.text}<audio>'
# Inputs must live on the same device as the LM embeddings.
model_device = next(model.parameters()).device
inputs = tokenizer(prompt, return_tensors="pt").to(model_device)

with torch.inference_mode():
    ids = model.generate_audio(
        **inputs,
        max_new_tokens=max_new_tokens,
        temperature=args.temperature,
        top_k=args.top_k,
        do_sample=True,
    )

audio_tokens = ids[0].tolist()[inputs.input_ids.shape[1] :]
codes = model.audio_tokens_to_codes(audio_tokens)

# Free LM activation leftovers before decode when VRAM is tight.
if low_vram:
    del ids, inputs
    gc.collect()
    torch.cuda.empty_cache()

with torch.inference_mode():
    wav = mimi.decode(codes.to(mimi_device)).audio_values[0, 0]

sf.write(args.output, wav.float().cpu().numpy(), 24000)
print(f"[rumik] wrote {args.output} ({len(audio_tokens)} audio tokens)", flush=True)
