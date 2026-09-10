# Teaching Engine

## Responsibilities

Convert a learner request and available context into a teaching turn: identify the likely goal, choose an appropriate explanation or activity, ask useful checks for understanding, calibrate difficulty, expose uncertainty, and return structured pedagogical metadata alongside learner-facing text.

It may request memory retrieval, but it does not persist memory directly. It may use an LLM, but it owns the instructional contract and validation around that output.

## Non-responsibilities

Authentication, provider credentials, raw transcript storage, UI rendering, speech synthesis, and authoritative grading.

## Design constraints

Prefer deterministic policy around probabilistic generation, explicit learning objectives, bounded context, safe refusal/escalation, and testable decision outputs. Avoid claiming mastery from a single response.

## Status

No teaching engine exists.
