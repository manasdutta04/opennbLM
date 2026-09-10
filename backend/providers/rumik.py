"""Isolated adapter for the documented local Rumik-OSS 1 server."""

from dataclasses import dataclass

import httpx

from backend.providers.interfaces import AudioResponse, TTSProvider, TTSRequest


@dataclass(frozen=True)
class RumikSettings:
    endpoint: str = "http://127.0.0.1:6006"
    speaker: str = "Ira"
    temperature: float = 0.8
    top_k: int = 30
    max_new_tokens: int = 2048


class RumikUnavailable(RuntimeError):
    """Raised when the local Rumik server cannot be reached."""


class RumikProvider:
    def __init__(self, settings: RumikSettings | None = None, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings or RumikSettings()
        self._client = client

    async def synthesize(self, request: TTSRequest) -> AudioResponse:
        body = {
            "speaker": request.voice or self.settings.speaker,
            "input": request.text,
            "temperature": self.settings.temperature,
            "top_k": self.settings.top_k,
            "max_new_tokens": self.settings.max_new_tokens,
        }
        try:
            if self._client is not None:
                response = await self._client.post("/v1/audio/speech", json=body)
            else:
                async with httpx.AsyncClient(base_url=self.settings.endpoint, timeout=60) as client:
                    response = await client.post("/v1/audio/speech", json=body)
            response.raise_for_status()
            return AudioResponse(content=response.content, media_type=response.headers.get("content-type", "audio/wav"))
        except (httpx.HTTPError, OSError) as exc:
            raise RumikUnavailable("Rumik local server is unavailable") from exc

    async def health_check(self) -> bool:
        try:
            if self._client is not None:
                response = await self._client.get("/")
            else:
                async with httpx.AsyncClient(base_url=self.settings.endpoint, timeout=5) as client:
                    response = await client.get("/")
            return response.is_success
        except (httpx.HTTPError, OSError):
            return False


class MockTTSProvider:
    def __init__(self, content: bytes = b"RIFF-mock-audio", media_type: str = "audio/wav") -> None:
        self.content, self.media_type = content, media_type

    async def synthesize(self, request: TTSRequest) -> AudioResponse:
        return AudioResponse(content=self.content, media_type=self.media_type)

