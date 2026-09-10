"""Provider-agnostic contracts used by application services."""

from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class LLMMessage:
    role: str
    content: str


@dataclass(frozen=True)
class LLMResponse:
    content: str
    model: str | None = None


class LLMProvider(Protocol):
    async def complete(self, messages: Sequence[LLMMessage], *, model: str | None = None) -> LLMResponse: ...

    def stream(self, messages: Sequence[LLMMessage], *, model: str | None = None) -> AsyncIterator[str]: ...


@dataclass(frozen=True)
class TTSRequest:
    text: str
    voice: str | None = None
    locale: str | None = None


@dataclass(frozen=True)
class AudioResponse:
    content: bytes
    media_type: str


class TTSProvider(Protocol):
    async def synthesize(self, request: TTSRequest) -> AudioResponse: ...


__all__ = ["AudioResponse", "LLMMessage", "LLMProvider", "LLMResponse", "TTSProvider", "TTSRequest"]
