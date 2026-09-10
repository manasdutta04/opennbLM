from backend.delivery.engine import DeliveryEngine
from backend.documents.schemas import DocumentLesson, LessonRequest
from backend.documents.pdf_service import PDFDocumentService
from backend.teaching.engine import TeachingEngine


class DocumentLessonService:
    def __init__(self, documents: PDFDocumentService, teaching: TeachingEngine | None = None) -> None:
        self.documents, self.teaching = documents, teaching or TeachingEngine()

    async def teach_section(self, request: LessonRequest) -> DocumentLesson:
        document = self.documents.get(request.document_id)
        section = next(item for item in document.sections if item.id == request.section_id)
        plan = await self.teaching.create_plan(f"Teach this document section titled {section.title}: {section.text}")
        return DocumentLesson(document=document, section=section, teaching_plan=plan, delivery_plan=DeliveryEngine().create_plan(plan), recap=plan.recap, knowledge_check=plan.knowledge_check)
