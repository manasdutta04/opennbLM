"""Deterministic, context-sensitive conversion of teaching plans to speech plans."""

import re

from backend.delivery.schemas import DeliveryEmotion, DeliveryPace, DeliveryPlan, DeliverySegment
from backend.teaching.schemas import DeliveryIntent, TeachingPlan, TeachingSegment


class DeliveryEngine:
    def create_plan(self, teaching_plan: TeachingPlan) -> DeliveryPlan:
        return DeliveryPlan(topic=teaching_plan.topic, segments=[self._segment(s) for s in teaching_plan.segments])

    def _segment(self, segment: TeachingSegment) -> DeliverySegment:
        text = segment.content
        intent = segment.intent
        emotion = {
            DeliveryIntent.explain: DeliveryEmotion.calm,
            DeliveryIntent.illustrate: DeliveryEmotion.conversational,
            DeliveryIntent.ask: DeliveryEmotion.inviting,
            DeliveryIntent.recap: DeliveryEmotion.calm,
            DeliveryIntent.check: DeliveryEmotion.inviting,
        }[intent]
        pace = DeliveryPace.slow if self._difficult(text) else DeliveryPace.medium
        if intent == DeliveryIntent.ask or intent == DeliveryIntent.check:
            pace = DeliveryPace.medium
        emphasis = list(dict.fromkeys(segment.emphasis_candidates + segment.important_concepts))
        if self._surprising(text):
            emotion = DeliveryEmotion.curious
        if self._warning(text):
            emotion = DeliveryEmotion.serious
        if intent == DeliveryIntent.recap:
            emotion, pace = DeliveryEmotion.calm, DeliveryPace.medium
        return DeliverySegment(
            text=text,
            emotion=emotion,
            pace=pace,
            emphasis=emphasis,
            pause_before=bool(emphasis),
            pause_after=intent in {DeliveryIntent.explain, DeliveryIntent.recap, DeliveryIntent.check},
            language="en",
            pronunciation_terms=self._pronunciation_terms(text),
            rumik_instructions=self._rumik_instructions(emotion, pace, emphasis),
        )

    @staticmethod
    def _difficult(text: str) -> bool:
        return len(text.split()) > 25 or any(token in text.lower() for token in ("however", "therefore", "abstract", "recursion", "technical"))

    @staticmethod
    def _surprising(text: str) -> bool:
        return any(token in text.lower() for token in ("surprisingly", "counterintuitive", "interesting insight"))

    @staticmethod
    def _warning(text: str) -> bool:
        return any(token in text.lower() for token in ("warning", "caveat", "careful", "do not", "beware"))

    @staticmethod
    def _pronunciation_terms(text: str) -> list[str]:
        return re.findall(r"\b[A-Z][A-Za-z0-9_-]{2,}\b|\b(?:API|LLM|SQL|HTTP|Rumik)\b", text)

    @staticmethod
    def _rumik_instructions(emotion: DeliveryEmotion, pace: DeliveryPace, emphasis: list[str]) -> list[str]:
        instructions = [f"emotion={emotion.value}", f"pace={pace.value}"]
        if emphasis:
            instructions.append("emphasize=" + ",".join(emphasis))
        return instructions
