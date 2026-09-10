"""Re-plan an existing concept for a learner-selected explanation style."""

from backend.teaching.engine import TeachingEngine
from backend.teaching.schemas import DifficultyLevel, DeliveryIntent, LanguagePreference, TeachingPlan, TeachingSegment, TeachingStrategy
from backend.teaching.styles import ExplanationStyle


class ExplanationStyleService:
    def regenerate(self, original: TeachingPlan, style: ExplanationStyle) -> TeachingPlan:
        strategy = {
            ExplanationStyle.teacher: TeachingStrategy.direct,
            ExplanationStyle.friend: TeachingStrategy.analogy_first,
            ExplanationStyle.ten_year_old: TeachingStrategy.simplified,
            ExplanationStyle.story: TeachingStrategy.story,
            ExplanationStyle.hype: TeachingStrategy.example_first,
            ExplanationStyle.simple: TeachingStrategy.simplified,
            ExplanationStyle.technical: TeachingStrategy.technical,
            ExplanationStyle.hinglish: TeachingStrategy.example_first,
        }[style]
        content_prefix = {
            ExplanationStyle.teacher: "Let's define the idea clearly and build it step by step.",
            ExplanationStyle.friend: "Think of this like something we already know from everyday life.",
            ExplanationStyle.ten_year_old: "Imagine this as a simple thing you could explain to a curious kid.",
            ExplanationStyle.story: "Let's follow a short story that shows why this idea matters.",
            ExplanationStyle.hype: "Here is the exciting part: this idea changes how we see the problem.",
            ExplanationStyle.simple: "Here is the shortest clear version of the idea.",
            ExplanationStyle.technical: "Let's describe the mechanism precisely and name the important parts.",
            ExplanationStyle.hinglish: "Chalo is idea ko simple Hindi-English mein samajhte hain.",
        }[style]
        segment = TeachingSegment(title=f"{style.value} explanation", content=f"{content_prefix} The topic is {original.topic}.", intent=DeliveryIntent.explain, important_concepts=[original.topic], emphasis_candidates=[original.topic])
        return TeachingPlan(topic=original.topic, learner_level=original.learner_level, language=LanguagePreference.hinglish if style == ExplanationStyle.hinglish else original.language, explanation_strategy=strategy, teaching_objective=original.teaching_objective, segments=[segment], examples=[f"A new {style.value} example for {original.topic}"], analogies=original.analogies, important_concepts=original.important_concepts, emphasis_candidates=[original.topic], recap=f"In this {style.value} version, remember the core idea of {original.topic}.", knowledge_check=original.knowledge_check)
