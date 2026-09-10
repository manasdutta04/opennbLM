import httpx
import pytest

from backend.providers.interfaces import TTSRequest
from backend.providers.rumik import MockTTSProvider, RumikProvider, RumikSettings, RumikUnavailable


@pytest.mark.anyio
async def test_rumik_posts_only_documented_speech_fields() -> None:
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured.update(request.read())
        return httpx.Response(200, content=b"wav", headers={"content-type": "audio/wav"})

    async with httpx.AsyncClient(base_url="http://rumik", transport=httpx.MockTransport(handler)) as client:
        result = await RumikProvider(RumikSettings(endpoint="http://rumik"), client).synthesize(TTSRequest("hello", voice="Aisha"))
    assert result.content == b"wav"
    assert result.media_type == "audio/wav"


@pytest.mark.anyio
async def test_unavailable_rumik_is_normalized() -> None:
    async with httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(503))) as client:
        with pytest.raises(RumikUnavailable):
            await RumikProvider(client=client).synthesize(TTSRequest("hello"))


@pytest.mark.anyio
async def test_mock_tts_provider() -> None:
    result = await MockTTSProvider().synthesize(TTSRequest("hello"))
    assert result.content.startswith(b"RIFF")
