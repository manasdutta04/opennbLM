# Demo assets

## Audio safety net

`rumik-expressive-sample.wav` is an official rumik-ai showcase clip (from the public Space assets) so reviewers can hear expressive Rumik output even before local CUDA or remote synthesis is exercised in-app.

Source space: https://huggingface.co/spaces/rumik-ai/rumik-oss-1

## UI screen capture

Record a short capture of:

1. Ask a question in a lesson (Connect brain already selected)
2. Hear / see the expressive voice answer
3. Ask to “say it differently”
4. Switch language and hear the follow-up

Save as `docs/demo/opennblm-voice-flow.gif` or `.mp4` and link it from the root README.

Tips:

- **Local mode:** NVIDIA CUDA + bound weights (Settings shows **Local**).
- **Remote fallback:** no CUDA — Settings shows **Remote fallback**; voice still plays via the public Space. Do not title the recording “runs on Mac locally.”
