"""Bounded PDF extraction and lightweight structure detection."""

from dataclasses import dataclass
import hashlib
import io
import re

from backend.documents.schemas import DocumentRecord, DocumentSection


class InvalidPDF(ValueError): pass
class UnextractablePDF(ValueError): pass


@dataclass(frozen=True)
class PDFLimits:
    max_bytes: int = 10 * 1024 * 1024
    max_pages: int = 200


class PDFDocumentService:
    def __init__(self, limits: PDFLimits | None = None) -> None:
        self.limits = limits or PDFLimits()
        self.documents: dict[str, DocumentRecord] = {}

    def ingest(self, filename: str, data: bytes) -> DocumentRecord:
        if len(data) > self.limits.max_bytes or not data.startswith(b"%PDF-"):
            raise InvalidPDF("File is not a valid PDF or exceeds the size limit")
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data), strict=False)
            if len(reader.pages) > self.limits.max_pages: raise InvalidPDF("PDF exceeds the page limit")
            pages = [page.extract_text() or "" for page in reader.pages]
        except InvalidPDF: raise
        except Exception as exc: raise InvalidPDF("Malformed PDF") from exc
        full = "\n".join(pages).strip()
        if not full: raise UnextractablePDF("PDF has no extractable text; OCR is required")
        sections = self._sections(pages)
        document = DocumentRecord(id=hashlib.sha256(data).hexdigest()[:16], filename=filename, pages=len(pages), sections=sections, extractable=True, status="ready")
        self.documents[document.id] = document
        return document

    def get(self, document_id: str) -> DocumentRecord:
        return self.documents[document_id]

    @staticmethod
    def _sections(pages: list[str]) -> list[DocumentSection]:
        sections: list[DocumentSection] = []
        current_title, current_text, start = "Introduction", [], 1
        for page_number, text in enumerate(pages, 1):
            for line in text.splitlines():
                line = line.strip()
                if line and len(line) < 100 and (re.match(r"^(chapter|section)\s+", line, re.I) or line.isupper()):
                    if current_text: sections.append(DocumentSection(id=f"section-{len(sections)+1}", title=current_title, text="\n".join(current_text), page_start=start, page_end=page_number-1))
                    current_title, current_text, start = line, [], page_number
                elif line: current_text.append(line)
        if current_text: sections.append(DocumentSection(id=f"section-{len(sections)+1}", title=current_title, text="\n".join(current_text), page_start=start, page_end=len(pages)))
        return sections
