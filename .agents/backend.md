# Backend

## Responsibilities

Expose authenticated application boundaries, orchestrate teaching turns, route providers, enforce policy and quotas, manage memory commands, and provide structured observability. Backend code owns all provider credentials.

## Principles

Explicit request/response schemas, idempotent mutation semantics where practical, timeouts and cancellation, bounded retries, structured errors, correlation IDs, no raw secret/transcript logging, and deterministic service boundaries suitable for unit tests.

## Intended layers

Transport handlers should call application services. Application services should depend on interfaces for teaching, memory, LLM, and speech. Infrastructure adapters should be replaceable and must not leak vendor response shapes into domain code.

## Status

No server, API, persistence, or backend implementation exists.
