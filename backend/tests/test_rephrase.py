from backend.teaching.engine import TeachingEngine
from backend.teaching.rephrase import ExplanationStyleService
from backend.teaching.styles import ExplanationStyle


def test_style_changes_plan_but_preserves_topic() -> None:
    original = TeachingEngine.fallback_plan("attention mechanisms", level="beginner", language="english")
    service = ExplanationStyleService()
    technical = service.regenerate(original, ExplanationStyle.technical)
    story = service.regenerate(original, ExplanationStyle.story)
    assert technical.topic == story.topic == original.topic
    assert technical.explanation_strategy != story.explanation_strategy
    assert technical.segments[0].content != story.segments[0].content


def test_hinglish_changes_language() -> None:
    original = TeachingEngine.fallback_plan("recursion", level="beginner", language="english")
    result = ExplanationStyleService().regenerate(original, ExplanationStyle.hinglish)
    assert result.language.value == "hinglish"
