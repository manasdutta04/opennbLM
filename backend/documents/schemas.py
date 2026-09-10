from pydantic import BaseModel, Field


class DocumentSection(BaseModel):
    id: str
    title: str
    text: str
    page_start: int
    page_end: int


class DocumentRecord(BaseModel):
    id: str
    filename: str
    pages: int
    sections: list[DocumentSection] = Field(default_factory=list)
    extractable: bool
    status: str


class LessonRequest(BaseModel):
    document_id: str
    section_id: str


class DocumentLesson(BaseModel):
    document: DocumentRecord
    section: DocumentSection
    teaching_plan: object
    delivery_plan: object
    recap: str
    knowledge_check: list[str]
