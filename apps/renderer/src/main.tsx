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
  ChevronDown,
  Copy,
  Mic,
  Moon,
  MoreVertical,
  Pause,
  Plus,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Square,
  Sun,
  Volume2,
  Waves,
} from "lucide-react";
import type {
  Conversation as PersistedConversation,
  LearnerMemory,
  ProviderId,
  ProviderStatus,
  SetupStatus,
  TeachingStyle,
} from "@opennblm/contracts";
import { cn } from "./lib/cn";
import "./styles.css";

type Screen = "home" | "lesson" | "library" | "memory" | "settings";
type HomeTab = "all" | "library" | "memory";
type VoiceState = "idle" | "preparing" | "listening" | "thinking" | "speaking" | "paused" | "error";
type Message = { id: string; role: "user" | "assistant"; text: string; at: number };
type Conversation = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  messageCount: number;
  messages: Message[];
};
type DialogState =
  | { kind: "rename"; title: string }
  | { kind: "delete" }
  | { kind: "clear-memory" }
  | { kind: "lesson-menu"; id: string }
  | null;

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
  { title: "Open exploration", detail: "Bring any question and follow it", icon: "✦" },
  { title: "Explain it simply", detail: "Turn a hard idea into something holdable", icon: "◇" },
  { title: "Check my understanding", detail: "Learn, then prove it back", icon: "◎" },
  { title: "Analogy lab", detail: "Build intuition with better metaphors", icon: "◈" },
];

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

/** Chat-only brain picker — OpenClaw pattern: ready engines selectable, others point to setup. */
function ModelPicker({
  provider,
  statuses,
  onSelectProvider,
  onRefresh,
  onOpenSettings,
}: {
  provider: ProviderId;
  statuses: ProviderStatus[];
  onSelectProvider: (id: ProviderId) => Promise<void>;
  onRefresh: () => Promise<void>;
  onOpenSettings: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [railId, setRailId] = useState<ProviderId>(provider);
  const [models, setModels] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const current = statuses.find((s) => s.id === provider);
  const rail = statuses.find((s) => s.id === railId) ?? current;
  const ready = statuses.filter((s) => s.configured);
  const needsSetup = statuses.filter((s) => !s.configured);

  useEffect(() => {
    if (!open) return;
    setRailId(provider);
    void window.opennbLM.providers.models(provider).then(setModels);
  }, [open, provider]);

  useEffect(() => {
    if (!open || !rail?.configured) {
      setModels([]);
      return;
    }
    void window.opennbLM.providers.models(railId).then(setModels);
  }, [open, railId, rail?.configured]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = models.filter((m) => m.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-hairline/40 bg-control/60 py-1 pl-2.5 pr-2 text-[13px] text-ink hover:bg-raised-hover"
        title={current ? `${current.label} · ${current.model}` : "Select teaching brain"}
      >
        <span className="max-w-[180px] truncate">
          {current?.configured ? current.model || current.label : "Connect a brain"}
          {current?.configured && <span className="text-ink-secondary"> · {current.label}</span>}
        </span>
        <ChevronDown size={14} className={cn("text-ink-secondary transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="animate-pop-in absolute right-0 top-[calc(100%+8px)] z-40 flex max-h-[340px] w-[380px] overflow-hidden rounded-xl border border-hairline/50 bg-raised shadow-2xl shadow-black/60">
          <div className="flex w-[124px] shrink-0 flex-col gap-0.5 overflow-auto border-r border-hairline/40 bg-card p-2">
            {ready.length === 0 && <div className="px-2 py-3 text-[11.5px] leading-relaxed text-ink-secondary">No engines ready yet.</div>}
            {ready.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setRailId(item.id);
                  setQuery("");
                }}
                className={cn(
                  "rounded-lg px-2.5 py-2 text-left text-[12.5px]",
                  railId === item.id ? "bg-control text-ink" : "text-ink-secondary hover:bg-control/60 hover:text-ink",
                )}
              >
                <div className="truncate font-medium">{item.label}</div>
                <div className="text-[10.5px] text-success">Ready</div>
              </button>
            ))}
            {needsSetup.length > 0 && (
              <>
                <div className="mx-1 my-1 border-t border-hairline/40" />
                {needsSetup.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setRailId(item.id);
                      setQuery("");
                    }}
                    className={cn(
                      "rounded-lg px-2.5 py-2 text-left text-[12.5px]",
                      railId === item.id ? "bg-control text-ink" : "text-ink-secondary hover:bg-control/60",
                    )}
                  >
                    <div className="truncate font-medium">{item.label}</div>
                    <div className="text-[10.5px] text-warning">Setup</div>
                  </button>
                ))}
              </>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            {!rail?.configured ? (
              <div className="flex flex-1 flex-col justify-center gap-3 p-4">
                <div className="text-[13.5px] font-medium text-ink">Connect {rail?.label ?? "this engine"}</div>
                <p className="text-[12.5px] leading-relaxed text-ink-secondary">
                  Add an API key in Settings first. Only configured engines can teach in a lesson — same idea as OpenClaw engines.
                </p>
                <button
                  type="button"
                  className="rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-white hover:brightness-110"
                  onClick={() => {
                    setOpen(false);
                    onOpenSettings();
                  }}
                >
                  Open Settings
                </button>
              </div>
            ) : (
              <>
                <div className="shrink-0 px-2 pb-2 pt-2">
                  <div className="flex items-center gap-2 rounded-lg border border-hairline/40 bg-inset px-2.5 py-1.5 focus-within:border-accent/60">
                    <Search size={13} className="shrink-0 text-ink-secondary" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search models"
                      className="w-full bg-transparent text-[12.5px] text-ink placeholder:text-ink-secondary"
                    />
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto px-1.5 pb-2">
                  {filtered.length === 0 && (
                    <div className="px-2 py-5 text-center text-[12.5px] text-ink-secondary">
                      {query ? `Nothing matches “${query.trim()}”` : "No models discovered"}
                    </div>
                  )}
                  {filtered.map((model) => {
                    const selected = railId === provider && rail.model === model;
                    return (
                      <button
                        key={model}
                        type="button"
                        onClick={async () => {
                          await onSelectProvider(railId);
                          await window.opennbLM.providers.setModel(railId, model);
                          await onRefresh();
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink hover:bg-control/60",
                          selected && "bg-control",
                        )}
                      >
                        <span className="truncate">{model}</span>
                        {selected && <Check size={14} className="shrink-0 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SetupBanner() {
  const [status, setStatus] = useState<SetupStatus | undefined>();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    void window.opennbLM.setup.getStatus().then((next) => {
      setStatus(next);
      setOpen(next.firstRun);
    });
  }, []);
  if (!status || !open) return null;
  const voiceReady = status.runtime.available && status.model.available;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-7 backdrop-blur-[14px]">
      <div className="animate-pop-in w-full max-w-[520px] rounded-2xl border border-hairline/50 bg-panel p-8 shadow-2xl shadow-black/50">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-accent-text">First run · Local setup</div>
        <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-ink">Welcome to opennbLM.</h2>
        <p className="mt-2 max-w-[430px] text-[13.5px] leading-relaxed text-ink-secondary">
          Local lessons are ready. Connect a teaching brain in Settings, then pick the model inside each lesson.
        </p>
        <div className="mt-5 divide-y divide-hairline/35 border-y border-hairline/35">
          {[
            { ok: voiceReady, title: "Rumik voice engine", detail: voiceReady ? "Ready" : "Optional — add later" },
            { ok: status.audio.available, title: "Audio output", detail: status.audio.detail },
            { ok: true, title: "Local storage", detail: `${status.system.freeMemoryMb.toLocaleString()} MB available` },
          ].map((row) => (
            <div key={row.title} className="flex items-start gap-3 py-3">
              <span className={cn("mt-1.5 size-2 rounded-full", row.ok ? "bg-success" : "bg-warning")} />
              <div>
                <div className="text-[13px] text-ink">{row.title}</div>
                <div className="text-[11.5px] text-ink-secondary">{row.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-2.5">
          <button
            className="rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black hover:brightness-95"
            onClick={async () => {
              await window.opennbLM.setup.complete();
              setOpen(false);
            }}
          >
            Start learning
          </button>
          <button className="rounded-full px-4 py-2 text-[13px] text-ink-secondary hover:bg-raised hover:text-ink" onClick={() => setOpen(false)}>
            Review later
          </button>
        </div>
      </div>
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
  const [homeTab, setHomeTab] = useState<HomeTab>("all");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [input, setInput] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isDark, setIsDark] = useState(true);
  const [provider, setProvider] = useState<ProviderId>("openai");
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [audioStatus, setAudioStatus] = useState<"idle" | "speaking" | "paused">("idle");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [teaching, setTeaching] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const audioRef = useRef<HTMLAudioElement | undefined>(undefined);
  const queueRef = useRef<Array<{ id: string; text: string; wavPath: string }>>([]);
  const lastAudioRef = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selected = conversations.find((c) => c.id === selectedId);
  const currentProvider = providerStatuses.find((s) => s.id === provider);

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
    void window.opennbLM?.providers.list().then((statuses) => {
      setProviderStatuses(statuses);
      const preferred = statuses.find((s) => s.configured) ?? statuses[0];
      if (preferred) setProvider(preferred.id);
    });
  }, []);

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

  async function refreshProviders() {
    setProviderStatuses(await window.opennbLM.providers.list());
  }

  async function newLesson(topic = "Open exploration") {
    const created = await window.opennbLM.conversations.create({ learningTopic: topic, title: topic === "Open exploration" ? "Untitled lesson" : topic });
    const lesson = toShellConversation(created);
    setConversations((items) => [lesson, ...items]);
    setSelectedId(lesson.id);
    setScreen("lesson");
    setHomeTab("all");
  }

  function openLesson(id: string) {
    setSelectedId(id);
    setScreen("lesson");
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !selectedId || teaching) return;
    if (!currentProvider?.configured) {
      setScreen("settings");
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
                messages: [...item.messages, { id: `assistant-${Date.now()}`, role: "assistant", text: response.text, at: Date.now() }],
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
                    id: `fallback-${Date.now()}`,
                    role: "assistant",
                    text: "I couldn't reach the teaching brain. Connect a provider in Settings, then pick a model in this lesson.",
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
                messages: [...item.messages, { id: `style-${Date.now()}`, role: "assistant", text: response.text, at: Date.now() }],
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
      {/* App chrome — NotebookLM-style top bar (no duplicate sidebar nav) */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline/25 px-5">
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-raised/40"
          onClick={() => {
            setScreen("home");
            setHomeTab("all");
          }}
        >
          <div className="flex size-[22px] items-center justify-center rounded-full bg-gradient-to-br from-[#7aa2ff] to-[#4f6fd8] text-[10px] font-bold text-white">n</div>
          <span className="text-[15px] font-medium tracking-[-0.01em] text-ink">
            {screen === "lesson" && selected ? selected.title : "opennbLM"}
          </span>
        </button>
        <div className="flex-1" />
        {screen !== "settings" && (
          <button
            onClick={() => void newLesson()}
            className="rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium text-black hover:brightness-95"
          >
            + Create lesson
          </button>
        )}
        <button
          onClick={() => setScreen("settings")}
          className={cn(
            "flex items-center gap-1.5 rounded-full border border-hairline/40 px-3 py-1.5 text-[13px]",
            screen === "settings" ? "bg-raised text-ink" : "text-ink-secondary hover:bg-raised hover:text-ink",
          )}
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

      {screen === "home" && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 pb-16 pt-6">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["all", "All"],
                  ["library", "Library"],
                  ["memory", "Memory"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    if (id === "library") {
                      setScreen("library");
                      return;
                    }
                    if (id === "memory") {
                      setScreen("memory");
                      return;
                    }
                    setHomeTab("all");
                  }}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[13px]",
                    homeTab === id || (id === "all" && homeTab === "all")
                      ? "bg-raised text-ink"
                      : "text-ink-secondary hover:bg-raised/50 hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                {searchOpen ? (
                  <div className="flex items-center gap-2 rounded-full border border-hairline/40 bg-card px-3 py-1.5">
                    <Search size={14} className="text-ink-secondary" />
                    <input
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search lessons"
                      className="w-44 bg-transparent text-[13px] text-ink placeholder:text-ink-secondary"
                      onBlur={() => {
                        if (!search) setSearchOpen(false);
                      }}
                    />
                  </div>
                ) : (
                  <button onClick={() => setSearchOpen(true)} className="flex size-8 items-center justify-center rounded-full text-ink-secondary hover:bg-raised hover:text-ink" aria-label="Search">
                    <Search size={16} />
                  </button>
                )}
                <button onClick={() => void newLesson()} className="rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium text-black hover:brightness-95">
                  + Create new
                </button>
              </div>
            </div>

            <section className="mt-10">
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-[18px] font-medium text-ink">Featured starts</h2>
                <button onClick={() => setScreen("library")} className="text-[13px] text-ink-secondary hover:text-ink">
                  View all ›
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURED.map((card) => (
                  <button
                    key={card.title}
                    onClick={() => void newLesson(card.title)}
                    className="group relative overflow-hidden rounded-2xl border border-hairline/35 bg-card p-4 text-left transition hover:border-hairline/60 hover:bg-raised/40"
                  >
                    <div className="mb-8 text-2xl text-accent-text opacity-80">{card.icon}</div>
                    <div className="text-[15px] font-semibold text-ink">{card.title}</div>
                    <div className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">{card.detail}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-12">
              <h2 className="mb-4 text-[22px] font-medium tracking-[-0.02em] text-ink">Recent lessons</h2>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <button
                  onClick={() => void newLesson()}
                  className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-hairline/50 bg-transparent text-ink-secondary transition hover:border-accent/40 hover:bg-card hover:text-ink"
                >
                  <Plus size={28} />
                  <span className="text-[14px]">Create new lesson</span>
                </button>
                {filtered.map((item) => (
                  <div key={item.id} className="group relative flex min-h-[180px] flex-col rounded-2xl border border-hairline/35 bg-card p-4 transition hover:border-hairline/60 hover:bg-raised/30">
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-lg p-1.5 text-ink-secondary opacity-0 hover:bg-raised hover:text-ink group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDialog({ kind: "lesson-menu", id: item.id });
                      }}
                      aria-label="Lesson actions"
                    >
                      <MoreVertical size={16} />
                    </button>
                    <button type="button" className="flex flex-1 flex-col items-start text-left" onClick={() => openLesson(item.id)}>
                      <LessonGlyph title={item.title} size="lg" />
                      <div className="mt-auto w-full pt-6">
                        <div className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">{item.title}</div>
                        <div className="mt-1 text-[12px] text-ink-secondary">
                          {formatDate(item.updatedAt)} · {item.messageCount} msg
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
              {filtered.length === 0 && (
                <p className="mt-2 text-[13px] text-ink-secondary">No lessons yet — create one to begin.</p>
              )}
            </section>
          </div>
        </div>
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
                provider={provider}
                statuses={providerStatuses}
                onSelectProvider={async (id) => {
                  setProvider(id);
                  await window.opennbLM.providers.select(id);
                  await refreshProviders();
                }}
                onRefresh={refreshProviders}
                onOpenSettings={() => setScreen("settings")}
              />
              <button
                onClick={() => {
                  setRenameValue(selected.title);
                  setDialog({ kind: "rename", title: selected.title });
                }}
                className="rounded-lg px-2 py-1.5 text-[12.5px] text-ink-secondary hover:bg-raised hover:text-ink"
              >
                Rename
              </button>
              <button onClick={() => setDialog({ kind: "delete" })} className="rounded-lg px-2 py-1.5 text-[12.5px] text-ink-secondary hover:bg-danger/15 hover:text-danger">
                Delete
              </button>
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
                      Ask anything. Pick the teaching brain above — Settings only stores keys, not the model for this lesson.
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
                    placeholder={currentProvider?.configured ? "Ask a question or create something" : "Connect a teaching brain in Settings first"}
                    className="max-h-[9rem] min-h-6 min-w-0 flex-1 resize-none self-center bg-transparent px-1.5 py-1 text-[15px] leading-6 text-ink placeholder:text-ink-secondary"
                  />
                  <div className="mb-0.5 flex items-center gap-1">
                    <span className="mr-1 hidden rounded-full bg-inset px-2 py-0.5 text-[11px] text-ink-secondary sm:inline">
                      {currentProvider?.configured ? currentProvider.label : "No brain"}
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

      {screen === "library" && (
        <LibraryPage
          onBack={() => setScreen("home")}
          onStart={(title) => void newLesson(title)}
        />
      )}
      {screen === "memory" && (
        <MemoryPage onBack={() => setScreen("home")} onRequestClear={() => setDialog({ kind: "clear-memory" })} />
      )}
      {screen === "settings" && (
        <SettingsPage
          onBack={() => setScreen("home")}
          statuses={providerStatuses}
          setStatuses={setProviderStatuses}
          voiceReady={voiceReady}
          isDark={isDark}
          setIsDark={setIsDark}
        />
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

      {dialog?.kind === "lesson-menu" && (
        <DialogShell onClose={() => setDialog(null)}>
          <h2 className="text-[18px] font-semibold text-ink">Lesson</h2>
          <div className="mt-3 grid gap-1">
            <button
              className="rounded-lg px-3 py-2.5 text-left text-[14px] text-ink hover:bg-raised"
              onClick={() => {
                const id = dialog.id;
                setDialog(null);
                openLesson(id);
              }}
            >
              Open
            </button>
            <button
              className="rounded-lg px-3 py-2.5 text-left text-[14px] text-ink hover:bg-raised"
              onClick={() => {
                const item = conversations.find((c) => c.id === dialog.id);
                if (!item) return;
                setSelectedId(item.id);
                setRenameValue(item.title);
                setDialog({ kind: "rename", title: item.title });
              }}
            >
              Rename
            </button>
            <button
              className="rounded-lg px-3 py-2.5 text-left text-[14px] text-danger hover:bg-danger/10"
              onClick={async () => {
                const id = dialog.id;
                await window.opennbLM.conversations.delete(id);
                setConversations((items) => items.filter((i) => i.id !== id));
                if (selectedId === id) setSelectedId("");
                setDialog(null);
              }}
            >
              Delete
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
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">Library</h1>
        <p className="mt-2 text-[13.5px] text-ink-secondary">Starter paths — each opens a new lesson.</p>
        <div className="mt-8 divide-y divide-hairline/35 overflow-hidden rounded-2xl border border-hairline/40 bg-card">
          {FEATURED.map((row) => (
            <button key={row.title} onClick={() => onStart(row.title)} className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-raised/40">
              <span className="flex size-10 items-center justify-center rounded-xl bg-inset text-lg text-accent-text">{row.icon}</span>
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

function MemoryPage({ onBack, onRequestClear }: { onBack: () => void; onRequestClear: () => void }) {
  const [items, setItems] = useState<LearnerMemory[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void window.opennbLM.learnerMemory.list().then((next) => {
      setItems(next);
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
            <p className="mt-2 text-[13.5px] text-ink-secondary">Local learning notes — not a copy of every message.</p>
          </div>
          <button disabled={!items.length} onClick={onRequestClear} className="rounded-full px-3 py-1.5 text-[12.5px] text-danger hover:bg-danger/10 disabled:opacity-40">
            Clear
          </button>
        </div>
        {loading ? (
          <p className="mt-8 text-[13px] text-ink-secondary">Loading…</p>
        ) : !items.length ? (
          <div className="mt-8 rounded-2xl border border-hairline/40 bg-card px-4 py-5">
            <div className="text-[14px] font-medium text-ink">Your memory is clear</div>
            <div className="mt-1 text-[12.5px] text-ink-secondary">Notes appear here as you learn.</div>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {Object.entries(grouped).map(([kind, group]) => (
              <section key={kind}>
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
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Settings = connect engines + app prefs. Model choice lives in the lesson chat picker. */
function SettingsPage({
  onBack,
  statuses,
  setStatuses,
  voiceReady,
  isDark,
  setIsDark,
}: {
  onBack: () => void;
  statuses: ProviderStatus[];
  setStatuses: (v: ProviderStatus[]) => void;
  voiceReady: boolean;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
}) {
  const [focusId, setFocusId] = useState<ProviderId>(statuses.find((s) => !s.configured)?.id ?? statuses[0]?.id ?? "openai");
  const [keyInput, setKeyInput] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    setStatuses(await window.opennbLM.providers.list());
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-[13px] text-ink-secondary hover:text-ink">
          <ArrowLeft size={15} /> Home
        </button>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">Settings</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
          Connect teaching engines here. Choose which model to use inside each lesson — like OpenClaw, unconfigured engines ask for setup instead of pretending they work.
        </p>

        <div className="mt-8 grid gap-4">
          {statuses.map((item) => {
            const open = focusId === item.id;
            return (
              <div key={item.id} className="overflow-hidden rounded-2xl border border-hairline/40 bg-card">
                <button
                  type="button"
                  onClick={() => {
                    setFocusId(item.id);
                    setMessage("");
                    setKeyInput("");
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-raised/30"
                >
                  <div>
                    <div className="text-[15px] font-medium text-ink">{item.label}</div>
                    <div className="text-[12px] text-ink-secondary">{item.configured ? `Connected · default ${item.model}` : "Not connected"}</div>
                  </div>
                  <span className={cn("rounded-full border px-2.5 py-1 text-[11.5px]", item.configured ? "border-success/30 text-success" : "border-warning/30 text-warning")}>
                    {item.configured ? "Ready" : "Setup"}
                  </span>
                </button>
                {open && (
                  <div className="border-t border-hairline/30 px-4 py-4">
                    {item.id === "ollama" ? (
                      <p className="text-[13px] text-ink-secondary">Ollama uses your local runtime at 127.0.0.1. No API key needed.</p>
                    ) : (
                      <label className="block text-[12px] text-ink-secondary">
                        API key
                        <input
                          type="password"
                          autoComplete="off"
                          className="mt-1.5 w-full rounded-lg border border-hairline/40 bg-inset px-3 py-2.5 text-[13.5px] text-ink"
                          value={focusId === item.id ? keyInput : ""}
                          onChange={(e) => setKeyInput(e.target.value)}
                          placeholder={item.configured ? "Enter a replacement key" : "Paste your API key"}
                        />
                      </label>
                    )}
                    {item.id === "custom" && (
                      <label className="mt-3 block text-[12px] text-ink-secondary">
                        Endpoint
                        <input
                          className="mt-1.5 w-full rounded-lg border border-hairline/40 bg-inset px-3 py-2.5 text-[13.5px] text-ink"
                          value={endpoint}
                          onChange={(e) => setEndpoint(e.target.value)}
                          onBlur={async () => {
                            if (endpoint.trim()) await window.opennbLM.providers.setEndpoint("custom", endpoint);
                          }}
                          placeholder="http://127.0.0.1:8080/v1"
                        />
                      </label>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.id !== "ollama" && (
                        <button
                          className="rounded-full bg-accent px-3.5 py-2 text-[13px] font-medium text-white hover:brightness-110"
                          onClick={async () => {
                            if (!keyInput.trim()) return;
                            await window.opennbLM.providers.saveKey(item.id, keyInput);
                            setKeyInput("");
                            setMessage("Saved securely");
                            await refresh();
                          }}
                        >
                          {item.configured ? "Replace key" : "Add key"}
                        </button>
                      )}
                      <button
                        className="rounded-full border border-hairline/40 bg-raised px-3.5 py-2 text-[13px] text-ink hover:bg-raised-hover"
                        onClick={async () => {
                          setMessage("Testing…");
                          const result = await window.opennbLM.providers.test(item.id);
                          setStatuses(statuses.map((s) => (s.id === item.id ? result : s)));
                          setMessage(result.connection === "connected" ? "Connected" : result.error ?? "Failed");
                        }}
                      >
                        Test connection
                      </button>
                      {item.configured && item.id !== "ollama" && (
                        <button
                          className="rounded-full px-3 py-2 text-[13px] text-ink-secondary hover:text-danger"
                          onClick={async () => {
                            await window.opennbLM.providers.removeKey(item.id);
                            await refresh();
                            setMessage("Key removed");
                          }}
                        >
                          Remove key
                        </button>
                      )}
                      {message && focusId === item.id && <span className="self-center text-[12px] text-accent-text">{message}</span>}
                    </div>
                    <p className="mt-3 text-[12px] leading-relaxed text-ink-secondary">
                      After connecting, pick this engine’s model from the lesson chat header — not here.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 divide-y divide-hairline/35 overflow-hidden rounded-2xl border border-hairline/40 bg-card">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <div className="text-[14px] font-medium text-ink">Appearance</div>
              <div className="text-[12.5px] text-ink-secondary">Dark Graphite or light surfaces</div>
            </div>
            <button onClick={() => setIsDark(!isDark)} className="flex items-center gap-2 rounded-full border border-hairline/40 bg-raised px-3 py-2 text-[13px] text-ink">
              {isDark ? <Moon size={15} /> : <Sun size={15} />}
              {isDark ? "Dark" : "Light"}
            </button>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <div className="text-[14px] font-medium text-ink">Voice engine</div>
              <div className="text-[12.5px] text-ink-secondary">Rumik-OSS-1 · local</div>
            </div>
            <span className={cn("rounded-full border px-2.5 py-1 text-[11.5px]", voiceReady ? "border-success/30 text-success" : "border-warning/30 text-warning")}>
              {voiceReady ? "Ready" : "Not connected"}
            </span>
          </div>
          <div className="px-5 py-4 text-[12.5px] leading-relaxed text-ink-secondary">
            Your workspace is this machine: lessons, memory, and keys stay local. There is no separate “workspace settings” page.
          </div>
        </div>
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

createRoot(document.getElementById("root")!).render(
  <>
    <SetupBanner />
    <App />
  </>,
);
