import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  Copy,
  Mic,
  Moon,
  Pause,
  RefreshCw,
  Settings as SettingsIcon,
  Sparkles,
  Square,
  Sun,
  Volume2,
  Waves,
  CheckCircle2,
  Lightbulb,
  Brain,
} from "lucide-react";
import type {
  Conversation as PersistedConversation,
  InstanceInfo,
  LearnerMemory,
  ModelSelection,
  Notebook,
  TeachingStyle,
} from "@opennblm/contracts";
import { cn } from "./lib/cn";
import { ModelPicker } from "./components/ModelPicker";
import { AppTitleBar } from "./components/AppTitleBar";
import { OverflowMenu } from "./components/OverflowMenu";
import { NotebookHomeSection, NotebookWorkspace } from "./components/NotebookWorkspace";
import { SettingsPage } from "./components/SettingsPage";
import { FirstRunSetup } from "./components/FirstRunSetup";
import { HomeSetupBanner } from "./components/HomeSetupBanner";
import "./styles.css";

type Screen = "home" | "lesson" | "notebook" | "templates" | "memory" | "settings";
type VoiceState = "idle" | "preparing" | "listening" | "thinking" | "speaking" | "paused" | "error";
type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  usedFallback?: boolean;
  citations?: Array<{ sourceId: string; title: string; excerpt: string }>;
};
type Conversation = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  messageCount: number;
  messages: Message[];
};
type DialogState =
  | null
  | { kind: "rename"; title: string }
  | { kind: "rename-notebook"; id: string; title: string }
  | { kind: "delete" }
  | { kind: "clear-memory" };

const STYLE_OPTIONS: Array<[TeachingStyle, string]> = [
  ["teacher", "Teacher"],
  ["friend", "Friend"],
  ["10-year-old", "10-year-old"],
  ["story", "Story"],
  ["simple", "Simple"],
  ["technical", "Technical"],
  ["hype", "Hype"],
];

const FEATURED = [
  { title: "Open exploration", detail: "Bring any question and follow it", Icon: Sparkles },
  { title: "Explain it simply", detail: "Turn a hard idea into something holdable", Icon: BookOpen },
  { title: "Check my understanding", detail: "Learn, then prove it back", Icon: CheckCircle2 },
  { title: "Analogy lab", detail: "Build intuition with better metaphors", Icon: Lightbulb },
  { title: "Voice-first review", detail: "Hear the idea, then say it back", Icon: Waves },
  { title: "Concept map", detail: "Connect pieces into one mental model", Icon: Brain },
  { title: "Worked example", detail: "Walk a full solution step by step", Icon: BookOpen },
  { title: "Socratic loop", detail: "Answer guiding questions until it clicks", Icon: Sparkles },
];
const FEATURED_HOME = FEATURED.slice(0, 4);

function WorkingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1 rounded-full bg-current animate-status-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </span>
  );
}

function LessonGlyph({ title, size = "md" }: { title: string; size?: "md" | "lg" }) {
  const hue = [...title].reduce((n, c) => n + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className={cn("flex items-center justify-center rounded-2xl", size === "lg" ? "size-16 text-2xl" : "size-12 text-xl")}
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 28% 22%), hsl(${(hue + 40) % 360} 32% 14%))`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <span aria-hidden>{title.trim().slice(0, 1).toUpperCase() || "L"}</span>
    </div>
  );
}

function DialogShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-7 backdrop-blur-[12px]" onMouseDown={onClose}>
      <div
        className="animate-pop-in w-full max-w-[440px] rounded-2xl border border-hairline/50 bg-panel p-6 shadow-2xl shadow-black/50"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [input, setInput] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isDark, setIsDark] = useState(true);
  const [featuredExpanded, setFeaturedExpanded] = useState(false);
  const [modelSelection, setModelSelection] = useState<ModelSelection | null>(null);
  const [engineInstances, setEngineInstances] = useState<InstanceInfo[]>([]);
  const [audioStatus, setAudioStatus] = useState<"idle" | "speaking" | "paused">("idle");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [teaching, setTeaching] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState("");
  const audioRef = useRef<HTMLAudioElement | undefined>(undefined);
  const queueRef = useRef<Array<{ id: string; text: string; wavPath: string }>>([]);
  const lastAudioRef = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selected = conversations.find((c) => c.id === selectedId);
  const activeEngine = engineInstances.find((item) => item.instanceId === modelSelection?.instanceId);
  const brainReady = Boolean(
    activeEngine &&
      modelSelection &&
      activeEngine.snapshot.state === "available" &&
      activeEngine.snapshot.authenticated !== false &&
      modelSelection.model,
  );

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, [isDark]);

  useEffect(() => {
    void window.opennbLM?.conversations.list(search).then((items) => {
      const next = items.map(toShellConversation);
      setConversations(next);
      setSelectedId((cur) => (cur && next.some((i) => i.id === cur) ? cur : cur));
    });
  }, [search]);

  useEffect(() => {
    void refreshNotebooks();
  }, []);

  async function refreshNotebooks() {
    const items = await window.opennbLM.notebooks.list();
    setNotebooks(items);
  }

  useEffect(() => {
    void refreshEngines();
  }, []);

  async function refreshEngines() {
    const [instances, selection] = await Promise.all([
      window.opennbLM.engines.list(),
      window.opennbLM.engines.getSelection(),
    ]);
    setEngineInstances(instances);
    setModelSelection(selection);
  }

  useEffect(() => {
    const update = (status: { state: VoiceState; runtimeAvailable: boolean; modelAvailable: boolean }) => {
      const ready = status.runtimeAvailable && status.modelAvailable;
      setVoiceReady(ready);
      setVoice(!ready ? "error" : status.state);
    };
    void window.opennbLM?.rumik.getStatus().then(update);
    return window.opennbLM?.rumik.onStateChange(update);
  }, []);

  useEffect(() => {
    let active: { id: string; text: string; wavPath: string } | undefined;
    const playNext = () => {
      if (active || !queueRef.current.length) return;
      const next = queueRef.current.shift();
      if (!next) return;
      active = next;
      lastAudioRef.current = next.wavPath;
      const audio = new Audio(`file:///${next.wavPath.replace(/\\/g, "/")}`);
      audioRef.current = audio;
      setAudioStatus("speaking");
      audio.onended = () => {
        active = undefined;
        audioRef.current = undefined;
        setAudioStatus("idle");
        playNext();
      };
      audio.onerror = () => {
        active = undefined;
        setAudioStatus("idle");
        playNext();
      };
      void audio.play().catch(() => {
        active = undefined;
        setAudioStatus("idle");
      });
    };
    const unsub = window.opennbLM?.rumik.onSegmentReady((segment) => {
      queueRef.current.push(segment);
      playNext();
    });
    return () => {
      unsub?.();
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "n" && !e.shiftKey) {
        e.preventDefault();
        void newLesson();
      }
      if (mod && e.key === ",") {
        e.preventDefault();
        setScreen("settings");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [input]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selected?.messages.length, teaching]);

  async function newLesson(topic = "Open exploration") {
    const created = await window.opennbLM.conversations.create({ learningTopic: topic, title: topic === "Open exploration" ? "Untitled lesson" : topic });
    const lesson = toShellConversation(created);
    setConversations((items) => [lesson, ...items]);
    setSelectedId(lesson.id);
    setScreen("lesson");
  }

  function openLesson(id: string) {
    setSelectedId(id);
    setScreen("lesson");
  }

  async function newNotebook() {
    const created = await window.opennbLM.notebooks.create("Untitled notebook");
    setNotebooks((items) => [created, ...items]);
    setActiveNotebookId(created.id);
    setScreen("notebook");
  }

  function openNotebook(id: string) {
    setActiveNotebookId(id);
    setScreen("notebook");
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !selectedId || teaching) return;
    if (!brainReady) {
      return;
    }
    setInput("");
    const message = await window.opennbLM.conversations.addMessage({ conversationId: selectedId, role: "user", text });
    setConversations((items) =>
      items.map((item) =>
        item.id === selectedId
          ? {
              ...item,
              preview: text,
              updatedAt: Date.now(),
              messageCount: item.messageCount + 1,
              messages: [...item.messages, { id: message.id, role: "user", text: message.text, at: Date.now() }],
            }
          : item,
      ),
    );
    setVoice("thinking");
    setTeaching(true);
    try {
      const response = await window.opennbLM.teaching.teach(selectedId, text);
      setConversations((items) =>
        items.map((item) =>
          item.id === selectedId
            ? {
                ...item,
                preview: response.text,
                messageCount: item.messageCount + 1,
                messages: [
                  ...item.messages,
                  {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    text: response.text,
                    at: Date.now(),
                    usedFallback: response.usedFallback,
                    citations: response.citations,
                  },
                ],
              }
            : item,
        ),
      );
      setVoice(response.voiceStarted ? "speaking" : voiceReady ? "idle" : "error");
      if (response.voiceError) setVoice("error");
    } catch {
      setVoice("error");
      setConversations((items) =>
        items.map((item) =>
          item.id === selectedId
            ? {
                ...item,
                messages: [
                  ...item.messages,
                  {
                    id: `assistant-error-${Date.now()}`,
                    role: "assistant",
                    text: "I couldn't reach the teaching brain. Use Connect brain above to install or sign in to an engine, then try again.",
                    at: Date.now(),
                  },
                ],
              }
            : item,
        ),
      );
    } finally {
      setTeaching(false);
    }
  }

  async function sayDifferently(style: TeachingStyle, explanation: string) {
    if (!selectedId || teaching) return;
    setVoice("thinking");
    setTeaching(true);
    try {
      const response = await window.opennbLM.teaching.teach(selectedId, explanation, { style, referenceExplanation: explanation });
      setConversations((items) =>
        items.map((item) =>
          item.id === selectedId
            ? {
                ...item,
                messages: [
                  ...item.messages,
                  {
                    id: `style-${Date.now()}`,
                    role: "assistant",
                    text: response.text,
                    at: Date.now(),
                    usedFallback: response.usedFallback,
                    citations: response.citations,
                  },
                ],
              }
            : item,
        ),
      );
      setVoice(response.voiceStarted ? "speaking" : "idle");
    } catch {
      setVoice("error");
    } finally {
      setTeaching(false);
    }
  }

  function onComposerKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q));
  }, [conversations, search]);

  const lastAssistant = selected ? [...selected.messages].reverse().find((m) => m.role === "assistant") : undefined;

  return (
    <div className="animate-workspace-in flex h-full min-h-0 flex-col overflow-hidden bg-app text-ink">
      <FirstRunSetup brainReady={Boolean(brainReady)} onCreateNotebook={() => void newNotebook()} />
      <AppTitleBar />
      {screen === "home" ? (
        <header
          className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline/25 px-5"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-raised/40"
            onClick={() => setScreen("home")}
          >
            <img src="./icon.png" alt="" width={22} height={22} className="size-[22px] rounded-[5px]" draggable={false} />
            <span className="text-[15px] font-medium tracking-[-0.01em] text-ink">opennbLM</span>
          </button>
          <div className="flex-1" />
          <button
            onClick={() => void newNotebook()}
            className="whitespace-nowrap rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium text-black [word-break:keep-all] hover:brightness-95"
          >
            New notebook
          </button>
          <button
            onClick={() => setScreen("memory")}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-hairline/40 px-3 py-1.5 text-[13px] text-ink-secondary [word-break:keep-all] hover:bg-raised hover:text-ink"
          >
            <Brain size={15} />
            Memory
          </button>
          <button
            onClick={() => setScreen("settings")}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-hairline/40 px-3 py-1.5 text-[13px] text-ink-secondary [word-break:keep-all] hover:bg-raised hover:text-ink"
          >
            <SettingsIcon size={15} />
            Settings
          </button>
          <button
            onClick={() => setIsDark((v) => !v)}
            className="flex size-8 items-center justify-center rounded-full text-ink-secondary hover:bg-raised hover:text-ink"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>
      ) : null}

      {screen === "home" && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 pb-16 pt-8">
            <HomeSetupBanner
              brainReady={Boolean(brainReady)}
              voiceReady={voiceReady}
              onOpenSettings={() => setScreen("settings")}
              onCreateNotebook={() => void newNotebook()}
            />

            <NotebookHomeSection
              search={search}
              searchOpen={searchOpen}
              onSearch={setSearch}
              onSearchOpen={setSearchOpen}
              notebooks={notebooks.filter((nb) => {
                const q = search.trim().toLowerCase();
                if (!q) return true;
                return nb.title.toLowerCase().includes(q);
              })}
              onOpen={openNotebook}
              onCreate={() => void newNotebook()}
              onRemove={(id) =>
                void (async () => {
                  await window.opennbLM.notebooks.remove(id);
                  await refreshNotebooks();
                  if (activeNotebookId === id) setActiveNotebookId("");
                })()
              }
              onRename={(id, title) => {
                setRenameValue(title);
                setDialog({ kind: "rename-notebook", id, title });
              }}
            />
          </div>
        </div>
      )}

      {screen === "notebook" && activeNotebookId && (
        <NotebookWorkspace
          notebookId={activeNotebookId}
          onBack={() => {
            setScreen("home");
            void refreshNotebooks();
          }}
          onRenamed={(nb) => {
            setNotebooks((items) => items.map((item) => (item.id === nb.id ? nb : item)));
          }}
          engineInstances={engineInstances}
          modelSelection={modelSelection}
          onSelectModel={async (next) => {
            setModelSelection(next);
            await window.opennbLM.engines.setSelection(next);
            await refreshEngines();
          }}
          onRefreshEngines={refreshEngines}
          brainReady={Boolean(brainReady)}
        />
      )}

      {screen === "lesson" && selected && (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Chat column */}
          <section className="relative flex min-w-0 flex-1 flex-col border-r border-hairline/25">
            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline/25 px-4">
              <button
                onClick={() => setScreen("home")}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-ink-secondary hover:bg-raised hover:text-ink"
              >
                <ArrowLeft size={15} /> Home
              </button>
              <div className="mx-1 h-4 w-px bg-hairline/40" />
              <span className="text-[13px] font-medium text-ink">Chat</span>
              <div className="flex-1" />
              {teaching || voice === "thinking" ? (
                <span className="flex items-center gap-2 text-[12.5px] text-ink-secondary">
                  <WorkingDots />
                  <span className="thinking-shimmer">Teaching…</span>
                </span>
              ) : null}
              <ModelPicker
                instances={engineInstances}
                selection={modelSelection}
                onSelect={async (next) => {
                  setModelSelection(next);
                  await window.opennbLM.engines.setSelection(next);
                  await refreshEngines();
                }}
                onRefresh={refreshEngines}
              />
              <OverflowMenu
                items={[
                  {
                    label: "Rename",
                    onClick: () => {
                      setRenameValue(selected.title);
                      setDialog({ kind: "rename", title: selected.title });
                    },
                  },
                  {
                    label: "Delete",
                    danger: true,
                    onClick: () => setDialog({ kind: "delete" }),
                  },
                ]}
              />
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 pb-40 pt-8">
                {selected.messages.length === 0 && (
                  <div className="py-10 text-center">
                    <LessonGlyph title={selected.title} size="lg" />
                    <h1 className="mt-5 text-[28px] font-semibold tracking-[-0.03em] text-ink">{selected.title}</h1>
                    <p className="mt-2 text-[13.5px] text-ink-secondary">
                      {selected.messageCount} messages · {formatDate(selected.updatedAt)}
                    </p>
                    <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-ink-secondary">
                      Ask anything. Use Connect brain above to install or sign in to a teaching engine — Settings is for appearance and Rumik only.
                    </p>
                  </div>
                )}
                {selected.messages.map((message, index) => (
                  <Bubble
                    key={message.id}
                    message={message}
                    isLastAssistant={message.role === "assistant" && index === selected.messages.length - 1}
                    onSayDifferently={sayDifferently}
                    onRegenerate={() => void window.opennbLM.rumik.synthesize(message.text).catch(() => undefined)}
                  />
                ))}
                {teaching && (
                  <div className="flex items-center gap-2 px-1 text-[13px] text-ink-secondary">
                    <WorkingDots />
                    <span className="thinking-shimmer">Preparing how to teach this…</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-4">
              <form className="pointer-events-auto relative mx-auto w-full max-w-3xl" onSubmit={(e) => void submit(e)}>
                <div aria-hidden className="absolute -left-5 -right-5 top-1/2 h-[36vh] bg-app" />
                <div className="relative z-[1] flex items-end gap-1.5 rounded-2xl border border-hairline/40 bg-card px-3 py-2.5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onComposerKey}
                    placeholder={brainReady ? "Ask a question or create something" : "Connect a teaching brain above first"}
                    className="max-h-[9rem] min-h-6 min-w-0 flex-1 resize-none self-center bg-transparent px-1.5 py-1 text-[15px] leading-6 text-ink placeholder:text-ink-secondary"
                  />
                  <div className="mb-0.5 flex items-center gap-1">
                    <span className="mr-1 hidden rounded-full bg-inset px-2 py-0.5 text-[11px] text-ink-secondary sm:inline">
                      {brainReady ? activeEngine?.displayName ?? "Brain" : "No brain"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setVoice((v) => (v === "listening" ? "idle" : "listening"))}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full",
                        voice === "listening" ? "animate-pulse bg-danger/20 text-danger" : "text-ink-secondary hover:bg-raised hover:text-ink",
                      )}
                      aria-label="Microphone"
                    >
                      <Mic size={17} />
                    </button>
                    <button
                      type="submit"
                      disabled={teaching || !input.trim()}
                      className="flex size-9 items-center justify-center rounded-full bg-white text-black hover:brightness-95 disabled:opacity-35"
                      aria-label="Send"
                    >
                      <ArrowUp size={17} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </section>

          {/* Studio rail — NotebookLM-inspired teaching tools */}
          <aside className="hidden w-[300px] shrink-0 flex-col bg-panel lg:flex">
            <div className="flex h-12 items-center border-b border-hairline/25 px-4 text-[13px] font-medium text-ink">Studio</div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {!voiceReady && (
                <div className="mb-3 rounded-xl border border-accent/25 bg-accent/10 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-secondary">
                  Rumik voice is optional. Text teaching works without it.
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <StudioTile icon={<Waves size={18} className="text-[#7aa2ff]" />} label="Voice" detail={voiceReady ? "Ready" : "Offline"} />
                <StudioTile icon={<Sparkles size={18} className="text-accent-text" />} label="Styles" detail="7 modes" />
                <StudioTile icon={<BookOpen size={18} className="text-[#c9b27a]" />} label="Memory" detail="Local" onClick={() => setScreen("memory")} />
                <StudioTile icon={<Volume2 size={18} className="text-[#7dcea0]" />} label="Replay" detail={lastAssistant ? "Last answer" : "—"} onClick={() => lastAssistant && void window.opennbLM.rumik.synthesize(lastAssistant.text).catch(() => undefined)} />
              </div>

              <div className="mt-5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-secondary">Voice transport</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {audioStatus === "speaking" ? (
                  <Chip onClick={() => { audioRef.current?.pause(); setAudioStatus("paused"); }}>
                    <Pause size={12} /> Pause
                  </Chip>
                ) : (
                  <Chip
                    onClick={() => {
                      if (audioStatus === "paused") {
                        void audioRef.current?.play();
                        setAudioStatus("speaking");
                      } else if (lastAudioRef.current) {
                        const audio = new Audio(`file:///${lastAudioRef.current.replace(/\\/g, "/")}`);
                        audioRef.current = audio;
                        setAudioStatus("speaking");
                        void audio.play();
                      }
                    }}
                  >
                    <Volume2 size={12} /> Play
                  </Chip>
                )}
                <Chip
                  onClick={() => {
                    queueRef.current = [];
                    audioRef.current?.pause();
                    if (audioRef.current) audioRef.current.currentTime = 0;
                    setAudioStatus("idle");
                    void window.opennbLM.rumik.cancel().catch(() => undefined);
                  }}
                >
                  <Square size={11} className="fill-current" /> Stop
                </Chip>
              </div>

              <div className="mt-5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-secondary">Say it differently</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {STYLE_OPTIONS.map(([style, label]) => (
                  <button
                    key={style}
                    disabled={!lastAssistant || teaching}
                    onClick={() => lastAssistant && void sayDifferently(style, lastAssistant.text)}
                    className="rounded-full border border-hairline/40 bg-card px-2.5 py-1 text-[12px] text-ink-secondary hover:border-accent/40 hover:bg-accent/10 hover:text-accent-text disabled:opacity-35"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {screen === "lesson" && !selected && (
        <div className="grid flex-1 place-content-center text-center">
          <p className="text-[14px] text-ink-secondary">Lesson not found.</p>
          <button onClick={() => setScreen("home")} className="mt-3 text-[13px] text-accent-text hover:underline">
            Back to home
          </button>
        </div>
      )}

      {screen === "templates" && (
        <LibraryPage
          onBack={() => setScreen("home")}
          onStart={(title) => void newLesson(title)}
        />
      )}
      {screen === "memory" && (
        <MemoryPage
          onBack={() => setScreen("home")}
          onRequestClear={() => setDialog({ kind: "clear-memory" })}
        />
      )}
      {screen === "settings" && (
        <SettingsPage
          onBack={() => setScreen("home")}
          voiceReady={voiceReady}
          isDark={isDark}
          setIsDark={setIsDark}
          onVoiceStatusChange={setVoiceReady}
          brainReady={Boolean(brainReady)}
        />
      )}

      {dialog?.kind === "rename-notebook" && (
        <DialogShell onClose={() => setDialog(null)}>
          <h2 className="text-[20px] font-semibold text-ink">Rename notebook</h2>
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="mt-4 w-full rounded-lg bg-raised px-3 py-2.5 text-[14px] text-ink focus:ring-1 focus:ring-accent"
          />
          <div className="mt-5 flex gap-2">
            <button
              className="rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-black"
              onClick={async () => {
                const id = dialog.id;
                const updated = await window.opennbLM.notebooks.rename(id, renameValue.trim() || dialog.title);
                setNotebooks((items) => items.map((item) => (item.id === id ? updated : item)));
                setDialog(null);
              }}
            >
              Save
            </button>
            <button className="rounded-full px-3.5 py-2 text-[13px] text-ink-secondary hover:bg-raised" onClick={() => setDialog(null)}>
              Cancel
            </button>
          </div>
        </DialogShell>
      )}

      {dialog?.kind === "rename" && selected && (
        <DialogShell onClose={() => setDialog(null)}>
          <h2 className="text-[20px] font-semibold text-ink">Rename lesson</h2>
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="mt-4 w-full rounded-lg bg-raised px-3 py-2.5 text-[14px] text-ink focus:ring-1 focus:ring-accent"
          />
          <div className="mt-4 flex gap-2">
            <button
              className="rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-black disabled:opacity-40"
              disabled={!renameValue.trim()}
              onClick={() => {
                if (!selectedId || !renameValue.trim()) return;
                void window.opennbLM.conversations.rename(selectedId, renameValue.trim()).then((renamed) => {
                  setConversations((items) => items.map((i) => (i.id === selectedId ? { ...i, title: renamed.title } : i)));
                  setDialog(null);
                });
              }}
            >
              Save
            </button>
            <button className="rounded-full px-3.5 py-2 text-[13px] text-ink-secondary hover:bg-raised" onClick={() => setDialog(null)}>
              Cancel
            </button>
          </div>
        </DialogShell>
      )}

      {dialog?.kind === "delete" && (
        <DialogShell onClose={() => setDialog(null)}>
          <h2 className="text-[20px] font-semibold text-ink">Delete this lesson?</h2>
          <p className="mt-1 text-[13px] text-ink-secondary">Removed from this device. Cannot be undone.</p>
          <div className="mt-5 flex gap-2">
            <button
              className="rounded-full bg-danger px-3.5 py-2 text-[13px] font-medium text-white"
              onClick={async () => {
                if (!selectedId) return;
                await window.opennbLM.conversations.delete(selectedId);
                setConversations((items) => items.filter((i) => i.id !== selectedId));
                setSelectedId("");
                setDialog(null);
                setScreen("home");
              }}
            >
              Delete
            </button>
            <button className="rounded-full px-3.5 py-2 text-[13px] text-ink-secondary hover:bg-raised" onClick={() => setDialog(null)}>
              Cancel
            </button>
          </div>
        </DialogShell>
      )}

      {dialog?.kind === "clear-memory" && (
        <DialogShell onClose={() => setDialog(null)}>
          <h2 className="text-[20px] font-semibold text-ink">Clear learner memory?</h2>
          <p className="mt-1 text-[13px] text-ink-secondary">Forgets learning notes. Conversations stay.</p>
          <div className="mt-5 flex gap-2">
            <button
              className="rounded-full bg-danger px-3.5 py-2 text-[13px] font-medium text-white"
              onClick={async () => {
                await window.opennbLM.learnerMemory.clear();
                setDialog(null);
                window.dispatchEvent(new Event("opennblm:memory-cleared"));
              }}
            >
              Clear memory
            </button>
            <button className="rounded-full px-3.5 py-2 text-[13px] text-ink-secondary hover:bg-raised" onClick={() => setDialog(null)}>
              Cancel
            </button>
          </div>
        </DialogShell>
      )}
    </div>
  );
}

function StudioTile({ icon, label, detail, onClick }: { icon: ReactNode; label: string; detail: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-xl border border-hairline/35 bg-card px-3 py-3 text-left hover:bg-raised/50"
    >
      {icon}
      <span className="text-[13px] font-medium text-ink">{label}</span>
      <span className="text-[11px] text-ink-secondary">{detail}</span>
    </button>
  );
}

function Chip({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-hairline/40 bg-card px-2.5 py-1 text-[12px] text-ink-secondary hover:bg-raised hover:text-ink">
      {children}
    </button>
  );
}

function Bubble({
  message,
  isLastAssistant,
  onSayDifferently,
  onRegenerate,
}: {
  message: Message;
  isLastAssistant: boolean;
  onSayDifferently: (style: TeachingStyle, explanation: string) => void;
  onRegenerate: () => void;
}) {
  const user = message.role === "user";
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn("group flex w-full flex-col animate-msg-in", user ? "items-end" : "items-start")}>
      <div className={cn("flex w-full items-end gap-1.5", user ? "justify-end" : "justify-start")}>
        {user && (
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(message.text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="rounded-md p-1.5 text-ink-secondary opacity-0 transition-opacity hover:bg-raised group-hover:opacity-100"
          >
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
          </button>
        )}
        <div className={cn("w-fit max-w-[min(42rem,78%)] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-ink", user ? "bg-bubble-user" : "bg-card")}>
          {message.text}
          {!user && message.usedFallback ? (
            <div className="mt-2 text-[11.5px] text-warning">Offline teaching fallback — connect a brain for fuller answers.</div>
          ) : null}
          {!user && message.citations?.length ? (
            <div className="mt-2 space-y-1 border-t border-hairline/30 pt-2 text-[11.5px] text-ink-secondary">
              {message.citations.map((c, i) => (
                <div key={`${c.sourceId}-${i}`}>
                  [{i + 1}] {c.title}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {!user && (
          <div className="flex flex-col gap-0.5 self-end pb-0.5">
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(message.text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="rounded-md p-1.5 text-ink-secondary opacity-0 transition-opacity hover:bg-raised group-hover:opacity-100"
            >
              {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            </button>
            {isLastAssistant && (
              <button onClick={onRegenerate} className="rounded-md p-1.5 text-ink-secondary opacity-0 transition-opacity hover:bg-raised group-hover:opacity-100">
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        )}
      </div>
      {!user && isLastAssistant && (
        <div className="mt-1.5 flex flex-wrap gap-1.5 px-1 lg:hidden">
          {STYLE_OPTIONS.slice(0, 4).map(([style, label]) => (
            <button
              key={style}
              onClick={() => onSayDifferently(style, message.text)}
              className="rounded-full border border-hairline/40 bg-panel px-2.5 py-1 text-[12px] text-ink-secondary hover:bg-raised"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryPage({ onBack, onStart }: { onBack: () => void; onStart: (title: string) => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-[13px] text-ink-secondary hover:text-ink">
          <ArrowLeft size={15} /> Home
        </button>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">All templates</h1>
        <p className="mt-2 text-[13.5px] text-ink-secondary">Starter paths — each opens a new lesson.</p>
        <div className="mt-8 divide-y divide-hairline/35 overflow-hidden rounded-2xl border border-hairline/40 bg-card">
          {FEATURED.map((row) => (
            <button key={row.title} onClick={() => onStart(row.title)} className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-raised/40">
              <span className="flex size-10 items-center justify-center rounded-xl bg-inset text-accent-text">
                <row.Icon size={20} strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-ink">{row.title}</span>
                <span className="block text-[12.5px] text-ink-secondary">{row.detail}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemoryPage({
  onBack,
  onRequestClear,
}: {
  onBack: () => void;
  onRequestClear: () => void;
}) {
  const [items, setItems] = useState<LearnerMemory[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void window.opennbLM.learnerMemory.list().then((memory) => {
      setItems(memory);
      setLoading(false);
    });
    const onCleared = () => setItems([]);
    window.addEventListener("opennblm:memory-cleared", onCleared);
    return () => window.removeEventListener("opennblm:memory-cleared", onCleared);
  }, []);
  const labels: Record<LearnerMemory["kind"], string> = {
    topic: "Topics studied",
    weak_concept: "Things to revisit",
    preference: "Explanation preferences",
    language: "Language",
    level: "Learner level",
    completed_lesson: "Completed lessons",
    recent_context: "Recent context",
  };
  const grouped = items.reduce<Record<string, LearnerMemory[]>>((acc, item) => {
    (acc[item.kind] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-[13px] text-ink-secondary hover:text-ink">
          <ArrowLeft size={15} /> Home
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">Memory</h1>
            <p className="mt-2 text-[13.5px] text-ink-secondary">
              Notes the teaching brain keeps after you ask a question. Forget one, or clear all. Notebooks stay on Home.
            </p>
          </div>
          <button disabled={!items.length} onClick={onRequestClear} className="rounded-full px-3 py-1.5 text-[12.5px] text-danger hover:bg-danger/10 disabled:opacity-40">
            Clear notes
          </button>
        </div>
        {loading ? (
          <p className="mt-8 text-[13px] text-ink-secondary">Loading…</p>
        ) : !items.length ? (
          <div className="mt-8 rounded-2xl border border-hairline/40 bg-card px-4 py-5">
            <div className="text-[14px] font-medium text-ink">Nothing remembered yet</div>
            <div className="mt-1 text-[12.5px] text-ink-secondary">
              Connect a teaching brain, then ask in a notebook. After an answer, topics and revisit notes show up here. Creating a notebook alone does not fill Memory.
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {Object.entries(grouped).map(([kind, group]) => (
              <div key={kind}>
                <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-secondary">{labels[kind as LearnerMemory["kind"]]}</div>
                <div className="divide-y divide-hairline/30 overflow-hidden rounded-2xl border border-hairline/40 bg-card">
                  {group.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-medium text-ink">{item.key}</div>
                        <div className="text-[12px] text-ink-secondary">{item.value}</div>
                      </div>
                      <button
                        className="shrink-0 rounded-lg px-2 py-1 text-[12px] text-ink-secondary hover:bg-raised"
                        onClick={async () => {
                          await window.opennbLM.learnerMemory.forget(item.id);
                          setItems((cur) => cur.filter((x) => x.id !== item.id));
                        }}
                      >
                        Forget
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function toShellConversation(item: PersistedConversation): Conversation {
  const last = item.messages.at(-1);
  return {
    id: item.id,
    title: item.title,
    preview: last?.text ?? "New lesson",
    updatedAt: new Date(item.updatedAt).getTime(),
    messageCount: item.messages.length,
    messages: item.messages.map((m) => ({
      id: m.id,
      role: m.role === "user" ? "user" : "assistant",
      text: m.text,
      at: new Date(m.timestamp).getTime(),
    })),
  };
}

function formatDate(at: number) {
  return new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

createRoot(document.getElementById("root")!).render(<App />);
