# Memory

## Responsibilities

Provide explicit, consent-aware operations for remembering, retrieving, correcting, exporting, and deleting learner context. Candidate memories should have provenance, scope, confidence, timestamps, retention rules, and a user-visible reason for retention.

## Principles

Opt-in where appropriate, least data, purpose limitation, user control, tenant isolation, encryption, auditable changes, bounded retrieval, and deletion that propagates to indexes/caches. Do not treat every conversation line as a durable memory.

## Boundary

Memory is a service/API boundary used by the teaching engine. It is not a hidden prompt cache and should not expose raw storage records to the frontend.

## Status

No database, schema, embedding/indexing choice, or memory implementation exists.
