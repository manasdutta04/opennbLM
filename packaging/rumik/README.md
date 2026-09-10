# Bundled Rumik runtime boundary

This directory is the reproducible packaging boundary for the optional Rumik-OSS-1 local subsystem.

The repository intentionally does not contain Python, CUDA, model weights, or third-party wheels. A release build may populate this directory in a licensed, target-specific packaging job with:

- `python/python.exe` and its self-contained environment on Windows, or `python/bin/python3` on macOS;
- `model/` containing the approved Rumik model snapshot and exact revision;
- upstream licenses and notices required by Rumik, Mimi, Transformers, and bundled dependencies.

The application treats missing assets as a voice-unavailable condition and keeps text learning usable. Do not commit generated runtimes or model weights to Git.
