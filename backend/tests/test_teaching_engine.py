import pytest
from pydantic import ValidationError

from backend.providers.interfaces import LLMMessage
from backend.teaching.engine import TeachingEngine
from backend.teaching.schemas import DifficultyLevel, DeliveryIntent, TeachingPlan


class FakeProvider:
    def __init__(self, text: str): self.text = text
    async def chat(self, messages, **kwargs):
        return type("Result", (), {"text": self.text})()


def test_schema_rejects_empty_plan() -> None:
    with pytest.raises(ValidationError): TeachingPlan.model_validate({})


@pytest.mark.anyio
async def test_malformed_llm_output_uses_fallback() -> None:
    plan = await TeachingEngine(FakeProvider("not json")).create_plan("fractions")
    assert plan.topic == "fractions"
    assert plan.explanation_strategy.value == "simplified"


@pytest.mark.anyio
async def test_simple_beginner_question() -> None:
    plan = await TeachingEngine().create_plan("What is gravity?")
    assert plan.learner_level == DifficultyLevel.beginner
    assert plan.segments[0].intent == DeliveryIntent.explain


@pytest.mark.anyio
async def test_technical_question_can_use_step_by_step_fallback() -> None:
    plan = await TeachingEngine().create_plan("Explain compiler optimization", level=DifficultyLevel.advanced)
    assert plan.explanation_strategy.value == "step_by_step"


@pytest.mark.anyio
async def test_valid_structured_output_is_validated_and_returned() -> None:
    value = TeachingEngine().fallback_plan("photosynthesis", level=DifficultyLevel.beginner, language="english")
    plan = await TeachingEngine(FakeProvider(value.model_dump_json())).create_plan("ignored")
    assert plan.topic == "photosynthesis"
