import inspect

from backend.providers.interfaces import LLMProvider, TTSProvider
from backend.storage.interfaces import MemoryStore


def test_provider_contracts_are_protocols() -> None:
    assert getattr(LLMProvider, "_is_protocol", False)
    assert getattr(TTSProvider, "_is_protocol", False)
    assert getattr(MemoryStore, "_is_protocol", False)


def test_async_contracts_are_declared() -> None:
    assert inspect.iscoroutinefunction(LLMProvider.complete)
    assert inspect.iscoroutinefunction(TTSProvider.synthesize)
    assert inspect.iscoroutinefunction(MemoryStore.save)
