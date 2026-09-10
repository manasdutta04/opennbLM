"""Orchestrates text teaching, delivery planning, and optional speech."""

from backend.delivery.engine import DeliveryEngine
from backend.memory.sqlite_store import SQLiteMemoryStore
from backend.pipeline.schemas import AudioStatus, ConversationRequest, ConversationResponse
from backend.providers.interfaces import TTSRequest
from backend.providers.registry import ProviderRegistry
from backend.providers.rumik import RumikProvider, RumikUnavailable
from backend.teaching.engine import TeachingEngine


class ConversationService:
    def __init__(self, llms: ProviderRegistry, memory: SQLiteMemoryStore | None = None, tts: RumikProvider | None = None) -> None:
        self.llms, self.memory, self.tts = llms, memory, tts

    async def respond(self, request: ConversationRequest) -> ConversationResponse:
        memories = self.memory.retrieve(request.user_id, request.message) if self.memory else []
        provider_name = request.provider or ("ollama" if "ollama" in self.llms.names() else None)
        if provider_name is None or not self.llms.names():
            return ConversationResponse(explanation="No language model is configured. Configure a provider such as Ollama or Groq to continue.", segments=[], teaching_strategy="unavailable", language=request.language.value, delivery_intents=[], teaching_plan=TeachingEngine.fallback_plan(request.message, level=request.level, language=request.language), delivery_plan=DeliveryEngine().create_plan(TeachingEngine.fallback_plan(request.message, level=request.level, language=request.language)), audio=AudioStatus(status="not_requested"), setup_message="Configure an LLM provider before starting a conversation.")
        plan = await TeachingEngine(self.llms.get(provider_name)).create_plan(request.message, level=request.level, language=request.language)
        delivery = DeliveryEngine().create_plan(plan)
        audio = AudioStatus(status="unavailable")
        if self.tts:
            try:
                result = await self.tts.synthesize(TTSRequest(text=" ".join(segment.text for segment in delivery.segments), voice=request.voice, locale=request.language.value))
                audio = AudioStatus(status="ready", media_type=result.media_type)
            except RumikUnavailable:
                audio = AudioStatus(status="unavailable")
        return ConversationResponse(explanation="\n\n".join(segment.content for segment in plan.segments), segments=[segment.content for segment in plan.segments], teaching_strategy=plan.explanation_strategy.value, language=plan.language.value, delivery_intents=[segment.intent.value for segment in plan.segments], teaching_plan=plan, delivery_plan=delivery, audio=audio, memory_context_used=[f"{memory.key}: {memory.value}" for memory in memories])
