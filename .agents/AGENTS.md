# Project Agent Instructions

This directory is the durable engineering context for opennbLM. Read this file, `progress.md`, and the relevant specialist document before changing the repository.

## Operating rules

- Inspect the actual repository before making assumptions.
- Keep product behavior separate from documentation and scaffolding work.
- Preserve existing user changes; do not reset, delete, or overwrite context to simplify a task.
- Update `progress.md` after every implementation or structural change.
- Update the relevant architecture or specialist document when a decision, limitation, or behavior changes.
- Never claim a command, feature, or integration works unless it was actually validated.
- Prefer small, reviewable changes and explicit interfaces over premature framework choices.

## Current repository state

The repository began as an empty scaffold containing only the root `AGENTS.md`. There is currently no package manager manifest, application code, test runner, build configuration, or provider integration. The documents in this directory describe the intended foundation; they do not imply that the described product exists yet.

## Change checklist

1. Read this file, `progress.md`, and applicable specialist documents.
2. Inspect code and configuration relevant to the request.
3. Record decisions and limitations in the relevant document.
4. Make the smallest scoped change.
5. Run the strongest available validation and report what was not possible.
6. Update `progress.md` with current status and evidence.

## Conventions

Use TypeScript for application code once implementation begins, keep provider-specific code behind adapters, validate all external input at boundaries, and make asynchronous behavior observable and testable. Add dependencies only after the project runtime and package manager are intentionally selected.
