# Studio and voice

## Languages

`STUDIO_LANGUAGES` in `@opennblm/contracts` is the only picker list. Accent for Rumik is derived from that language (`Hindi accent`, `Bengali accent`, `Indian English accent`, …). Do not add a separate accent menu.

Indic scripts must stay native (no Latin transliteration) in Studio JSON, teaching answers, and Audio Overview scripts. Split spoken lines on `. ! ?` and Indic danda `।`. Indic Rumik segments cap around 200 characters.

## Audio Overview

Pipeline: teaching brain writes a speaker script → parse turns → one Rumik job per sentence → concat WAVs.

- Local: CUDA + `rumik-ai/rumik-oss-1` (3B). Slow on laptop GPUs; 4-bit auto-load at or below ~6.5 GB VRAM.
- Remote: public Hugging Face Space over HTTPS. Token optional (ZeroGPU quota).
- Rumik is CC-BY-NC. A bigger GPU changes speed, not pronunciation.

Official delivery string: `tone, Accent accent, pace` (for example `excited, Bengali accent, steady pace`).

Chat must not call Rumik. Only Audio Overview synthesizes speech.
