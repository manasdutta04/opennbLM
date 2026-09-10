# LLM Providers

The brain layer is represented by a capability-oriented `BrainAdapter` interface. Planned adapters include Groq, OpenAI, Gemini, OpenRouter, Ollama/local models, and custom OpenAI-compatible endpoints.

Provider credentials and endpoint configuration belong in main/local services, never in renderer code. No adapter or network request is implemented yet. The provider choice must remain a runtime configuration rather than an application-wide hard-coded dependency.
