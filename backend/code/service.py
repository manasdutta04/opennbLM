from backend.code.analyzer import CodeAnalyzer
from backend.code.schemas import CodeExplanationRequest, CodeExplanationResponse
from backend.delivery.engine import DeliveryEngine
from backend.teaching.engine import TeachingEngine


class CodeExplanationService:
    def __init__(self, teaching: TeachingEngine | None = None) -> None:
        self.analyzer, self.teaching = CodeAnalyzer(), teaching or TeachingEngine()

    async def explain(self, request: CodeExplanationRequest) -> CodeExplanationResponse:
        structure = self.analyzer.detect(request.code, request.language)
        plan = await self.teaching.create_plan(f"Explain this {structure.language.value} code progressively. Structure: {structure.model_dump_json()}. Code:\n{request.code}")
        return CodeExplanationResponse(structure=structure, teaching_plan=plan, delivery_plan=DeliveryEngine().create_plan(plan))
