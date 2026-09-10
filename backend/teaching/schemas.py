from enum import Enum

from pydantic import BaseModel, Field


class TeachingStrategy(str, Enum):
    direct = "direct"
    analogy_first = "analogy_first"
    example_first = "example_first"
    story = "story"
    step_by_step = "step_by_step"
    socratic = "socratic"
    simplified = "simplified"
    technical = "technical"


class DifficultyLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class LanguagePreference(str, Enum):
    english = "english"
    hindi = "hindi"
    hinglish = "hinglish"


class DeliveryIntent(str, Enum):
    explain = "explain"
    illustrate = "illustrate"
    ask = "ask"
    recap = "recap"
    check = "check"


class TeachingSegment(BaseModel):
    title: str = Field(min_length=1)
    content: str = Field(min_length=1)
    intent: DeliveryIntent
    examples: list[str] = Field(default_factory=list)
    analogies: list[str] = Field(default_factory=list)
    important_concepts: list[str] = Field(default_factory=list)
    emphasis_candidates: list[str] = Field(default_factory=list)


class TeachingPlan(BaseModel):
    topic: str = Field(min_length=1)
    learner_level: DifficultyLevel
    language: LanguagePreference = LanguagePreference.english
    explanation_strategy: TeachingStrategy
    teaching_objective: str = Field(min_length=1)
    segments: list[TeachingSegment] = Field(min_length=1)
    examples: list[str] = Field(default_factory=list)
    analogies: list[str] = Field(default_factory=list)
    important_concepts: list[str] = Field(default_factory=list)
    emphasis_candidates: list[str] = Field(default_factory=list)
    recap: str = Field(min_length=1)
    knowledge_check: list[str] = Field(min_length=1)

