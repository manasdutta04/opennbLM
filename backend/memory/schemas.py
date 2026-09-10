from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class MemoryKind(str, Enum):
    preference = "preference"
    strength = "strength"
    weakness = "weakness"
    topic = "topic"


class MemoryRecord(BaseModel):
    id: int | None = None
    user_id: str = Field(min_length=1)
    kind: MemoryKind
    key: str = Field(min_length=1)
    value: str = Field(min_length=1)
    confidence: float = Field(default=1.0, ge=0, le=1)
    source: str = "user"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class MemoryCandidate(BaseModel):
    kind: MemoryKind
    key: str = Field(min_length=1)
    value: str = Field(min_length=1)
    confidence: float = Field(ge=0, le=1)
    reason: str = Field(min_length=1)


class ConversationMessage(BaseModel):
    user_id: str = Field(min_length=1)
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str = Field(min_length=1)


class TopicRecord(BaseModel):
    user_id: str = Field(min_length=1)
    topic: str = Field(min_length=1)
    difficulty: str | None = None


class ProgressRecord(BaseModel):
    user_id: str = Field(min_length=1)
    topic: str = Field(min_length=1)
    status: str = "started"
    notes: str = ""
