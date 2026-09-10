"""Conservative candidate extraction; persistence always requires approval."""

from backend.memory.schemas import MemoryCandidate, MemoryKind


class MemoryExtractionService:
    ALLOWED_KEYS = {"preferred_language", "preferred_explanation_style", "difficulty_preference", "known_strength", "known_weak_concept", "explicit_preference"}

    def extract(self, text: str) -> list[MemoryCandidate]:
        lower = text.lower()
        candidates: list[MemoryCandidate] = []
        patterns = [("preferred_language", "language", MemoryKind.preference), ("preferred_explanation_style", "explain", MemoryKind.preference), ("difficulty_preference", "difficulty", MemoryKind.preference)]
        for key, marker, kind in patterns:
            if marker in lower and ":" in text:
                value = text.split(":", 1)[1].strip()
                if value: candidates.append(MemoryCandidate(kind=kind, key=key, value=value, confidence=0.8, reason="explicit preference statement"))
        return candidates

    def approve(self, candidate: MemoryCandidate) -> bool:
        return candidate.key in self.ALLOWED_KEYS and candidate.confidence >= 0.7
