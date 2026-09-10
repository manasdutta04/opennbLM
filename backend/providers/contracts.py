"""Stable, vendor-neutral contracts for chat-capable language models."""

from collections.abc import AsyncIterator, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Protocol

from backend.providers.interfaces import LLMMessage


@dataclass(frozen=True)
class GenerationConfig:
    temperature: float | None = None
    max_tokens: int | None = None
    metadata: Mapping[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class GenerationResult:
    text: str
    model: str
    usage: Mapping[str, int] = field(default_factory=dict)
    structured: object | None = None


class ChatProvider(Protocol):
    async def chat(self, messages: Sequence[LLMMessage], *, model: str | None = None, config: GenerationConfig | None = None, json_schema: Mapping[str, object] | None = None) -> GenerationResult: ...
    def stream(self, messages: Sequence[LLMMessage], *, model: str | None = None, config: GenerationConfig | None = None) -> AsyncIterator[str]: ...
