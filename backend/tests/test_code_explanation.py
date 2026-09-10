import pytest

from backend.code.analyzer import CodeAnalyzer
from backend.code.schemas import CodeExplanationRequest, CodeLanguage
from backend.code.service import CodeExplanationService


def test_detect_python_structure() -> None:
    structure = CodeAnalyzer().detect("import math\ndef area(r):\n    return math.pi * r * r\n")
    assert structure.language == CodeLanguage.python
    assert "area" in structure.functions
    assert structure.imports


def test_unknown_language_is_rejected() -> None:
    with pytest.raises(ValueError): CodeAnalyzer().detect("just some words")


@pytest.mark.anyio
async def test_explanation_does_not_execute_code() -> None:
    result = await CodeExplanationService().explain(CodeExplanationRequest(code="print('hello')", language=CodeLanguage.python))
    assert result.execution_performed is False
    assert result.structure.language == CodeLanguage.python
