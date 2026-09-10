"""Development runner using the official Rumik Transformers inference API.

This script intentionally does not reimplement the model. It follows the official
model-card flow: Transformers model.generate_audio(), audio_tokens_to_codes(),
MimiModel.decode(), and soundfile WAV output.
"""
import argparse
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
args = parser.parse_args()

device = "cuda" if torch.cuda.is_available() else "cpu"
if device != "cuda":
    raise RuntimeError("Rumik development inference requires an NVIDIA CUDA device")
repo = args.model_path
tokenizer = AutoTokenizer.from_pretrained(repo, revision=args.revision, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(repo, revision=args.revision, trust_remote_code=True, torch_dtype=torch.bfloat16).eval().to(device)
mimi = MimiModel.from_pretrained(repo, revision=args.revision, subfolder="codec").eval().to(device)
prompt = f'<text>{args.speaker}: <description="{args.description}"> {args.text}<audio>'
inputs = tokenizer(prompt, return_tensors="pt").to(device)
with torch.inference_mode():
    ids = model.generate_audio(**inputs, max_new_tokens=args.max_new_tokens, temperature=args.temperature, top_k=args.top_k, do_sample=True)
audio_tokens = ids[0].tolist()[inputs.input_ids.shape[1]:]
codes = model.audio_tokens_to_codes(audio_tokens)
with torch.inference_mode():
    wav = mimi.decode(codes.to(mimi.device)).audio_values[0, 0]
sf.write(args.output, wav.float().cpu().numpy(), 24000)
