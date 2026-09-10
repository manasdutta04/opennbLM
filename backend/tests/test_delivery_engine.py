from backend.delivery.engine import DeliveryEngine
from backend.delivery.schemas import DeliveryEmotion, DeliveryPace
from backend.teaching.engine import TeachingEngine
from backend.teaching.schemas import DeliveryIntent, TeachingSegment


def plan_segment(text: str, intent: DeliveryIntent, **kwargs) -> TeachingSegment:
    return TeachingSegment(title="test", content=text, intent=intent, **kwargs)


def test_definition_is_calm_and_clear() -> None:
    plan = TeachingEngine.fallback_plan("attention", level="beginner", language="english")
    delivery = DeliveryEngine().create_plan(plan)
    assert delivery.segments[0].emotion == DeliveryEmotion.calm


def test_difficult_concept_is_slower_and_emphasized() -> None:
    teaching = TeachingEngine.fallback_plan("recursion", level="advanced", language="english")
    teaching.segments[0] = plan_segment("This technical concept is abstract and therefore needs careful explanation.", DeliveryIntent.explain, important_concepts=["technical concept"])
    segment = DeliveryEngine().create_plan(teaching).segments[0]
    assert segment.pace == DeliveryPace.slow
    assert "technical concept" in segment.emphasis


def test_questions_are_inviting_without_forced_vocalization() -> None:
    teaching = TeachingEngine.fallback_plan("gravity", level="beginner", language="english")
    teaching.segments[0] = plan_segment("What do you think gravity does?", DeliveryIntent.check)
    segment = DeliveryEngine().create_plan(teaching).segments[0]
    assert segment.emotion == DeliveryEmotion.inviting
    assert segment.vocalizations == []


def test_warnings_are_serious_and_terms_are_marked() -> None:
    teaching = TeachingEngine.fallback_plan("API", level="beginner", language="english")
    teaching.segments[0] = plan_segment("Warning: do not expose the API key.", DeliveryIntent.explain)
    segment = DeliveryEngine().create_plan(teaching).segments[0]
    assert segment.emotion == DeliveryEmotion.serious
    assert "API" in segment.pronunciation_terms
