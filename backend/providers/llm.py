"""Expanded provider-neutral LLM contracts for future adapters."""

from collections.abc import AsyncIterator, Mapping, Sequence
from dataclasses import dataclass
from typing import Protocol

from backend.providers.interfaces import LLMMessage, LLMResponse


@dataclass(frozen=True)
class GenerationConfig:
    temperature: float | None = None
    max_tokens: int | None = None
    metadata: Mapping[str, str] | None = None


class ChatProvider(Protocol):
    async def chat(self, messages: Sequence[LLMMessage], *, model: str | None = None, config: GenerationConfig | None = None, json_schema: Mapping[str, object] | None = None) -> LLMResponse: ...
    def stream(self, messages: Sequence[LLMMessage], *, model: str | None = None, config: GenerationConfig | None = None) -> AsyncIterator[str]: ...
