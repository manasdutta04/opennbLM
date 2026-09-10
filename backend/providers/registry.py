"""Provider registry and factory for server-side LLM selection."""

from collections.abc import Mapping

from backend.providers.interfaces import LLMProvider


class ProviderRegistry:
    def __init__(self, providers: Mapping[str, LLMProvider] | None = None) -> None:
        self._providers = dict(providers or {})

    def register(self, name: str, provider: LLMProvider) -> None:
        self._providers[name.lower()] = provider

    def get(self, name: str) -> LLMProvider:
        try:
            return self._providers[name.lower()]
        except KeyError as exc:
            raise ValueError(f"Unknown LLM provider: {name}") from exc

    def names(self) -> tuple[str, ...]:
        return tuple(sorted(self._providers))
