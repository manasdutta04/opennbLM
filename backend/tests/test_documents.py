import pytest

from backend.documents.pdf_service import InvalidPDF, PDFDocumentService


def test_rejects_malformed_and_oversized_files() -> None:
    service = PDFDocumentService()
    with pytest.raises(InvalidPDF): service.ingest("bad.pdf", b"not a pdf")
    with pytest.raises(InvalidPDF): service.ingest("large.pdf", b"%PDF-" + b"x" * service.limits.max_bytes)


def test_rejects_empty_or_unextractable_pdf() -> None:
    service = PDFDocumentService()
    # A valid header without a valid PDF body is safely treated as malformed.
    with pytest.raises(InvalidPDF): service.ingest("empty.pdf", b"%PDF-1.7")


def test_section_parser_creates_navigation_units() -> None:
    sections = PDFDocumentService._sections(["CHAPTER ONE\nBasics\ntext", "CHAPTER TWO\nAdvanced\ntext"])
    assert [section.title for section in sections] == ["CHAPTER ONE", "CHAPTER TWO"]
