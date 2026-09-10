"""Ollama adapter extension point."""

from backend.providers.groq import GroqProvider


class OllamaProvider(GroqProvider):
    def __init__(self, default_model: str = "llama3.2") -> None:
        super().__init__(api_key="ollama", default_model=default_model)
