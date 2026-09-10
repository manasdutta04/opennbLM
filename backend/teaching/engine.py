"""Teaching-plan orchestration with validation and deterministic fallback."""

import json
from collections.abc import Mapping
from typing import Any

from backend.providers.contracts import ChatProvider, GenerationConfig
from backend.providers.interfaces import LLMMessage
from backend.teaching.schemas import DifficultyLevel, DeliveryIntent, LanguagePreference, TeachingPlan, TeachingSegment, TeachingStrategy


class TeachingEngine:
    def __init__(self, provider: ChatProvider | None = None) -> None:
        self.provider = provider

    async def create_plan(self, request: str, *, level: DifficultyLevel = DifficultyLevel.beginner, language: LanguagePreference = LanguagePreference.english) -> TeachingPlan:
        if self.provider is not None:
            try:
                result = await self.provider.chat(
                    [LLMMessage(role="user", content=request)],
                    config=GenerationConfig(temperature=0),
                    json_schema=TeachingPlan.model_json_schema(),
                )
                payload: Any = json.loads(result.text) if isinstance(result.text, str) else result.text
                return TeachingPlan.model_validate(payload)
            except (ValueError, TypeError, json.JSONDecodeError):
                pass
        return self.fallback_plan(request, level=level, language=language)

    @staticmethod
    def fallback_plan(request: str, *, level: DifficultyLevel, language: LanguagePreference) -> TeachingPlan:
        topic = request.strip().rstrip("?") or "the requested topic"
        segment = TeachingSegment(
            title="Core idea",
            content=f"We will build an understanding of {topic} from its basic meaning.",
            intent=DeliveryIntent.explain,
            important_concepts=[topic],
            emphasis_candidates=[f"definition of {topic}"],
        )
        return TeachingPlan(
            topic=topic,
            learner_level=level,
            language=language,
            explanation_strategy=TeachingStrategy.simplified if level == DifficultyLevel.beginner else TeachingStrategy.step_by_step,
            teaching_objective=f"Understand the central idea of {topic} and explain it in your own words.",
            segments=[segment],
            important_concepts=[topic],
            emphasis_candidates=[f"definition of {topic}"],
            recap=f"{topic} is the central idea we introduced and connected to its basic meaning.",
            knowledge_check=[f"In your own words, what is {topic}?"] ,
        )
