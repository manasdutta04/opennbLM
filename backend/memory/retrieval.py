"""Replaceable retrieval boundary; V1 uses SQLite text matching."""

from typing import Protocol

from backend.memory.schemas import MemoryRecord


class MemoryRetriever(Protocol):
    def retrieve(self, user_id: str, query: str, limit: int = 10) -> list[MemoryRecord]: ...
