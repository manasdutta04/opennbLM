export interface AppInfo { name: string; version: string; }
export type ConversationRole = "user" | "assistant" | "system";
export interface TeachingMetadata { concept?: string; difficulty?: string; progress?: number; }
export interface ConversationMessage { id: string; conversationId: string; role: ConversationRole; text: string; timestamp: string; audioReference?: string; teachingMetadata?: TeachingMetadata; }
export interface Conversation { id: string; title: string; createdAt: string; updatedAt: string; learningTopic: string; subject?: string; language?: string; learnerContext?: string; messages: ConversationMessage[]; }
export interface CreateConversationInput { title?: string; learningTopic?: string; subject?: string; language?: string; learnerContext?: string; notebookId?: string; }
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
export interface SetupStatus {
  firstRun: boolean;
  runtime: { available: boolean; source: "bundled" | "system" | "unavailable" | "remote"; detail?: string };
  model: { available: boolean; modelId: string; revision: string; detail?: string; bindPath?: string };
  audio: { available: boolean; detail?: string };
  system: { freeMemoryMb: number; gpuStatus: string; platform: string; arch: string };
  dataPaths: { userData: string; logs: string; resources: string; rumikModel: string };
  rumik?: {
    mode: "local" | "remote";
    preferredMode: "local" | "remote";
    cudaAvailable: boolean;
    remoteEndpoint?: string;
    hasHfToken?: boolean;
  };
}
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
export interface RumikStatus {
  state: RumikVoiceState;
  runtimeAvailable: boolean;
  modelAvailable: boolean;
  modelId: string;
  modelRevision: string;
  sampleRate: number;
  mode?: "local" | "remote";
  preferredMode?: "local" | "remote";
  cudaAvailable?: boolean;
  remoteEndpoint?: string;
  hasHfToken?: boolean;
  error?: string;
}
export interface RumikConfig { speaker: "Ira" | "Aisha" | "Siya" | "Zoya"; temperature: number; topK: number; maxTokens: number; deliveryDescription: string; language: string; broadcast?: boolean; }
export interface RumikSegment { id: string; text: string; wavPath: string; }
export interface RumikApi { getStatus(): Promise<RumikStatus>; setMode(mode: "local" | "remote"): Promise<RumikStatus>; setHfToken(token?: string): Promise<RumikStatus>; start(): Promise<void>; stop(): Promise<void>; healthCheck(): Promise<boolean>; synthesize(text: string, config?: Partial<RumikConfig>): Promise<{ segments: RumikSegment[] }>; cancel(): Promise<void>; getVoices(): Promise<readonly string[]>; onSegmentReady(listener: (segment: RumikSegment) => void): () => void; onStateChange(listener: (status: RumikStatus) => void): () => void; }
export type TeachingStyle = "teacher" | "friend" | "10-year-old" | "story" | "simple" | "technical" | "hype";
export interface TeachingApi {
  teach(
    conversationId: string,
    question: string,
    options?: {
      learnerLevel?: "beginner" | "intermediate" | "advanced";
      language?: string;
      style?: TeachingStyle;
      referenceExplanation?: string;
      notebookId?: string;
      sourceIds?: string[];
    },
  ): Promise<{
    text: string;
    deliveryLabel: string;
    voiceStarted: boolean;
    voiceError?: string;
    usedFallback?: boolean;
    citations?: Array<{ sourceId: string; title: string; excerpt: string }>;
  }>;
}

/** Notebook research containers (local-first). */
export type SourceKind = "pdf" | "url" | "text" | "pptx" | "docx" | "youtube";
export type SourceStatus = "processing" | "ready" | "error";
export type SourceContextLevel = "full" | "summary" | "excluded";
export type NoteKind = "manual" | "ai";
export type StudioArtifactKind =
  | "audio_overview"
  | "report"
  | "mind_map"
  | "flashcards"
  | "quiz"
  | "slide_deck"
  | "infographic"
  | "data_table"
  | "note";
export type AudioOverviewFormat = "deep_dive" | "brief" | "critique" | "debate";
export type AudioOverviewLength = "shorter" | "default" | "longer";
/** Official Rumik Space delivery controls. */
export type RumikTone = "happy" | "sad" | "angry" | "excited" | "professional";
export type RumikAccent =
  | "Hindi accent"
  | "Telugu accent"
  | "Tamil accent"
  | "Kannada accent"
  | "Bengali accent"
  | "Punjabi accent"
  | "Indian English accent";
export type RumikPace = "slow pace" | "fast pace" | "steady pace";

export interface Notebook {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceCount?: number;
}

export interface NotebookSource {
  id: string;
  notebookId: string;
  kind: SourceKind;
  title: string;
  status: SourceStatus;
  contextLevel: SourceContextLevel;
  localPath?: string;
  url?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookNote {
  id: string;
  notebookId: string;
  kind: NoteKind;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookSearchHit {
  kind: "source" | "note" | "chunk";
  notebookId: string;
  id: string;
  title: string;
  excerpt: string;
  score?: number;
}

export interface PodcastEpisode {
  id: string;
  notebookId: string;
  title: string;
  status: "processing" | "ready" | "error";
  script?: string;
  speakers: string[];
  audioPaths: string[];
  error?: string;
  createdAt: string;
  updatedAt: string;
  format?: AudioOverviewFormat;
  length?: AudioOverviewLength;
  language?: string;
}

export interface StudioArtifact {
  id: string;
  notebookId: string;
  kind: StudioArtifactKind;
  title: string;
  status: "processing" | "ready" | "error";
  body: string;
  meta?: Record<string, unknown>;
  audioPaths?: string[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AudioOverviewOptions {
  title?: string;
  format?: AudioOverviewFormat;
  length?: AudioOverviewLength;
  language?: string;
  sourceIds?: string[];
  speakers?: number;
  focusPrompt?: string;
}

export interface NotebooksApi {
  list(): Promise<Notebook[]>;
  create(title?: string): Promise<Notebook>;
  rename(id: string, title: string): Promise<Notebook>;
  remove(id: string): Promise<void>;
  listSources(notebookId: string): Promise<NotebookSource[]>;
  addTextSource(notebookId: string, title: string, text: string): Promise<NotebookSource>;
  addUrlSource(notebookId: string, url: string): Promise<NotebookSource>;
  addFileSource(notebookId: string, filePath: string): Promise<NotebookSource>;
  setSourceContext(sourceId: string, level: SourceContextLevel): Promise<NotebookSource>;
  removeSource(sourceId: string): Promise<void>;
  listNotes(notebookId: string): Promise<NotebookNote[]>;
  createNote(notebookId: string, input: { title: string; body: string; kind?: NoteKind }): Promise<NotebookNote>;
  updateNote(noteId: string, input: { title?: string; body?: string }): Promise<NotebookNote>;
  removeNote(noteId: string): Promise<void>;
  transformNote(
    notebookId: string,
    transform: "summarize" | "concepts" | "faq",
    options?: { sourceIds?: string[]; language?: string },
  ): Promise<NotebookNote>;
  search(query: string, notebookId?: string): Promise<NotebookSearchHit[]>;
  ask(
    notebookId: string,
    question: string,
    options?: { sourceIds?: string[]; language?: string },
  ): Promise<{ text: string; citations: Array<{ sourceId: string; title: string; excerpt: string }> }>;
  generateGuide(
    notebookId: string,
    options?: { sourceIds?: string[]; language?: string },
  ): Promise<{ text: string; cached?: boolean; title?: string }>;
  listPodcasts(notebookId: string): Promise<PodcastEpisode[]>;
  createPodcast(notebookId: string, options?: AudioOverviewOptions): Promise<PodcastEpisode>;
  listArtifacts(notebookId: string): Promise<StudioArtifact[]>;
  generateArtifact(
    notebookId: string,
    kind: Exclude<StudioArtifactKind, "audio_overview" | "note">,
    options?: { sourceIds?: string[]; language?: string; focusPrompt?: string },
  ): Promise<StudioArtifact>;
  removeArtifact(artifactId: string): Promise<void>;
  pickSourceFile(): Promise<string | null>;
}

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
  notebooks: NotebooksApi;
}
