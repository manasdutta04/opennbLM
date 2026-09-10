# Architecture

## Vision

opennbLM is intended to be a modular learning companion: a conversational interface that teaches, adapts to a learner, remembers useful context with consent, and can speak through a Rumik text-to-speech integration.

## Initial boundaries

- **Frontend**: presentation, interaction state, accessibility, streaming display, and user controls.
- **Application/backend**: authenticated orchestration, conversation lifecycle, policy enforcement, provider routing, and persistence boundaries.
- **Teaching engine**: turns model output into pedagogically useful interaction under explicit learning goals.
- **Memory**: consent-aware storage and retrieval of learner context; never a hidden transcript dump.
- **Provider adapters**: stable internal interfaces over LLM and speech vendors.

The expected flow is `frontend -> application API -> teaching engine -> provider adapters`, with memory consulted through an explicit memory service. Rumik is a speech adapter, not a teaching or persistence layer.

## Technology decisions

No runtime framework, database, package manager, or deployment platform is selected yet because the repository contains no implementation or manifest. The first implementation task should choose a TypeScript-capable stack, document the choice, and add its manifest before business functionality.

Prefer boring, typed, observable components; dependency-light boundaries; streaming-capable APIs; and replaceable infrastructure.

## Security principles

Least privilege, server-side secret handling, authenticated and authorized APIs, input/output validation, prompt-injection resistance, tenant/user isolation, encrypted transport and sensitive storage, safe logging, rate limits, abuse controls, deletion/export support, and explicit consent for memory and audio retention.

## Current status

Architecture is documented only. No runtime components are implemented.
