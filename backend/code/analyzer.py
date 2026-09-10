"""Conservative language/structure detection without parsing or executing code."""

import re

from backend.code.schemas import CodeLanguage, CodeStructure


class CodeAnalyzer:
    def detect(self, code: str, hint: CodeLanguage | None = None) -> CodeStructure:
        if hint:
            language, confidence = hint, 1.0
        else:
            scores = {CodeLanguage.python: len(re.findall(r"\b(def|import|from|elif|None|True|False)\b|:\s*$", code, re.M)), CodeLanguage.javascript: len(re.findall(r"\b(const|let|var|console\.log|require)\b|=>", code)), CodeLanguage.typescript: len(re.findall(r"\b(interface|type)\b|:\s*(string|number|boolean)\b", code)), CodeLanguage.java: len(re.findall(r"\b(public|private|class|System\.out)\b", code)), CodeLanguage.c: len(re.findall(r"#include\s*<|\bprintf\s*\(", code)), CodeLanguage.cpp: len(re.findall(r"#include\s*<iostream>|\bstd::|\bcout\b", code))}
            language, score = max(scores.items(), key=lambda item: item[1])
            confidence = min(0.99, 0.5 + score * 0.1) if score else 0.0
            if confidence < 0.7: raise ValueError("Could not confidently detect the code language")
        return CodeStructure(language=language, confidence=confidence, functions=self._names(code, language, "function"), classes=self._names(code, language, "class"), imports=self._imports(code, language), control_flow=self._control_flow(code), lines=len(code.splitlines()))

    @staticmethod
    def _names(code: str, language: CodeLanguage, kind: str) -> list[str]:
        pattern = r"\bdef\s+(\w+)" if language == CodeLanguage.python and kind == "function" else r"\b(?:function|class)\s+(\w+)" if kind in {"function", "class"} else r"\bclass\s+(\w+)"
        return re.findall(pattern, code)

    @staticmethod
    def _imports(code: str, language: CodeLanguage) -> list[str]:
        return re.findall(r"^(?:import|from|#include)\s+([^\s;]+)", code, re.M)

    @staticmethod
    def _control_flow(code: str) -> list[str]:
        return sorted(set(re.findall(r"\b(if|else|elif|for|while|try|catch|switch)\b", code)))
