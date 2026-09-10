# Testing

## Strategy

Start with fast unit tests for teaching policies, provider normalization, memory rules, validation, and error mapping. Add contract tests for provider adapters using fixtures/mocks, integration tests for API-to-service boundaries, and browser-level tests only for critical user journeys once a frontend exists.

## Quality gates

Type checking, lint/format checks, unit tests, integration tests, build, and a documented security/privacy review should be part of CI once tooling is selected. Tests must be deterministic, isolated, and explicit about network use.

## Special cases

Test streaming cancellation, retries, provider outages, malformed model output, prompt injection, authorization boundaries, memory deletion, accessibility keyboard flows, and text-only fallback when TTS is unavailable.

## Current validation

The repository has no package manifest or configured test/build commands. Reconnaissance confirms there is no app to run yet; this limitation is recorded in `progress.md`.
