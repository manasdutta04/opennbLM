export type ProviderId = "groq" | "openai" | "gemini" | "openrouter" | "ollama" | "custom";
export type ChatRole = "system" | "user" | "assistant";
export interface ChatMessage { role: ChatRole; content: string; }
export interface LLMRequest { model: string; messages: ReadonlyArray<ChatMessage>; temperature?: number; responseSchema?: unknown; }
export interface LLMResponse { content: string; model: string; raw?: unknown; }
export interface LLMProvider { readonly id: ProviderId; chat(request: LLMRequest): Promise<LLMResponse>; stream(request: LLMRequest): AsyncIterable<string>; structured<T>(request: LLMRequest): Promise<T>; listModels(): Promise<string[]>; healthCheck(): Promise<void>; }
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
export interface ProviderConfig { id: ProviderId; apiKey?: string; baseUrl?: string; }
const defaults: Record<ProviderId, { baseUrl: string; models: string[] }> = { groq: { baseUrl: "https://api.groq.com/openai/v1", models: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"] }, openai: { baseUrl: "https://api.openai.com/v1", models: ["gpt-4o-mini", "gpt-4o"] }, gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta", models: ["gemini-2.0-flash", "gemini-2.5-pro"] }, openrouter: { baseUrl: "https://openrouter.ai/api/v1", models: ["openai/gpt-4o-mini", "google/gemini-2.0-flash-001"] }, ollama: { baseUrl: "http://127.0.0.1:11434", models: ["llama3.2", "qwen2.5"] }, custom: { baseUrl: "http://127.0.0.1:8080/v1", models: [] } };
function authHeaders(apiKey?: string): Record<string, string> { return apiKey ? { Authorization: `Bearer ${apiKey}` } : {}; }
async function json(response: Response): Promise<any> { if (!response.ok) throw new Error(`Provider request failed (${response.status})`); return response.json(); }
class OpenAICompatibleProvider implements LLMProvider {
  constructor(public readonly id: ProviderId, private readonly config: ProviderConfig, private readonly fetcher: FetchLike = fetch) {}
  private get baseUrl() { return (this.config.baseUrl || defaults[this.id].baseUrl).replace(/\/$/, ""); }
  private headers() { return { "Content-Type": "application/json", ...authHeaders(this.config.apiKey) }; }
  async chat(request: LLMRequest): Promise<LLMResponse> { const payload: any = { model: request.model, messages: request.messages, temperature: request.temperature }; if (request.responseSchema) payload.response_format = { type: "json_schema", json_schema: { name: "response", schema: request.responseSchema } }; const body = await json(await this.fetcher(`${this.baseUrl}/chat/completions`, { method: "POST", headers: this.headers(), body: JSON.stringify(payload) })); return { content: body.choices?.[0]?.message?.content ?? "", model: body.model ?? request.model, raw: body }; }
  async *stream(request: LLMRequest): AsyncIterable<string> { const response = await this.fetcher(`${this.baseUrl}/chat/completions`, { method: "POST", headers: this.headers(), body: JSON.stringify({ model: request.model, messages: request.messages, stream: true }) }); if (!response.ok || !response.body) throw new Error(`Provider stream failed (${response.status})`); const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; while (true) { const next = await reader.read(); if (next.done) break; buffer += decoder.decode(next.value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() ?? ""; for (const line of lines) { if (!line.startsWith("data: ") || line.includes("[DONE]")) continue; try { const token = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content; if (token) yield token; } catch {} } } }
  async structured<T>(request: LLMRequest): Promise<T> { return JSON.parse((await this.chat(request)).content) as T; }
  async listModels(): Promise<string[]> { if (this.id === "ollama") { const body = await json(await this.fetcher(`${this.baseUrl}/api/tags`)); return body.models?.map((model: any) => model.name) ?? []; } try { const body = await json(await this.fetcher(`${this.baseUrl}/models`, { headers: this.headers() })); return body.data?.map((model: any) => model.id) ?? defaults[this.id].models; } catch { return defaults[this.id].models; } }
  async healthCheck(): Promise<void> { if (this.id === "ollama") { await json(await this.fetcher(`${this.baseUrl}/api/tags`)); return; } await json(await this.fetcher(`${this.baseUrl}/models`, { headers: this.headers() })); }
}
class GeminiProvider implements LLMProvider {
  readonly id = "gemini" as const;
  constructor(private readonly config: ProviderConfig, private readonly fetcher: FetchLike = fetch) {}
  private url(model: string) { return `${(this.config.baseUrl || defaults.gemini.baseUrl).replace(/\/$/, "")}/models/${model}:generateContent?key=${encodeURIComponent(this.config.apiKey || "")}`; }
  private contents(request: LLMRequest) { return request.messages.filter((message) => message.role !== "system").map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })); }
  async chat(request: LLMRequest): Promise<LLMResponse> { const system = request.messages.find((message) => message.role === "system"); const body: any = { contents: this.contents(request), generationConfig: { temperature: request.temperature } }; if (system) body.systemInstruction = { parts: [{ text: system.content }] }; const result = await json(await this.fetcher(this.url(request.model), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })); return { content: result.candidates?.[0]?.content?.parts?.[0]?.text ?? "", model: request.model, raw: result }; }
  async *stream(request: LLMRequest): AsyncIterable<string> { yield (await this.chat(request)).content; }
  async structured<T>(request: LLMRequest): Promise<T> { return JSON.parse((await this.chat(request)).content) as T; }
  async listModels(): Promise<string[]> { const result = await json(await this.fetcher(`${(this.config.baseUrl || defaults.gemini.baseUrl).replace(/\/$/, "")}/models?key=${encodeURIComponent(this.config.apiKey || "")}`)); return result.models?.filter((model: any) => model.supportedGenerationMethods?.includes("generateContent")).map((model: any) => model.name.replace("models/", "")) ?? defaults.gemini.models; }
  async healthCheck(): Promise<void> { await this.listModels(); }
}
export function createProvider(config: ProviderConfig, fetcher: FetchLike = fetch): LLMProvider { return config.id === "gemini" ? new GeminiProvider(config, fetcher) : new OpenAICompatibleProvider(config.id, config, fetcher); }
export const providerDefaults = defaults;
