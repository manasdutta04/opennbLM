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
export interface ProviderSettingsApi { list(): Promise<ProviderStatus[]>; saveKey(id: ProviderId, key: string): Promise<void>; removeKey(id: ProviderId): Promise<void>; setModel(id: ProviderId, model: string): Promise<void>; test(id: ProviderId): Promise<ProviderStatus>; models(id: ProviderId): Promise<string[]>; }
export interface PreloadApi { getAppInfo(): Promise<AppInfo>; conversations: ConversationApi; providers: ProviderSettingsApi; }
