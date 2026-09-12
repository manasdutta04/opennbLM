# Support

opennbLM is an early open-source desktop app. There is no paid support line.

## How to get help

1. Read the [README](README.md) and [docs/rumik.md](docs/rumik.md).
2. Search [existing issues](https://github.com/manasdutta04/opennbLM/issues).
3. Open a new issue with OS, app version, Studio language, and whether Voice is **Local** or **Remote**.

## Common questions

**Chat is empty / Studio fails.**  
Connect a teaching brain from a notebook’s model picker (Claude, Codex, Gemini, OpenCode, Ollama, or LM Studio). Settings API keys are not the brain.

**Audio Overview is slow or rough.**  
Rumik synthesizes one sentence at a time. Local CUDA on a laptop GPU can take many minutes. English is more reliable than Indic languages. A larger GPU speeds this up; it does not change the voice model.

**Remote voice fails.**  
The public Hugging Face Space has ZeroGPU quota. Add an optional HF token in Settings → Voice engine, or switch to Local if you have CUDA and weights.

## Security reports

See [SECURITY.md](SECURITY.md). Do not file public issues for vulnerabilities.
