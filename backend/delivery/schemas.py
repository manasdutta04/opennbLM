from enum import Enum

from pydantic import BaseModel, Field


class DeliveryEmotion(str, Enum):
    calm = "calm"
    curious = "curious"
    conversational = "conversational"
    excited = "excited"
    inviting = "inviting"
    serious = "serious"


class DeliveryPace(str, Enum):
    slow = "slow"
    medium = "medium"
    fast = "fast"


class DeliverySegment(BaseModel):
    text: str = Field(min_length=1)
    emotion: DeliveryEmotion
    pace: DeliveryPace
    emphasis: list[str] = Field(default_factory=list)
    pause_before: bool = False
    pause_after: bool = False
    language: str = "en"
    code_switch_terms: list[str] = Field(default_factory=list)
    vocalizations: list[str] = Field(default_factory=list)
    pronunciation_terms: list[str] = Field(default_factory=list)
    rumik_instructions: list[str] = Field(default_factory=list)


class DeliveryPlan(BaseModel):
    topic: str = Field(min_length=1)
    segments: list[DeliverySegment] = Field(min_length=1)

