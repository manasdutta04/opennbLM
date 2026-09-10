"""Validated multilingual interaction policy for the current Rumik release."""
from enum import Enum
from backend.teaching.schemas import TeachingPlan

class SupportedLanguage(str, Enum):
    english = "English"
    hindi = "Hindi"
    bengali = "Bengali"
    telugu = "Telugu"
    tamil = "Tamil"
    kannada = "Kannada"
    punjabi = "Punjabi"

class CodeSwitchPreference(str, Enum):
    never = "never"
    useful_only = "useful_only"
    preferred = "preferred"

class MultilingualPolicy:
    def should_code_switch(self, plan: TeachingPlan, preference: CodeSwitchPreference) -> bool:
        if preference == CodeSwitchPreference.never: return False
        if preference == CodeSwitchPreference.preferred: return True
        return any(term in " ".join(plan.important_concepts).lower() for term in ("api", "model", "token", "algorithm", "code"))
    def segment_languages(self, plan: TeachingPlan, preference: CodeSwitchPreference) -> list[str]:
        return [f"{plan.language.value} + English" if self.should_code_switch(plan, preference) else plan.language.value for _ in plan.segments]
