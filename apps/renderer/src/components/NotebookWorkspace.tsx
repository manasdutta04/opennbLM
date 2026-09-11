import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FileText,
  FileUp,
  Link2,
  Mic,
  Network,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  Table2,
  Trash2,
  Volume2,
} from "lucide-react";
import type {
  AudioOverviewFormat,
  AudioOverviewLength,
  InstanceInfo,
  ModelSelection,
  Notebook,
  NotebookNote,
  NotebookSource,
  PodcastEpisode,
  SourceContextLevel,
  StudioArtifact,
  StudioArtifactKind,
} from "@opennblm/contracts";
import { cn } from "../lib/cn";
import { ModelPicker } from "./ModelPicker";
import { OverflowMenu } from "./OverflowMenu";

type ChatLine = {
  id: string;
  role: "user" | "assistant";
  text: string;
  usedFallback?: boolean;
  citations?: Array<{ sourceId: string; title: string; excerpt: string }>;
};

const STUDIO_LANGUAGES = [
  "English",
  "Hindi",
  "Bengali",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Punjabi",
  "Tamil",
  "Telugu",
];

const STUDIO_TILES: Array<{
  kind: Exclude<StudioArtifactKind, "audio_overview" | "note"> | "audio_overview";
  label: string;
  detail: string;
  accent: string;
}> = [
  { kind: "audio_overview", label: "Audio Overview", detail: "Rumik study podcast", accent: "text-[#b8a0ff]" },
  { kind: "slide_deck", label: "Slide deck", detail: "Teaching slides", accent: "text-[#e6c35c]" },
  { kind: "mind_map", label: "Mind Map", detail: "Concept tree", accent: "text-[#f0a0c0]" },
  { kind: "report", label: "Reports", detail: "Briefing note", accent: "text-[#d4b87a]" },
  { kind: "flashcards", label: "Flashcards", detail: "Recall cards", accent: "text-[#e8a06a]" },
  { kind: "quiz", label: "Quiz", detail: "Check understanding", accent: "text-[#7ab0e8]" },
  { kind: "infographic", label: "Infographic", detail: "Visual gist", accent: "text-[#e87a7a]" },
  { kind: "data_table", label: "Data table", detail: "Compare facts", accent: "text-[#7ad0c8]" },
];

function parseMaybeJson(body: string): unknown {
  try {
    const trimmed = body.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    /* plain text */
  }
  return null;
}

export function NotebookWorkspace({
  notebookId,
  onBack,
  onRenamed,
  engineInstances,
  modelSelection,
  onSelectModel,
  onRefreshEngines,
  brainReady,
}: {
  notebookId: string;
  onBack: () => void;
  onRenamed?: (notebook: Notebook) => void;
  engineInstances: InstanceInfo[];
  modelSelection: ModelSelection | null;
  onSelectModel: (next: ModelSelection) => Promise<void>;
  onRefreshEngines: () => Promise<void>;
  brainReady: boolean;
}) {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [sources, setSources] = useState<NotebookSource[]>([]);
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [artifacts, setArtifacts] = useState<StudioArtifact[]>([]);
  const [podcasts, setPodcasts] = useState<PodcastEpisode[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [studioOpen, setStudioOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [pasteTitle, setPasteTitle] = useState("Pasted notes");
  const [pasteBody, setPasteBody] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [guide, setGuide] = useState("");
  const [guideLoading, setGuideLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [studioLanguage, setStudioLanguage] = useState("English");
  const [audioOpen, setAudioOpen] = useState(false);
  const [audioFormat, setAudioFormat] = useState<AudioOverviewFormat>("deep_dive");
  const [audioLength, setAudioLength] = useState<AudioOverviewLength>("default");
  const [focusPrompt, setFocusPrompt] = useState("");
  const [activeArtifact, setActiveArtifact] = useState<StudioArtifact | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const guideTimer = useRef<number | undefined>(undefined);
  const selectedKey = useMemo(() => [...selectedIds].sort().join(","), [selectedIds]);

  const refresh = async () => {
    const [nbList, nextSources, nextNotes, nextArtifacts, nextPodcasts] = await Promise.all([
      window.opennbLM.notebooks.list(),
      window.opennbLM.notebooks.listSources(notebookId),
      window.opennbLM.notebooks.listNotes(notebookId),
      window.opennbLM.notebooks.listArtifacts(notebookId),
      window.opennbLM.notebooks.listPodcasts(notebookId),
    ]);
    const nb = nbList.find((n) => n.id === notebookId) ?? null;
    setNotebook(nb);
    setSources(nextSources);
    setNotes(nextNotes);
    setArtifacts(nextArtifacts);
    setPodcasts(nextPodcasts);
    setSelectedIds((prev) => {
      const existing = new Set(nextSources.map((s) => s.id));
      const ready = nextSources.filter((s) => s.status === "ready").map((s) => s.id);
      const kept = [...prev].filter((id) => existing.has(id));
      if (kept.length === 0) return new Set(ready);
      return new Set(kept);
    });
  };

  useEffect(() => {
    void refresh().catch((err) => setError(err instanceof Error ? err.message : "Failed to load notebook"));
  }, [notebookId]);

  useEffect(() => {
    void (async () => {
      const created = await window.opennbLM.conversations.create({
        learningTopic: notebook?.title || "Notebook chat",
        title: `${notebook?.title || "Notebook"} · chat`,
      });
      setConversationId(created.id);
      setChatLines([]);
    })().catch(() => undefined);
  }, [notebookId]);

  useEffect(() => {
    if (!brainReady || selectedIds.size === 0) {
      setGuide(selectedIds.size === 0 ? "Select sources on the left to build a notebook guide." : "");
      return;
    }
    window.clearTimeout(guideTimer.current);
    guideTimer.current = window.setTimeout(() => {
      setGuideLoading(true);
      void window.opennbLM.notebooks
        .generateGuide(notebookId, { sourceIds: [...selectedIds], language: studioLanguage })
        .then((res) => setGuide(res.text))
        .catch(() => setGuide("Could not generate a guide yet. Connect a brain and try again."))
        .finally(() => setGuideLoading(false));
    }, 500);
    return () => window.clearTimeout(guideTimer.current);
  }, [notebookId, selectedKey, brainReady, studioLanguage]);

  const filteredSources = useMemo(() => {
    const q = sourceFilter.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter((s) => s.title.toLowerCase().includes(q) || s.kind.includes(q));
  }, [sources, sourceFilter]);

  const selectedReadyCount = useMemo(
    () => sources.filter((s) => selectedIds.has(s.id) && s.status === "ready").length,
    [sources, selectedIds],
  );

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const toggleAll = (on: boolean) => {
    if (on) setSelectedIds(new Set(sources.filter((s) => s.status === "ready").map((s) => s.id)));
    else setSelectedIds(new Set());
  };

  const submitChat = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text || !conversationId || busy) return;
    if (!brainReady) {
      setError("Connect a teaching brain first.");
      return;
    }
    setChatInput("");
    setChatLines((lines) => [...lines, { id: `u-${Date.now()}`, role: "user", text }]);
    await run(async () => {
      await window.opennbLM.conversations.addMessage({ conversationId, role: "user", text });
      const response = await window.opennbLM.teaching.teach(conversationId, text, {
        notebookId,
        sourceIds: [...selectedIds],
        language: studioLanguage,
      });
      setChatLines((lines) => [
        ...lines,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: response.text,
          usedFallback: response.usedFallback,
          citations: response.citations,
        },
      ]);
    });
  };

  const generateAudio = () =>
    void run(async () => {
      await window.opennbLM.notebooks.createPodcast(notebookId, {
        format: audioFormat,
        length: audioLength,
        language: studioLanguage,
        sourceIds: [...selectedIds],
        focusPrompt: focusPrompt || undefined,
      });
      setAudioOpen(false);
    });

  const generateTile = (kind: Exclude<StudioArtifactKind, "audio_overview" | "note">) =>
    void run(async () => {
      const art = await window.opennbLM.notebooks.generateArtifact(notebookId, kind, {
        sourceIds: [...selectedIds],
        language: studioLanguage,
        focusPrompt: focusPrompt || undefined,
      });
      setActiveArtifact(art);
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline/25 px-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-ink-secondary hover:bg-raised hover:text-ink"
        >
          <ArrowLeft size={15} /> Home
        </button>
        <div className="mx-1 h-4 w-px bg-hairline/40" />
        {renaming ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const updated = await window.opennbLM.notebooks.rename(notebookId, renameValue);
                setNotebook(updated);
                onRenamed?.(updated);
                setRenaming(false);
              });
            }}
          >
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="rounded-lg border border-hairline/40 bg-inset px-2 py-1 text-[13px] text-ink"
            />
            <button type="submit" className="text-[12px] text-accent-text">
              Save
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="truncate text-[13px] font-medium text-ink hover:underline"
            onClick={() => {
              setRenameValue(notebook?.title || "");
              setRenaming(true);
            }}
            title="Rename notebook"
          >
            {notebook?.title || "Notebook"}
          </button>
        )}
        <span className="text-[12px] text-ink-secondary">{selectedReadyCount} sources selected</span>
        <div className="flex-1" />
        <button
          type="button"
          className="rounded-md p-1.5 text-ink-secondary hover:bg-raised"
          onClick={() => setSourcesOpen((v) => !v)}
          title={sourcesOpen ? "Hide sources" : "Show sources"}
        >
          {sourcesOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
        </button>
        <button
          type="button"
          className="rounded-md p-1.5 text-ink-secondary hover:bg-raised"
          onClick={() => setStudioOpen((v) => !v)}
          title={studioOpen ? "Hide studio" : "Show studio"}
        >
          {studioOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
        </button>
        <ModelPicker
          instances={engineInstances}
          selection={modelSelection}
          onSelect={onSelectModel}
          onRefresh={onRefreshEngines}
        />
      </div>

      {error ? (
        <div className="mx-4 mt-2 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-[12.5px] text-warning">
          {error}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sources */}
        {sourcesOpen ? (
          <aside className="flex w-[280px] shrink-0 flex-col border-r border-hairline/25 bg-panel/40">
            <div className="border-b border-hairline/25 p-3">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-[13px] font-medium text-black"
                onClick={() => setShowAdd((v) => !v)}
              >
                <Plus size={15} /> Add sources
              </button>
              {showAdd ? (
                <div className="mt-3 space-y-2 rounded-xl border border-hairline/35 bg-card p-3">
                  <input
                    value={pasteTitle}
                    onChange={(e) => setPasteTitle(e.target.value)}
                    className="w-full rounded-lg border border-hairline/40 bg-inset px-2 py-1.5 text-[12px] text-ink"
                    placeholder="Paste title"
                  />
                  <textarea
                    value={pasteBody}
                    onChange={(e) => setPasteBody(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-hairline/40 bg-inset px-2 py-1.5 text-[12px] text-ink"
                    placeholder="Paste text…"
                  />
                  <button
                    type="button"
                    disabled={busy || !pasteBody.trim()}
                    className="w-full rounded-full border border-hairline/40 py-1.5 text-[12px] text-ink disabled:opacity-40"
                    onClick={() =>
                      void run(async () => {
                        await window.opennbLM.notebooks.addTextSource(notebookId, pasteTitle, pasteBody);
                        setPasteBody("");
                        setShowAdd(false);
                      })
                    }
                  >
                    Add text
                  </button>
                  <div className="flex gap-1">
                    <input
                      value={urlValue}
                      onChange={(e) => setUrlValue(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-hairline/40 bg-inset px-2 py-1.5 text-[12px] text-ink"
                      placeholder="URL / YouTube"
                    />
                    <button
                      type="button"
                      disabled={busy || !urlValue.trim()}
                      className="rounded-lg border border-hairline/40 px-2 text-[12px] disabled:opacity-40"
                      onClick={() =>
                        void run(async () => {
                          await window.opennbLM.notebooks.addUrlSource(notebookId, urlValue.trim());
                          setUrlValue("");
                          setShowAdd(false);
                        })
                      }
                    >
                      <Link2 size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-hairline/40 py-1.5 text-[12px]"
                    onClick={() =>
                      void run(async () => {
                        const path = await window.opennbLM.notebooks.pickSourceFile();
                        if (!path) return;
                        await window.opennbLM.notebooks.addFileSource(notebookId, path);
                        setShowAdd(false);
                      })
                    }
                  >
                    <FileUp size={14} /> Upload file
                  </button>
                </div>
              ) : null}
              <div className="relative mt-3">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-secondary" />
                <input
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  placeholder="Filter sources"
                  className="w-full rounded-lg border border-hairline/40 bg-inset py-1.5 pl-8 pr-2 text-[12px] text-ink"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-secondary">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={selectedReadyCount > 0 && selectedReadyCount === sources.filter((s) => s.status === "ready").length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                  Select all
                </label>
                <span>{sources.length} total</span>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {filteredSources.map((source) => (
                <div key={source.id} className="mb-1.5 rounded-xl border border-hairline/30 bg-card/80 p-2.5">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedIds.has(source.id)}
                      disabled={source.status !== "ready"}
                      onChange={(e) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(source.id);
                          else next.delete(source.id);
                          return next;
                        });
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-medium text-ink">{source.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1 text-[10.5px] uppercase text-ink-secondary">
                        <span>{source.kind}</span>
                        <span
                          className={cn(
                            source.status === "ready"
                              ? "text-success"
                              : source.status === "error"
                                ? "text-warning"
                                : "",
                          )}
                        >
                          {source.status}
                        </span>
                      </div>
                      {source.error ? <p className="mt-1 text-[11px] text-warning">{source.error}</p> : null}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(["full", "summary", "excluded"] as SourceContextLevel[]).map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() =>
                              void run(async () => {
                                await window.opennbLM.notebooks.setSourceContext(source.id, level);
                              })
                            }
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px]",
                              source.contextLevel === level
                                ? "bg-white text-black"
                                : "border border-hairline/40 text-ink-secondary",
                            )}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded p-1 text-ink-secondary hover:bg-raised"
                      onClick={() => void run(() => window.opennbLM.notebooks.removeSource(source.id))}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredSources.length === 0 ? (
                <p className="p-3 text-[12.5px] text-ink-secondary">No sources yet. Add PDFs, links, or pasted text.</p>
              ) : null}
            </div>
          </aside>
        ) : null}

        {/* Chat + guide */}
        <section className="relative flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="mx-auto max-w-3xl">
              <div className="rounded-2xl border border-hairline/35 bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{notebook?.title || "Notebook"}</h1>
                    <p className="mt-1 text-[12px] text-ink-secondary">
                      {selectedReadyCount} source{selectedReadyCount === 1 ? "" : "s"} in guide
                    </p>
                  </div>
                  <NotebookPen size={20} className="text-accent-text opacity-80" />
                </div>
                <div className="mt-4 text-[14px] leading-relaxed whitespace-pre-wrap text-ink-secondary">
                  {guideLoading ? "Building notebook guide…" : guide || "Add and select sources to see a guide here."}
                </div>
              </div>

              <div className="mt-6 space-y-3 pb-28">
                {chatLines.map((line) => (
                  <div key={line.id} className={cn("flex", line.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[min(40rem,90%)] rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap",
                        line.role === "user" ? "bg-bubble-user text-ink" : "bg-card text-ink",
                      )}
                    >
                      {line.text}
                      {line.usedFallback ? (
                        <div className="mt-2 text-[11px] text-warning">Offline teaching fallback</div>
                      ) : null}
                      {line.citations?.length ? (
                        <div className="mt-2 space-y-1 border-t border-hairline/30 pt-2 text-[11px] text-ink-secondary">
                          {line.citations.map((c, i) => (
                            <div key={`${c.sourceId}-${i}`}>
                              [{i + 1}] {c.title}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <form
            onSubmit={(e) => void submitChat(e)}
            className="absolute inset-x-0 bottom-0 border-t border-hairline/25 bg-panel/95 px-4 py-3 backdrop-blur"
          >
            <div className="mx-auto flex max-w-3xl gap-2 rounded-2xl border border-hairline/40 bg-card p-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask a question or create something"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[14px] text-ink outline-none"
              />
              <span className="hidden items-center rounded-full border border-hairline/40 px-2.5 text-[11px] text-ink-secondary sm:inline-flex">
                {selectedReadyCount} sources
              </span>
              <button
                type="submit"
                disabled={busy || !chatInput.trim()}
                className="rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </form>
        </section>

        {/* Studio */}
        {studioOpen ? (
          <aside className="flex w-[300px] shrink-0 flex-col border-l border-hairline/25 bg-panel/40">
            <div className="border-b border-hairline/25 p-3">
              <div className="text-[12px] font-medium text-ink">Studio output language</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {STUDIO_LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setStudioLanguage(lang)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px]",
                      studioLanguage === lang ? "bg-white text-black" : "border border-hairline/40 text-ink-secondary",
                    )}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <input
                value={focusPrompt}
                onChange={(e) => setFocusPrompt(e.target.value)}
                placeholder="Optional focus (e.g. exam topics)"
                className="mt-2 w-full rounded-lg border border-hairline/40 bg-inset px-2 py-1.5 text-[12px] text-ink"
              />
            </div>

            {audioOpen ? (
              <div className="border-b border-hairline/25 p-3">
                <div className="text-[13px] font-medium text-ink">Audio Overview</div>
                <p className="mt-1 text-[11px] text-ink-secondary">
                  Gist-first story from selected sources. Longer takes more Rumik time.
                </p>
                <label className="mt-2 block text-[11px] text-ink-secondary">
                  Format
                  <select
                    value={audioFormat}
                    onChange={(e) => setAudioFormat(e.target.value as AudioOverviewFormat)}
                    className="mt-1 w-full rounded-lg border border-hairline/40 bg-inset px-2 py-1.5 text-[12px] text-ink"
                  >
                    <option value="deep_dive">Deep Dive</option>
                    <option value="brief">The Brief</option>
                    <option value="critique">The Critique</option>
                    <option value="debate">The Debate</option>
                  </select>
                </label>
                <label className="mt-2 block text-[11px] text-ink-secondary">
                  Length
                  <select
                    value={audioLength}
                    onChange={(e) => setAudioLength(e.target.value as AudioOverviewLength)}
                    className="mt-1 w-full rounded-lg border border-hairline/40 bg-inset px-2 py-1.5 text-[12px] text-ink"
                  >
                    <option value="shorter">Shorter (~1–2 min)</option>
                    <option value="default">Default (medium)</option>
                    <option value="longer">Longer (deep overview)</option>
                  </select>
                </label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={busy || !brainReady || selectedReadyCount === 0}
                    className="flex-1 rounded-full bg-white py-1.5 text-[12px] font-medium text-black disabled:opacity-40"
                    onClick={generateAudio}
                  >
                    Generate
                  </button>
                  <button type="button" className="rounded-full border border-hairline/40 px-3 text-[12px]" onClick={() => setAudioOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 p-3">
              {STUDIO_TILES.map((tile) => (
                <button
                  key={tile.kind}
                  type="button"
                  disabled={busy || !brainReady}
                  className="rounded-xl border border-hairline/35 bg-card p-3 text-left hover:bg-raised/50 disabled:opacity-40"
                  onClick={() => {
                    if (tile.kind === "audio_overview") setAudioOpen(true);
                    else generateTile(tile.kind);
                  }}
                >
                  <div className={cn("mb-2", tile.accent)}>
                    {tile.kind === "audio_overview" ? (
                      <Mic size={18} />
                    ) : tile.kind === "mind_map" ? (
                      <Network size={18} />
                    ) : tile.kind === "data_table" ? (
                      <Table2 size={18} />
                    ) : (
                      <FileText size={18} />
                    )}
                  </div>
                  <div className="text-[12.5px] font-medium text-ink">{tile.label}</div>
                  <div className="text-[10.5px] text-ink-secondary">{tile.detail}</div>
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto border-t border-hairline/25 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-medium text-ink">Generated</span>
                <button
                  type="button"
                  className="text-[11px] text-accent-text"
                  onClick={() =>
                    void run(async () => {
                      if (!noteDraft.trim()) {
                        setNoteDraft("New note");
                        return;
                      }
                      await window.opennbLM.notebooks.createNote(notebookId, {
                        title: "Note",
                        body: noteDraft,
                        kind: "manual",
                      });
                      setNoteDraft("");
                    })
                  }
                >
                  + Add note
                </button>
              </div>
              {noteDraft ? (
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={3}
                  className="mb-2 w-full rounded-lg border border-hairline/40 bg-inset px-2 py-1.5 text-[12px] text-ink"
                  placeholder="Write a note…"
                />
              ) : null}

              {[...artifacts].map((art) => (
                <button
                  key={art.id}
                  type="button"
                  className="mb-2 w-full rounded-xl border border-hairline/30 bg-card p-2.5 text-left hover:bg-raised/40"
                  onClick={() => setActiveArtifact(art)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[12.5px] font-medium text-ink">{art.title}</div>
                      <div className="text-[10.5px] uppercase text-ink-secondary">
                        {art.kind.replace(/_/g, " ")} · {art.status}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded p-1 text-ink-secondary hover:bg-raised"
                      onClick={(e) => {
                        e.stopPropagation();
                        void run(() => window.opennbLM.notebooks.removeArtifact(art.id));
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {art.error ? <p className="mt-1 text-[11px] text-warning">{art.error}</p> : null}
                </button>
              ))}

              {notes.map((note) => (
                <div key={note.id} className="mb-2 rounded-xl border border-hairline/30 bg-card p-2.5">
                  <div className="flex justify-between gap-2">
                    <div className="text-[12.5px] font-medium text-ink">{note.title}</div>
                    <button
                      type="button"
                      className="text-ink-secondary"
                      onClick={() => void window.opennbLM.rumik.synthesize(note.body).catch(() => undefined)}
                    >
                      <Volume2 size={13} />
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-3 text-[11.5px] text-ink-secondary">{note.body}</p>
                </div>
              ))}

              {podcasts
                .filter((p) => p.status === "ready" && p.audioPaths.length)
                .map((ep) => (
                  <div key={ep.id} className="mb-2 rounded-xl border border-hairline/30 bg-card p-2.5">
                    <div className="text-[12.5px] font-medium text-ink">{ep.title}</div>
                    <div className="mt-2 space-y-1">
                      {ep.audioPaths.slice(0, 8).map((path, idx) => (
                        <audio key={`${path}-${idx}`} controls className="w-full" src={`file:///${path.replace(/\\/g, "/")}`} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </aside>
        ) : null}
      </div>

      {activeArtifact ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-6" onMouseDown={() => setActiveArtifact(null)}>
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-hairline/50 bg-panel p-5 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-semibold text-ink">{activeArtifact.title}</h2>
                <p className="text-[12px] uppercase text-ink-secondary">{activeArtifact.kind.replace(/_/g, " ")}</p>
              </div>
              <button type="button" className="text-[13px] text-ink-secondary" onClick={() => setActiveArtifact(null)}>
                Close
              </button>
            </div>
            <ArtifactBody artifact={activeArtifact} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ArtifactBody({ artifact }: { artifact: StudioArtifact }) {
  const parsed = parseMaybeJson(artifact.body);
  if (artifact.kind === "mind_map" && parsed && typeof parsed === "object" && parsed && "root" in parsed) {
    const node = parsed as { root: string; children?: Array<{ label: string; children?: Array<{ label: string }> }> };
    return (
      <div className="mt-4 space-y-2 text-[13px] text-ink">
        <div className="font-semibold">{node.root}</div>
        {(node.children || []).map((c) => (
          <div key={c.label} className="ml-3 border-l border-hairline/40 pl-3">
            <div>{c.label}</div>
            {(c.children || []).map((g) => (
              <div key={g.label} className="ml-3 text-ink-secondary">
                · {g.label}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (artifact.kind === "flashcards" && parsed && typeof parsed === "object" && parsed && "cards" in parsed) {
    const cards = (parsed as { cards: Array<{ front: string; back: string }> }).cards || [];
    return (
      <div className="mt-4 space-y-2">
        {cards.map((c, i) => (
          <details key={i} className="rounded-xl border border-hairline/35 bg-card p-3 text-[13px]">
            <summary className="cursor-pointer font-medium text-ink">{c.front}</summary>
            <p className="mt-2 text-ink-secondary">{c.back}</p>
          </details>
        ))}
      </div>
    );
  }
  if (artifact.kind === "quiz" && parsed && typeof parsed === "object" && parsed && "questions" in parsed) {
    const questions = (parsed as { questions: Array<{ prompt: string; choices: string[]; answerIndex: number; explanation?: string }> }).questions || [];
    return (
      <div className="mt-4 space-y-3">
        {questions.map((q, i) => (
          <div key={i} className="rounded-xl border border-hairline/35 bg-card p-3 text-[13px]">
            <div className="font-medium text-ink">
              {i + 1}. {q.prompt}
            </div>
            <ul className="mt-2 space-y-1 text-ink-secondary">
              {(q.choices || []).map((choice, ci) => (
                <li key={ci} className={cn(ci === q.answerIndex && "text-success")}>
                  {choice}
                </li>
              ))}
            </ul>
            {q.explanation ? <p className="mt-2 text-[12px] text-ink-secondary">{q.explanation}</p> : null}
          </div>
        ))}
      </div>
    );
  }
  if (artifact.kind === "slide_deck" && parsed && typeof parsed === "object" && parsed && "slides" in parsed) {
    const slides = (parsed as { slides: Array<{ title: string; bullets: string[] }> }).slides || [];
    return (
      <div className="mt-4 space-y-3">
        {slides.map((s, i) => (
          <div key={i} className="rounded-xl border border-hairline/35 bg-card p-4">
            <div className="text-[11px] text-ink-secondary">Slide {i + 1}</div>
            <div className="text-[15px] font-semibold text-ink">{s.title}</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-ink-secondary">
              {(s.bullets || []).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }
  if (artifact.kind === "data_table" && parsed && typeof parsed === "object" && parsed && "columns" in parsed) {
    const table = parsed as { columns: string[]; rows: string[][] };
    return (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              {(table.columns || []).map((c) => (
                <th key={c} className="border border-hairline/40 bg-card px-2 py-1.5 text-left text-ink">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(table.rows || []).map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="border border-hairline/30 px-2 py-1.5 text-ink-secondary">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (artifact.kind === "infographic" && parsed && typeof parsed === "object" && parsed && "headline" in parsed) {
    const info = parsed as { headline: string; sections: Array<{ title: string; points: string[] }> };
    return (
      <div className="mt-4 space-y-3">
        <h3 className="text-[16px] font-semibold text-ink">{info.headline}</h3>
        {(info.sections || []).map((sec) => (
          <div key={sec.title} className="rounded-xl border border-hairline/35 bg-card p-3">
            <div className="font-medium text-ink">{sec.title}</div>
            <ul className="mt-1 list-disc pl-5 text-[13px] text-ink-secondary">
              {(sec.points || []).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }
  return <pre className="mt-4 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-secondary">{artifact.body}</pre>;
}

export function NotebookHomeSection({
  notebooks,
  onOpen,
  onCreate,
  onRemove,
  onRename,
}: {
  notebooks: Notebook[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onRemove: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-[22px] font-medium tracking-[-0.02em] text-ink">Recent notebooks</h2>
          <p className="mt-1 text-[13px] text-ink-secondary">Sources, grounded chat, and Studio — all local.</p>
        </div>
        <button type="button" onClick={onCreate} className="text-[13px] text-ink-secondary hover:text-ink">
          + New notebook
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <button
          type="button"
          onClick={onCreate}
          className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-hairline/50 text-ink-secondary transition hover:border-accent/40 hover:bg-card hover:text-ink"
        >
          <Plus size={26} />
          <span className="text-[14px]">Create new notebook</span>
        </button>
        {notebooks.map((nb) => (
          <div
            key={nb.id}
            className="group relative flex min-h-[160px] flex-col rounded-2xl border border-hairline/35 bg-card p-4 transition hover:border-hairline/60"
          >
            <div className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100">
              <OverflowMenu
                items={[
                  { label: "Open", onClick: () => onOpen(nb.id) },
                  { label: "Rename", onClick: () => onRename(nb.id, nb.title) },
                  { label: "Delete", danger: true, onClick: () => onRemove(nb.id) },
                ]}
              />
            </div>
            <button type="button" className="flex flex-1 flex-col items-start text-left" onClick={() => onOpen(nb.id)}>
              <NotebookPen size={28} className="text-accent-text" />
              <div className="mt-auto pt-6">
                <div className="line-clamp-2 text-[15px] font-semibold text-ink">{nb.title}</div>
                <div className="mt-1 text-[12px] text-ink-secondary">
                  {new Date(nb.updatedAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {" · "}
                  {nb.sourceCount ?? 0} sources
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
