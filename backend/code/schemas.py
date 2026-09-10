from enum import Enum

from pydantic import BaseModel, Field


class CodeLanguage(str, Enum):
    python = "python"
    javascript = "javascript"
    typescript = "typescript"
    java = "java"
    c = "c"
    cpp = "cpp"


class CodeStructure(BaseModel):
    language: CodeLanguage
    confidence: float = Field(ge=0, le=1)
    functions: list[str] = []
    classes: list[str] = []
    imports: list[str] = []
    control_flow: list[str] = []
    lines: int


class CodeExplanationRequest(BaseModel):
    code: str = Field(min_length=1, max_length=100_000)
    language: CodeLanguage | None = None


class CodeExplanationResponse(BaseModel):
    structure: CodeStructure
    teaching_plan: object
    delivery_plan: object
    execution_performed: bool = False
