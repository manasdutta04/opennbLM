# Contributing to opennbLM

## Before you change code

Read `.agents/AGENTS.md`, `.agents/progress.md`, and the specialist markdown files relevant to your work. Inspect the actual implementation because the repository is evolving and documentation may lag.

## Principles

- Keep provider integrations behind provider-agnostic interfaces.
- Never commit API keys, model weights, private user data, or generated audio containing private content.
- Do not execute arbitrary user code in the code-explanation feature.
- Do not persist learner memory automatically without validation and user control.
- Preserve graceful degradation: unavailable LLM/TTS providers must produce explicit states.
- Avoid claiming a test or integration works unless it was run.

## Validation

Use the project’s available Python test, lint, type-check, and frontend checks. At minimum, run `pytest` after backend changes. For frontend changes, manually verify keyboard navigation, narrow screens, readable contrast, loading/error/empty states, and reduced-motion behavior.

## Documentation

Record architectural or behavior changes in the relevant `.agents/*.md` file and update `.agents/progress.md` with decisions, limitations, and exact validation evidence. Keep Rumik attribution and license notices intact.
