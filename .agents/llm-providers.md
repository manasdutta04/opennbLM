# LLM Providers

## Abstraction

Define an internal provider interface around the product's needs rather than mirroring one vendor SDK. At minimum it should support a typed conversation request, optional streaming events, cancellation/deadlines, usage metadata, model identity, and normalized errors.

Provider selection belongs to a routing policy/configuration layer. Provider adapters translate internal messages to vendor requests and vendor responses back to normalized events. They must not own teaching policy or memory writes.

## Reliability and safety

Use allowlisted models, bounded timeouts, retry only safe transient failures, redact sensitive content from telemetry, and provide a fallback/error state. Treat model output as untrusted: validate structured tool results and apply output policy before presentation or persistence.

## Status

No provider SDK or adapter is installed or implemented. API details remain intentionally undecided until the runtime is selected.
