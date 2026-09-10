# Teaching Engine

opennbLM is not a direct LLM-to-TTS pipeline. The Teaching Engine turns a learner question into a structured teaching plan, renders a natural conversational lesson, and derives a delivery plan for Rumik.

## Flow

`question → TeachingPlan → conversational response + DeliveryPlan → Rumik segments → learner feedback/memory`

`@opennblm/teaching-engine` depends only on the abstract `LLMProvider` interface. It does not import Groq, OpenAI, Gemini, OpenRouter, Ollama, or any other vendor adapter.

## TeachingPlan

The validated plan contains topic, learner level, objective, key concepts, progressive explanation steps, examples, analogy, misconception risks, comprehension check, and summary. The normal UI receives the rendered response rather than raw JSON.

The engine supports beginner, intermediate, and advanced levels. The default approach is concise: establish intuition, progress through a few concepts, use an example, surface a likely misconception, and check understanding.

## DeliveryPlan

Delivery planning is separate from explanation planning. It describes tone, pace, emphasis, pauses, energy, language, Rumik speaker, vocalization opportunities, and segment instructions. The current deterministic delivery planner defaults to Ira and uses the learner level to choose tone, pace, and energy; later settings can override these choices.

## Validation and fallback

The engine requests structured output through `LLMProvider.structured()`. It validates required strings, learner level, and string arrays. If the first result is invalid or throws, it retries once with an explicit correction prompt. If the retry fails, it returns a concise deterministic fallback plan and marks `usedFallback: true`.

The engine itself does not synthesize audio or persist memory. Those remain separate runtime and local-service responsibilities.
