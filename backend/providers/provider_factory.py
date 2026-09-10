import os
from backend.providers.registry import ProviderRegistry
from backend.providers.groq_provider import GroqProvider
from backend.providers.ollama_provider import OllamaProvider

def build_registry() -> ProviderRegistry:
    registry = ProviderRegistry({"ollama": OllamaProvider()})
    if key := os.getenv("OPENNBLM_GROQ_API_KEY"): registry.register("groq", GroqProvider(key))
    return registry
