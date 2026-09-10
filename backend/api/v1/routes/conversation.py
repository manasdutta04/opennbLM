from fastapi import APIRouter, Depends

from backend.pipeline.schemas import ConversationRequest, ConversationResponse

router = APIRouter()


def get_conversation_service():
    raise RuntimeError("Conversation service dependencies must be configured by the application")


@router.post("/conversation", response_model=ConversationResponse)
async def conversation(request: ConversationRequest, service=Depends(get_conversation_service)) -> ConversationResponse:
    return await service.respond(request)
