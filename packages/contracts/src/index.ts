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
export type LearnerMemoryKind = "topic" | "weak_concept" | "preference" | "language" | "level" | "completed_lesson" | "recent_context";
export interface LearnerMemory { id: string; kind: LearnerMemoryKind; key: string; value: string; confidence: number; sourceConversationId?: string; createdAt: string; updatedAt: string; }
export interface LearnerMemoryApi { list(): Promise<LearnerMemory[]>; forget(id: string): Promise<void>; clear(): Promise<void>; }
export interface SetupStatus { firstRun: boolean; runtime: { available: boolean; source: "bundled" | "system" | "unavailable"; detail?: string }; model: { available: boolean; modelId: string; revision: string; detail?: string; bindPath?: string }; audio: { available: boolean; detail?: string }; system: { freeMemoryMb: number; gpuStatus: string; platform: string; arch: string }; dataPaths: { userData: string; logs: string; resources: string; rumikModel: string; }; }
export interface SetupApi { getStatus(): Promise<SetupStatus>; complete(): Promise<void>; }

/** @deprecated Prefer CLI engines; kept for optional HTTP adapters. */
export type ProviderId = "groq" | "openai" | "gemini" | "openrouter" | "ollama" | "custom";
export interface ProviderStatus { id: ProviderId; label: string; configured: boolean; model: string; connection: "unknown" | "connected" | "error"; error?: string; }
export interface ProviderSettingsApi {
  list(): Promise<ProviderStatus[]>;
  saveKey(id: ProviderId, key: string): Promise<void>;
  removeKey(id: ProviderId): Promise<void>;
  setModel(id: ProviderId, model: string): Promise<void>;
  setEndpoint(id: ProviderId, endpoint: string): Promise<void>;
  select(id: ProviderId): Promise<void>;
  test(id: ProviderId): Promise<ProviderStatus>;
  models(id: ProviderId): Promise<string[]>;
}

export type EngineDriverKind =
  | "claudeAgent"
  | "codex"
  | "cursorAgent"
  | "opencodeGo"
  | "grokAgent"
  | "antigravityAgent"
  | "hermesAgent"
  | "kimiAgent"
  | "qwenAgent"
  | "ollama"
  | "lmstudio";

export type EngineRail = "cloud" | "local";

export interface EngineInstall {
  command?: Partial<Record<"darwin" | "linux" | "win32", string>>;
  docsUrl?: string;
  signInCommand?: string;
  needsNode?: boolean;
}

export interface ModelOption {
  id: string;
  label: string;
  custom?: boolean;
  provider?: string;
  loaded?: boolean;
}

export interface ModelCatalog {
  default: string;
  options: ModelOption[];
}

export interface EngineSnapshot {
  state: "available" | "unavailable";
  authenticated?: boolean;
  reason?: string;
  version?: string;
}

export interface InstanceInfo {
  instanceId: string;
  driverKind: EngineDriverKind;
  displayName: string;
  rail: EngineRail;
  install?: EngineInstall;
  snapshot: EngineSnapshot;
  models: ModelCatalog;
}

export interface ModelSelection {
  instanceId: string;
  model: string;
}

export interface EnginesApi {
  list(): Promise<InstanceInfo[]>;
  refresh(): Promise<InstanceInfo[]>;
  getSelection(): Promise<ModelSelection | null>;
  setSelection(selection: ModelSelection): Promise<ModelSelection>;
  openInstallTerminal(command: string): Promise<boolean>;
}

export interface ShellApi {
  popupMenu(label: string, x: number, y: number): Promise<void>;
  getPlatform(): Promise<"darwin" | "win32" | "linux" | string>;
  openExternal?(url: string): Promise<boolean>;
}

export type RumikVoiceState = "idle" | "preparing" | "speaking" | "paused" | "error";
export interface RumikStatus { state: RumikVoiceState; runtimeAvailable: boolean; modelAvailable: boolean; modelId: string; modelRevision: string; sampleRate: number; error?: string; }
export interface RumikConfig { speaker: "Ira" | "Aisha" | "Siya" | "Zoya"; temperature: number; topK: number; maxTokens: number; deliveryDescription: string; language: string; }
export interface RumikSegment { id: string; text: string; wavPath: string; }
export interface RumikApi { getStatus(): Promise<RumikStatus>; start(): Promise<void>; stop(): Promise<void>; healthCheck(): Promise<boolean>; synthesize(text: string, config?: Partial<RumikConfig>): Promise<{ segments: RumikSegment[] }>; cancel(): Promise<void>; getVoices(): Promise<readonly string[]>; onSegmentReady(listener: (segment: RumikSegment) => void): () => void; onStateChange(listener: (status: RumikStatus) => void): () => void; }
export type TeachingStyle = "teacher" | "friend" | "10-year-old" | "story" | "simple" | "technical" | "hype";
export interface TeachingApi { teach(conversationId: string, question: string, options?: { learnerLevel?: "beginner" | "intermediate" | "advanced"; language?: string; style?: TeachingStyle; referenceExplanation?: string }): Promise<{ text: string; deliveryLabel: string; voiceStarted: boolean; voiceError?: string }>; }
export interface PreloadApi {
  getAppInfo(): Promise<AppInfo>;
  setup: SetupApi;
  conversations: ConversationApi;
  learnerMemory: LearnerMemoryApi;
  /** @deprecated Prefer engines. */
  providers: ProviderSettingsApi;
  engines: EnginesApi;
  shell?: ShellApi;
  rumik: RumikApi;
  teaching: TeachingApi;
}
