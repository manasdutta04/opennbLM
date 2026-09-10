"""Groq adapter using its OpenAI-compatible chat API."""

from collections.abc import AsyncIterator, Mapping, Sequence

from backend.providers.interfaces import LLMConfig, LLMMessage, LLMProvider, LLMResponse


class GroqProvider:
    def __init__(self, api_key: str, default_model: str = "llama-3.1-8b-instant") -> None:
        self._api_key = api_key
        self.default_model = default_model

    async def complete(self, messages: Sequence[LLMMessage], *, model: str | None = None, config: LLMConfig | None = None, json_schema: Mapping[str, object] | None = None) -> LLMResponse:
        raise NotImplementedError("Groq transport wiring is intentionally isolated for the HTTP adapter")

    async def stream(self, messages: Sequence[LLMMessage], *, model: str | None = None, config: LLMConfig | None = None) -> AsyncIterator[str]:
        response = await self.complete(messages, model=model, config=config)
        yield response.content
