export type BrainProvider = "groq" | "openai" | "gemini" | "openrouter" | "ollama" | "openai-compatible";
export interface BrainRequest { model: string; messages: ReadonlyArray<{ role: "system" | "user" | "assistant"; content: string }>; }
export interface BrainResponse { content: string; model: string; }
export interface BrainAdapter { readonly provider: BrainProvider; complete(request: BrainRequest): Promise<BrainResponse>; }
