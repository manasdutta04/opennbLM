# Rumik TTS Integration

## Strategy

Integrate Rumik behind a speech interface owned by the application. The interface should accept normalized text plus voice, locale, and playback options, and return either a stream or a bounded audio artifact with metadata. Rumik-specific authentication, request shape, limits, and error mapping stay in one adapter.

The frontend should receive only short-lived playback data or a controlled stream; provider credentials never reach the client. Audio retention is off by default. Support cancellation, timeouts, rate limits, and a text-only fallback.

## Open questions

Rumik API contract, SDK availability, supported codecs, streaming behavior, voice catalog, quotas, data retention, and deployment requirements are not present in this repository and must be verified before implementation.

## Status

No Rumik dependency, credentials, network integration, or audio pipeline exists.
