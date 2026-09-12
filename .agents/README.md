# Agent notes

Read this folder before changing opennbLM. Root [`AGENTS.md`](../AGENTS.md) is the short engineering contract. These files are the product map.

| File | Use when |
|------|----------|
| [product.md](product.md) | What the app is, and what it is not |
| [architecture.md](architecture.md) | Package boundaries and dependency direction |
| [studio-and-voice.md](studio-and-voice.md) | Studio languages, artifacts, Rumik Audio Overview |

Rules that always apply:

- Do not recover or recreate any deleted prior application.
- `apps/renderer` is React only. No Node. No Electron.
- `apps/preload` is the only renderer–main bridge.
- Do not claim a feature in docs until it has been tested.
- After a meaningful change, append `docs/progress.md` (decision, check, limitation).
