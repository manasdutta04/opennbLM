# Frontend

## Responsibilities

Render the learning conversation, progress and comprehension signals, provider/error states, memory controls, and speech controls. Keep domain decisions in application services rather than duplicating them in components.

## Principles

Accessible semantic HTML, keyboard-first interaction, responsive layouts, clear loading/streaming states, optimistic UI only when reversible, cancellation for long-running requests, and no secrets in browser code. Treat streamed text and audio as untrusted data.

## Intended structure

Group code by feature and shared UI primitives once a framework is selected. Keep API clients typed and isolated. Avoid introducing a design system or visual styling framework before the first product surface establishes its needs.

## Status

No frontend runtime or implementation exists.
