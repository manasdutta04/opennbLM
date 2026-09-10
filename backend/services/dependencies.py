"""Dependency construction boundary for application services."""

from backend.providers.interfaces import LLMProvider, TTSProvider
from backend.storage.interfaces import MemoryStore


class ServiceContainer:
    """Holds provider-agnostic dependencies; concrete wiring comes later."""

    def __init__(self, llm: LLMProvider | None = None, tts: TTSProvider | None = None, memory: MemoryStore | None = None) -> None:
        self.llm = llm
        self.tts = tts
        self.memory = memory
