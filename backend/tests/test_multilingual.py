from backend.teaching.engine import TeachingEngine
from backend.teaching.multilingual import CodeSwitchPreference, MultilingualPolicy, SupportedLanguage

def test_only_verified_rumik_languages_are_exposed() -> None:
    assert SupportedLanguage.hindi.value == "Hindi"
    assert "French" not in {language.value for language in SupportedLanguage}

def test_code_switching_is_not_random() -> None:
    policy = MultilingualPolicy()
    plain = TeachingEngine.fallback_plan("photosynthesis", level="beginner", language="english")
    technical = TeachingEngine.fallback_plan("API model token", level="beginner", language="english")
    assert not policy.should_code_switch(plain, CodeSwitchPreference.useful_only)
    assert policy.should_code_switch(technical, CodeSwitchPreference.useful_only)

def test_code_switching_can_be_disabled() -> None:
    plan = TeachingEngine.fallback_plan("API", level="beginner", language="english")
    assert not MultilingualPolicy().should_code_switch(plan, CodeSwitchPreference.never)
