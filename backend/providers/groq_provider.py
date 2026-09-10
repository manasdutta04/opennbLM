"""Groq implementation of the common chat contract."""
from collections.abc import AsyncIterator, Mapping, Sequence
import httpx
from backend.providers.contracts import GenerationConfig, GenerationResult
from backend.providers.interfaces import LLMMessage

class GroqProvider:
    def __init__(self, api_key: str, default_model: str = "llama-3.1-8b-instant") -> None:
        self.api_key, self.default_model = api_key, default_model
    async def chat(self, messages: Sequence[LLMMessage], *, model: str | None = None, config: GenerationConfig | None = None, json_schema: Mapping[str, object] | None = None) -> GenerationResult:
        body: dict[str, object] = {"model": model or self.default_model, "messages": [m.__dict__ for m in messages]}
        if config and config.temperature is not None: body["temperature"] = config.temperature
        if config and config.max_tokens is not None: body["max_tokens"] = config.max_tokens
        if json_schema is not None: body["response_format"] = {"type": "json_object"}
        async with httpx.AsyncClient(base_url="https://api.groq.com/openai/v1", headers={"Authorization": f"Bearer {self.api_key}"}, timeout=60) as client:
            response = await client.post("/chat/completions", json=body); response.raise_for_status(); data = response.json()
        return GenerationResult(data["choices"][0]["message"]["content"], str(body["model"]), data.get("usage", {}))
    def stream(self, messages: Sequence[LLMMessage], *, model: str | None = None, config: GenerationConfig | None = None) -> AsyncIterator[str]:
        async def run() -> AsyncIterator[str]: yield (await self.chat(messages, model=model, config=config)).text
        return run()
