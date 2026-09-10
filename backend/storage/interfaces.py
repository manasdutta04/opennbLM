"""Provider-agnostic memory storage contract."""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class Memory:
    key: str
    value: str
    user_id: str


class MemoryStore(Protocol):
    async def save(self, memory: Memory) -> None: ...

    async def search(self, user_id: str, query: str, *, limit: int = 5) -> Sequence[Memory]: ...

    async def delete(self, user_id: str, key: str) -> None: ...
