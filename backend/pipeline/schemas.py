from pydantic import BaseModel, Field

from backend.delivery.schemas import DeliveryPlan
from backend.teaching.schemas import DifficultyLevel, LanguagePreference, TeachingPlan


class ConversationRequest(BaseModel):
    user_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
    level: DifficultyLevel = DifficultyLevel.beginner
    language: LanguagePreference = LanguagePreference.english
    provider: str | None = None
    voice: str | None = None


class AudioStatus(BaseModel):
    status: str
    media_type: str | None = None


class ConversationResponse(BaseModel):
    explanation: str
    segments: list[str]
    teaching_strategy: str
    language: str
    delivery_intents: list[str]
    teaching_plan: TeachingPlan
    delivery_plan: DeliveryPlan
    audio: AudioStatus
    memory_context_used: list[str] = []
    setup_message: str | None = None
