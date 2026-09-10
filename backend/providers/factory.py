"""Environment-driven provider construction without exposing secrets."""

import os

from backend.providers.groq import GroqProvider
from backend.providers.ollama import OllamaProvider
from backend.providers.registry import ProviderRegistry


def build_registry() -> ProviderRegistry:
    registry = ProviderRegistry()
    if key := os.getenv("OPENNBLM_GROQ_API_KEY"):
        registry.register("groq", GroqProvider(key))
    registry.register("ollama", OllamaProvider())
    return registry
