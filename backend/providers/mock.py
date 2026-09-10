"""Test-only provider implementation."""

import json
from collections.abc import AsyncIterator, Mapping, Sequence

from backend.providers.contracts import ChatProvider, GenerationConfig, GenerationResult
from backend.providers.interfaces import LLMMessage


class MockLLMProvider:
    def __init__(self, text: str = '{"ok": true}', model: str = "mock") -> None:
        self.text, self.model = text, model

    async def chat(self, messages: Sequence[LLMMessage], *, model: str | None = None, config: GenerationConfig | None = None, json_schema: Mapping[str, object] | None = None) -> GenerationResult:
        structured = json.loads(self.text) if json_schema is not None else None
        return GenerationResult(self.text, model or self.model, structured=structured)

    async def _one(self, text: str) -> AsyncIterator[str]:
        yield text

    def stream(self, messages: Sequence[LLMMessage], *, model: str | None = None, config: GenerationConfig | None = None) -> AsyncIterator[str]:
        return self._one(self.text)
