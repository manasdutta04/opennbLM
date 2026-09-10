export interface AppInfo { name: string; version: string; }
export type ConversationRole = "user" | "assistant" | "system";
export interface TeachingMetadata { concept?: string; difficulty?: string; progress?: number; }
export interface ConversationMessage { id: string; conversationId: string; role: ConversationRole; text: string; timestamp: string; audioReference?: string; teachingMetadata?: TeachingMetadata; }
export interface Conversation { id: string; title: string; createdAt: string; updatedAt: string; learningTopic: string; subject?: string; language?: string; learnerContext?: string; messages: ConversationMessage[]; }
export interface CreateConversationInput { title?: string; learningTopic?: string; subject?: string; language?: string; learnerContext?: string; }
export interface AddMessageInput { conversationId: string; role: ConversationRole; text: string; audioReference?: string; teachingMetadata?: TeachingMetadata; }
export interface ConversationApi {
  list(search?: string): Promise<Conversation[]>;
  create(input?: CreateConversationInput): Promise<Conversation>;
  rename(id: string, title: string): Promise<Conversation>;
  addMessage(input: AddMessageInput): Promise<ConversationMessage>;
  delete(id: string): Promise<void>;
}
export type ProviderId = "groq" | "openai" | "gemini" | "openrouter" | "ollama" | "custom";
export interface ProviderStatus { id: ProviderId; label: string; configured: boolean; model: string; connection: "unknown" | "connected" | "error"; error?: string; }
export interface ProviderSettingsApi { list(): Promise<ProviderStatus[]>; saveKey(id: ProviderId, key: string): Promise<void>; removeKey(id: ProviderId): Promise<void>; setModel(id: ProviderId, model: string): Promise<void>; setEndpoint(id: ProviderId, endpoint: string): Promise<void>; select(id: ProviderId): Promise<void>; test(id: ProviderId): Promise<ProviderStatus>; models(id: ProviderId): Promise<string[]>; }
export type RumikVoiceState = "idle" | "preparing" | "speaking" | "paused" | "error";
export interface RumikStatus { state: RumikVoiceState; runtimeAvailable: boolean; modelAvailable: boolean; modelId: string; modelRevision: string; sampleRate: number; error?: string; }
export interface RumikConfig { speaker: "Ira" | "Aisha" | "Siya" | "Zoya"; temperature: number; topK: number; maxTokens: number; deliveryDescription: string; language: string; }
export interface RumikSegment { id: string; text: string; wavPath: string; }
export interface RumikApi { getStatus(): Promise<RumikStatus>; start(): Promise<void>; stop(): Promise<void>; healthCheck(): Promise<boolean>; synthesize(text: string, config?: Partial<RumikConfig>): Promise<{ segments: RumikSegment[] }>; cancel(): Promise<void>; getVoices(): Promise<readonly string[]>; onSegmentReady(listener: (segment: RumikSegment) => void): () => void; onStateChange(listener: (status: RumikStatus) => void): () => void; }
export interface TeachingApi { teach(conversationId: string, question: string, options?: { learnerLevel?: "beginner" | "intermediate" | "advanced"; language?: string }): Promise<{ text: string; deliveryLabel: string; voiceStarted: boolean; voiceError?: string }>; }
export interface PreloadApi { getAppInfo(): Promise<AppInfo>; conversations: ConversationApi; providers: ProviderSettingsApi; rumik: RumikApi; teaching: TeachingApi; }
