import pytest

from backend.providers.interfaces import LLMMessage
from backend.providers.mock import MockLLMProvider


@pytest.mark.anyio
async def test_mock_provider_supports_structured_generation() -> None:
    result = await MockLLMProvider().chat([LLMMessage("user", "return json")], json_schema={"type": "object"})
    assert result.structured == {"ok": True}
    assert result.model == "mock"


@pytest.mark.anyio
async def test_mock_provider_streams() -> None:
    chunks = [chunk async for chunk in MockLLMProvider("hello").stream([])]
    assert chunks == ["hello"]
