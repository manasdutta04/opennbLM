import pytest

from backend.pipeline.schemas import ConversationRequest
from backend.pipeline.service import ConversationService
from backend.providers.mock import MockLLMProvider
from backend.providers.registry import ProviderRegistry


@pytest.mark.anyio
async def test_pipeline_returns_structured_text_without_tts() -> None:
    service = ConversationService(ProviderRegistry({"mock": MockLLMProvider()}))
    result = await service.respond(ConversationRequest(user_id="u1", message="What is gravity?", provider="mock"))
    assert result.explanation
    assert result.audio.status == "unavailable"
    assert result.delivery_plan.segments


@pytest.mark.anyio
async def test_pipeline_explains_missing_configuration() -> None:
    result = await ConversationService(ProviderRegistry()).respond(ConversationRequest(user_id="u1", message="Explain photosynthesis"))
    assert result.setup_message
    assert result.audio.status == "not_requested"
