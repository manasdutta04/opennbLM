"""Development runner using the official Rumik Transformers inference API.

Follows the model-card flow: generate_audio → audio_tokens_to_codes → Mimi decode → WAV.

On GPUs with little VRAM (e.g. 4 GB laptop cards), prefers 4-bit NF4 loading via
bitsandbytes instead of full bfloat16.

Modes:
  one-shot CLI (--text / --text-file + --output)
  persistent worker (--serve): load once, then JSONL jobs on stdin
"""
from __future__ import annotations

import argparse
import gc
import json
import os
import sys
import traceback

# Keep progress bars off stdout/stderr so Electron never treats them as the error body.
os.environ.setdefault("TQDM_DISABLE", "1")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")

import soundfile as sf
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, MimiModel


def log(msg: str) -> None:
    print(f"[rumik] {msg}", file=sys.stderr, flush=True)


def emit(obj: dict) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--revision", default="main")
    parser.add_argument("--text", default="")
    parser.add_argument(
        "--text-file",
        default="",
        help="Read spoken text from a UTF-8 file (avoids Windows command-line length limits).",
    )
    parser.add_argument("--speaker", default="Ira")
    parser.add_argument("--temperature", type=float, default=0.8)
    parser.add_argument("--top-k", type=int, default=30)
    parser.add_argument("--max-new-tokens", type=int, default=2048)
    parser.add_argument("--description", default="professional, steady pace")
    parser.add_argument("--language", default="English")
    parser.add_argument("--output", default="")
    parser.add_argument(
        "--serve",
        action="store_true",
        help="Load model once and process JSONL synthesis jobs from stdin.",
    )
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
    return parser.parse_args(argv)


def resolve_text(args: argparse.Namespace) -> str:
    if args.text_file:
        with open(args.text_file, "r", encoding="utf-8") as handle:
            return handle.read().strip()
    return (args.text or "").strip()


def load_stack(args: argparse.Namespace):
    if not torch.cuda.is_available():
        raise RuntimeError("Rumik development inference requires an NVIDIA CUDA device")

    props = torch.cuda.get_device_properties(0)
    vram_gb = props.total_memory / (1024**3)
    env_low = os.environ.get("RUMIK_LOW_VRAM", "").strip().lower() in {"1", "true", "yes"}
    env_4bit = os.environ.get("RUMIK_LOAD_IN_4BIT", "").strip().lower() in {"1", "true", "yes"}
    auto_low = vram_gb <= 6.5 and os.environ.get("RUMIK_LOW_VRAM", "").strip().lower() not in {
        "0",
        "false",
        "no",
    }
    low_vram = args.low_vram or env_low or env_4bit or args.load_in_4bit or auto_low
    want_4bit = args.load_in_4bit or env_4bit or low_vram

    max_new_tokens = args.max_new_tokens
    if low_vram and max_new_tokens > 1024:
        max_new_tokens = 1024

    repo = args.model_path
    revision = args.revision
    compute_dtype = torch.float16

    log(
        f"GPU={props.name} VRAM={vram_gb:.1f}GB low_vram={low_vram} "
        f"4bit={want_4bit} max_new_tokens={max_new_tokens}"
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
            log("loaded LM in 4-bit NF4 (bitsandbytes)")
        except Exception as err:  # noqa: BLE001
            load_error = err
            log(f"4-bit load failed ({err}); trying FP16…")
            gc.collect()
            torch.cuda.empty_cache()

    if model is None:
        try:
            if low_vram:
                torch.cuda.set_per_process_memory_fraction(0.82, device=0)
            model = load_model_fp16()
            log("loaded LM in FP16")
        except Exception as err:  # noqa: BLE001
            hint = (
                "Install bitsandbytes for 4-bit: pip install -U bitsandbytes accelerate. "
                "A 4 GB GPU usually needs 4-bit; full BF16/FP16 will OOM."
            )
            raise RuntimeError(
                f"Failed to load Rumik LM on {vram_gb:.1f}GB VRAM. {hint}"
            ) from (load_error or err)

    try:
        mimi = MimiModel.from_pretrained(repo, revision=revision, subfolder="codec").eval().to(
            "cuda", dtype=compute_dtype
        )
        mimi_device = torch.device("cuda")
        log("Mimi codec on CUDA")
    except Exception as err:  # noqa: BLE001
        log(f"Mimi on CUDA failed ({err}); using CPU codec")
        mimi = MimiModel.from_pretrained(repo, revision=revision, subfolder="codec").eval()
        mimi_device = torch.device("cpu")

    return {
        "model": model,
        "tokenizer": tokenizer,
        "mimi": mimi,
        "mimi_device": mimi_device,
        "low_vram": low_vram,
        "default_max_new_tokens": max_new_tokens,
    }


def synthesize(
    *,
    stack: dict,
    text: str,
    speaker: str,
    description: str,
    language: str,
    temperature: float,
    top_k: int,
    max_new_tokens: int,
    output: str,
) -> int:
    if not text.strip():
        raise ValueError("Spoken text is empty")
    if not output:
        raise ValueError("Output WAV path is required")

    model = stack["model"]
    tokenizer = stack["tokenizer"]
    mimi = stack["mimi"]
    mimi_device = stack["mimi_device"]
    low_vram = stack["low_vram"]
    token_cap = int(max_new_tokens) if max_new_tokens else stack["default_max_new_tokens"]
    if low_vram and token_cap > 1024:
        token_cap = 1024

    # Language is part of delivery context for the description field.
    desc = description.strip() or "professional, steady pace"
    if language and language.strip() and language.strip().lower() not in desc.lower():
        desc = f"{desc}; language={language.strip()}"

    prompt = f'<text>{speaker}: <description="{desc}"> {text.strip()}<audio>'
    model_device = next(model.parameters()).device
    inputs = tokenizer(prompt, return_tensors="pt").to(model_device)

    with torch.inference_mode():
        ids = model.generate_audio(
            **inputs,
            max_new_tokens=token_cap,
            temperature=float(temperature),
            top_k=int(top_k),
            do_sample=True,
        )

    audio_tokens = ids[0].tolist()[inputs.input_ids.shape[1] :]
    codes = model.audio_tokens_to_codes(audio_tokens)

    if low_vram:
        del ids, inputs
        gc.collect()
        torch.cuda.empty_cache()

    with torch.inference_mode():
        wav = mimi.decode(codes.to(mimi_device)).audio_values[0, 0]

    sf.write(output, wav.float().cpu().numpy(), 24000)
    log(f"wrote {output} ({len(audio_tokens)} audio tokens)")
    return len(audio_tokens)


def serve(args: argparse.Namespace) -> int:
    stack = load_stack(args)
    emit({"event": "ready", "low_vram": bool(stack["low_vram"])})
    for line in sys.stdin:
        raw = line.strip()
        if not raw:
            continue
        try:
            job = json.loads(raw)
        except json.JSONDecodeError as err:
            emit({"ok": False, "error": f"Invalid job JSON: {err}"})
            continue

        job_id = str(job.get("id") or "")
        cmd = str(job.get("cmd") or "synth").lower()
        if cmd in {"shutdown", "exit", "quit"}:
            emit({"id": job_id, "ok": True, "event": "shutdown"})
            return 0
        if cmd == "ping":
            emit({"id": job_id, "ok": True, "event": "pong"})
            continue

        try:
            text = str(job.get("text") or "")
            text_file = str(job.get("text_file") or "")
            if text_file:
                with open(text_file, "r", encoding="utf-8") as handle:
                    text = handle.read()
            tokens = synthesize(
                stack=stack,
                text=text,
                speaker=str(job.get("speaker") or args.speaker),
                description=str(job.get("description") or args.description),
                language=str(job.get("language") or args.language),
                temperature=float(job.get("temperature", args.temperature)),
                top_k=int(job.get("top_k", args.top_k)),
                max_new_tokens=int(job.get("max_new_tokens", stack["default_max_new_tokens"])),
                output=str(job.get("output") or ""),
            )
            emit({"id": job_id, "ok": True, "output": str(job.get("output") or ""), "tokens": tokens})
        except Exception as err:  # noqa: BLE001
            log(traceback.format_exc())
            emit({"id": job_id, "ok": False, "error": str(err)})
    return 0


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.serve:
        return serve(args)

    text = resolve_text(args)
    if not text:
        raise SystemExit("Provide --text or --text-file")
    if not args.output:
        raise SystemExit("Provide --output")

    stack = load_stack(args)
    synthesize(
        stack=stack,
        text=text,
        speaker=args.speaker,
        description=args.description,
        language=args.language,
        temperature=args.temperature,
        top_k=args.top_k,
        max_new_tokens=args.max_new_tokens,
        output=args.output,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
