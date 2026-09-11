import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  FileUp,
  Link2,
  Mic,
  NotebookPen,
  Plus,
  Search,
  Trash2,
  Volume2,
} from "lucide-react";
import type {
  InstanceInfo,
  ModelSelection,
  Notebook,
  NotebookNote,
  NotebookSearchHit,
  NotebookSource,
  PodcastEpisode,
  SourceContextLevel,
} from "@opennblm/contracts";
import { cn } from "../lib/cn";
import { ModelPicker } from "./ModelPicker";

type Tab = "sources" | "chat" | "notes" | "audio" | "search";

type ChatLine = {
  id: string;
  role: "user" | "assistant";
  text: string;
  usedFallback?: boolean;
  citations?: Array<{ sourceId: string; title: string; excerpt: string }>;
};

export function NotebookWorkspace({
  notebookId,
  onBack,
  engineInstances,
  modelSelection,
  onSelectModel,
  onRefreshEngines,
  brainReady,
}: {
  notebookId: string;
  onBack: () => void;
  engineInstances: InstanceInfo[];
  modelSelection: ModelSelection | null;
  onSelectModel: (next: ModelSelection) => Promise<void>;
  onRefreshEngines: () => Promise<void>;
  brainReady: boolean;
}) {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [tab, setTab] = useState<Tab>("sources");
  const [sources, setSources] = useState<NotebookSource[]>([]);
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [podcasts, setPodcasts] = useState<PodcastEpisode[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteTitle, setPasteTitle] = useState("Pasted notes");
  const [pasteBody, setPasteBody] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [askMode, setAskMode] = useState(false);
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<NotebookSearchHit[]>([]);
  const [speakerCount, setSpeakerCount] = useState(2);

  const refresh = async () => {
    const [nbList, nextSources, nextNotes, nextPodcasts] = await Promise.all([
      window.opennbLM.notebooks.list(),
      window.opennbLM.notebooks.listSources(notebookId),
      window.opennbLM.notebooks.listNotes(notebookId),
      window.opennbLM.notebooks.listPodcasts(notebookId),
    ]);
    setNotebook(nbList.find((n) => n.id === notebookId) ?? null);
    setSources(nextSources);
    setNotes(nextNotes);
    setPodcasts(nextPodcasts);
  };

  useEffect(() => {
    void refresh().catch((err) => setError(err instanceof Error ? err.message : "Failed to load notebook"));
  }, [notebookId]);

  useEffect(() => {
    void (async () => {
      const existing = (await window.opennbLM.conversations.list()).find(
        (c) => (c as { notebookId?: string }).notebookId === notebookId || c.title === notebook?.title,
      );
      if (existing) {
        setConversationId(existing.id);
        setChatLines(
          existing.messages.map((m) => ({
            id: m.id,
            role: m.role === "user" ? "user" : "assistant",
            text: m.text,
          })),
        );
        return;
      }
      const created = await window.opennbLM.conversations.create({
        learningTopic: notebook?.title || "Notebook chat",
        title: notebook?.title || "Notebook chat",
      });
      setConversationId(created.id);
    })().catch(() => undefined);
  }, [notebookId, notebook?.title]);

  const readyCount = useMemo(() => sources.filter((s) => s.status === "ready").length, [sources]);

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
      if (askMode) {
        const answer = await window.opennbLM.notebooks.ask(notebookId, text);
        setChatLines((lines) => [
          ...lines,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: answer.text,
            citations: answer.citations,
          },
        ]);
        await window.opennbLM.conversations.addMessage({
          conversationId,
          role: "assistant",
          text: answer.text,
        });
        return;
      }
      const response = await window.opennbLM.teaching.teach(conversationId, text, { notebookId });
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
        <NotebookPen size={15} className="text-accent-text" />
        <span className="truncate text-[13px] font-medium text-ink">{notebook?.title || "Notebook"}</span>
        <span className="text-[12px] text-ink-secondary">{readyCount} ready sources</span>
        <div className="flex-1" />
        <ModelPicker
          instances={engineInstances}
          selection={modelSelection}
          onSelect={onSelectModel}
          onRefresh={onRefreshEngines}
        />
      </div>

      <div className="flex gap-1 border-b border-hairline/25 px-4 py-2">
        {(
          [
            ["sources", "Sources"],
            ["chat", "Chat"],
            ["notes", "Notes"],
            ["search", "Search"],
            ["audio", "Audio"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12.5px]",
              tab === id ? "bg-raised text-ink" : "text-ink-secondary hover:bg-raised/50 hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mx-4 mt-3 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-[12.5px] text-warning">
          {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {tab === "sources" && (
          <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="space-y-4">
              <section className="rounded-2xl border border-hairline/35 bg-card p-4">
                <h3 className="text-[14px] font-medium text-ink">Paste text</h3>
                <input
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-hairline/40 bg-inset px-3 py-2 text-[13px] text-ink"
                  placeholder="Title"
                />
                <textarea
                  value={pasteBody}
                  onChange={(e) => setPasteBody(e.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-lg border border-hairline/40 bg-inset px-3 py-2 text-[13px] text-ink"
                  placeholder="Paste source material…"
                />
                <button
                  type="button"
                  disabled={busy || !pasteBody.trim()}
                  className="mt-2 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-medium text-black disabled:opacity-40"
                  onClick={() =>
                    void run(async () => {
                      await window.opennbLM.notebooks.addTextSource(notebookId, pasteTitle, pasteBody);
                      setPasteBody("");
                    })
                  }
                >
                  Add text source
                </button>
              </section>

              <section className="rounded-2xl border border-hairline/35 bg-card p-4">
                <h3 className="text-[14px] font-medium text-ink">Web or YouTube URL</h3>
                <div className="mt-2 flex gap-2">
                  <div className="relative flex-1">
                    <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
                    <input
                      value={urlValue}
                      onChange={(e) => setUrlValue(e.target.value)}
                      className="w-full rounded-lg border border-hairline/40 bg-inset py-2 pl-9 pr-3 text-[13px] text-ink"
                      placeholder="https://…"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy || !urlValue.trim()}
                    className="rounded-full bg-white px-3 py-1.5 text-[12.5px] font-medium text-black disabled:opacity-40"
                    onClick={() =>
                      void run(async () => {
                        await window.opennbLM.notebooks.addUrlSource(notebookId, urlValue.trim());
                        setUrlValue("");
                      })
                    }
                  >
                    Fetch
                  </button>
                </div>
                <p className="mt-2 text-[11.5px] text-ink-secondary">
                  YouTube uses captions when available. Audio/video without captions is not supported yet.
                </p>
              </section>

              <section className="rounded-2xl border border-hairline/35 bg-card p-4">
                <h3 className="text-[14px] font-medium text-ink">Upload file</h3>
                <p className="mt-1 text-[12px] text-ink-secondary">PDF, DOCX, PPTX, TXT, Markdown</p>
                <button
                  type="button"
                  disabled={busy}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-hairline/40 bg-raised px-3 py-1.5 text-[12.5px] text-ink disabled:opacity-40"
                  onClick={() =>
                    void run(async () => {
                      const path = await window.opennbLM.notebooks.pickSourceFile();
                      if (!path) return;
                      await window.opennbLM.notebooks.addFileSource(notebookId, path);
                    })
                  }
                >
                  <FileUp size={14} /> Choose file
                </button>
              </section>
            </div>

            <div className="space-y-2">
              <h3 className="text-[14px] font-medium text-ink">In notebook</h3>
              {sources.length === 0 ? (
                <p className="text-[13px] text-ink-secondary">No sources yet.</p>
              ) : (
                sources.map((source) => (
                  <div key={source.id} className="rounded-xl border border-hairline/35 bg-card p-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium text-ink">{source.title}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-ink-secondary">
                          <span className="rounded-full border border-hairline/40 px-2 py-0.5 uppercase">{source.kind}</span>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5",
                              source.status === "ready"
                                ? "border-success/30 text-success"
                                : source.status === "error"
                                  ? "border-warning/30 text-warning"
                                  : "border-hairline/40",
                            )}
                          >
                            {source.status}
                          </span>
                        </div>
                        {source.error ? <p className="mt-1 text-[11.5px] text-warning">{source.error}</p> : null}
                      </div>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-ink-secondary hover:bg-raised hover:text-ink"
                        onClick={() => void run(() => window.opennbLM.notebooks.removeSource(source.id))}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
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
                            "rounded-full px-2 py-0.5 text-[11px]",
                            source.contextLevel === level
                              ? "bg-white text-black"
                              : "border border-hairline/40 text-ink-secondary hover:text-ink",
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "chat" && (
          <div className="mx-auto flex max-w-3xl flex-col gap-3 pb-28">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAskMode(false)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px]",
                  !askMode ? "bg-white text-black" : "border border-hairline/40 text-ink-secondary",
                )}
              >
                Teach / chat
              </button>
              <button
                type="button"
                onClick={() => setAskMode(true)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px]",
                  askMode ? "bg-white text-black" : "border border-hairline/40 text-ink-secondary",
                )}
              >
                Ask (synthesize)
              </button>
            </div>
            {chatLines.length === 0 ? (
              <p className="py-10 text-center text-[13.5px] text-ink-secondary">
                Ask grounded questions about your sources. Rumik speaks answers when voice is ready.
              </p>
            ) : null}
            {chatLines.map((line) => (
              <div key={line.id} className={cn("flex", line.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[min(42rem,85%)] rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap",
                    line.role === "user" ? "bg-bubble-user text-ink" : "bg-card text-ink",
                  )}
                >
                  {line.text}
                  {line.usedFallback ? (
                    <div className="mt-2 text-[11px] text-warning">Offline teaching fallback — connect a brain for fuller answers.</div>
                  ) : null}
                  {line.citations?.length ? (
                    <div className="mt-2 space-y-1 border-t border-hairline/30 pt-2 text-[11.5px] text-ink-secondary">
                      {line.citations.map((c, i) => (
                        <div key={`${c.sourceId}-${i}`}>
                          [{i + 1}] {c.title} — {c.excerpt.slice(0, 120)}
                          {c.excerpt.length > 120 ? "…" : ""}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            <form onSubmit={(e) => void submitChat(e)} className="fixed bottom-6 left-1/2 z-10 w-[min(42rem,calc(100%-2rem))] -translate-x-1/2">
              <div className="flex gap-2 rounded-2xl border border-hairline/40 bg-panel p-2 shadow-xl shadow-black/30">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={askMode ? "Ask across sources…" : "Chat with this notebook…"}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[14px] text-ink outline-none"
                />
                <button
                  type="submit"
                  disabled={busy || !chatInput.trim()}
                  className="rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black disabled:opacity-40"
                >
                  {busy ? "…" : "Send"}
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === "notes" && (
          <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-hairline/35 bg-card p-4">
              <h3 className="text-[14px] font-medium text-ink">Write a note</h3>
              <input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Title"
                className="w-full rounded-lg border border-hairline/40 bg-inset px-3 py-2 text-[13px] text-ink"
              />
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={6}
                placeholder="Your notes…"
                className="w-full rounded-lg border border-hairline/40 bg-inset px-3 py-2 text-[13px] text-ink"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !noteBody.trim()}
                  className="rounded-full bg-white px-3 py-1.5 text-[12.5px] font-medium text-black disabled:opacity-40"
                  onClick={() =>
                    void run(async () => {
                      await window.opennbLM.notebooks.createNote(notebookId, {
                        title: noteTitle.trim() || "Note",
                        body: noteBody,
                        kind: "manual",
                      });
                      setNoteTitle("");
                      setNoteBody("");
                    })
                  }
                >
                  Save note
                </button>
                {(["summarize", "concepts", "faq"] as const).map((transform) => (
                  <button
                    key={transform}
                    type="button"
                    disabled={busy || !brainReady}
                    className="rounded-full border border-hairline/40 px-3 py-1.5 text-[12.5px] text-ink-secondary hover:text-ink disabled:opacity-40"
                    onClick={() => void run(() => window.opennbLM.notebooks.transformNote(notebookId, transform).then(() => undefined))}
                  >
                    AI {transform}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {notes.map((note) => (
                <div key={note.id} className="rounded-xl border border-hairline/35 bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[13.5px] font-medium text-ink">{note.title}</div>
                      <div className="text-[11px] uppercase text-ink-secondary">{note.kind}</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Read with Rumik"
                        className="rounded-md p-1.5 text-ink-secondary hover:bg-raised"
                        onClick={() => void window.opennbLM.rumik.synthesize(note.body).catch(() => undefined)}
                      >
                        <Volume2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-ink-secondary hover:bg-raised"
                        onClick={() => void run(() => window.opennbLM.notebooks.removeNote(note.id))}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-secondary">{note.body}</p>
                </div>
              ))}
              {notes.length === 0 ? <p className="text-[13px] text-ink-secondary">No notes yet.</p> : null}
            </div>
          </div>
        )}

        {tab === "search" && (
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-hairline/40 bg-card py-2.5 pl-9 pr-3 text-[14px] text-ink"
                  placeholder="Search sources and notes…"
                />
              </div>
              <button
                type="button"
                disabled={busy || !searchQuery.trim()}
                className="rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black disabled:opacity-40"
                onClick={() =>
                  void run(async () => {
                    setSearchHits(await window.opennbLM.notebooks.search(searchQuery, notebookId));
                  })
                }
              >
                Search
              </button>
            </div>
            {searchHits.map((hit, i) => (
              <div key={`${hit.id}-${i}`} className="rounded-xl border border-hairline/35 bg-card p-3">
                <div className="text-[11px] uppercase text-ink-secondary">
                  {hit.kind} · {hit.title}
                </div>
                <p className="mt-1 text-[13px] text-ink">{hit.excerpt}</p>
              </div>
            ))}
            {searchHits.length === 0 && searchQuery ? (
              <p className="text-[13px] text-ink-secondary">No matches yet. Try another phrase.</p>
            ) : null}
          </div>
        )}

        {tab === "audio" && (
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="rounded-2xl border border-hairline/35 bg-card p-4">
              <h3 className="text-[14px] font-medium text-ink">Study audio overview</h3>
              <p className="mt-1 text-[12.5px] text-ink-secondary">
                Script from your sources, spoken with 1–4 Rumik voices.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="text-[12.5px] text-ink-secondary">
                  Speakers{" "}
                  <select
                    value={speakerCount}
                    onChange={(e) => setSpeakerCount(Number(e.target.value))}
                    className="ml-1 rounded-lg border border-hairline/40 bg-inset px-2 py-1 text-ink"
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={busy || !brainReady}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-black disabled:opacity-40"
                  onClick={() =>
                    void run(async () => {
                      await window.opennbLM.notebooks.createPodcast(notebookId, { speakers: speakerCount });
                    })
                  }
                >
                  <Mic size={14} /> Generate with Rumik
                </button>
              </div>
            </div>
            {podcasts.map((ep) => (
              <div key={ep.id} className="rounded-xl border border-hairline/35 bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[14px] font-medium text-ink">{ep.title}</div>
                    <div className="text-[11.5px] text-ink-secondary">
                      {ep.status} · {ep.speakers.join(", ")}
                    </div>
                  </div>
                </div>
                {ep.error ? <p className="mt-2 text-[12px] text-warning">{ep.error}</p> : null}
                {ep.status === "ready" && ep.audioPaths.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {ep.audioPaths.map((path, idx) => (
                      <audio
                        key={`${path}-${idx}`}
                        controls
                        className="w-full"
                        src={`file:///${path.replace(/\\/g, "/")}`}
                      />
                    ))}
                    <p className="text-[11px] text-ink-secondary">
                      Files stay on this machine. Paths: {ep.audioPaths.length} segment(s).
                    </p>
                  </div>
                ) : null}
                {ep.script ? (
                  <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-inset p-3 text-[12px] text-ink-secondary">
                    {ep.script}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function NotebookHomeSection({
  notebooks,
  onOpen,
  onCreate,
  onRemove,
}: {
  notebooks: Notebook[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-[22px] font-medium tracking-[-0.02em] text-ink">Notebooks</h2>
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
          <span className="text-[14px]">Create notebook</span>
        </button>
        {notebooks.map((nb) => (
          <div
            key={nb.id}
            className="group relative flex min-h-[160px] flex-col rounded-2xl border border-hairline/35 bg-card p-4 transition hover:border-hairline/60"
          >
            <button
              type="button"
              className="absolute right-2 top-2 rounded-md p-1.5 text-ink-secondary opacity-0 hover:bg-raised group-hover:opacity-100"
              onClick={() => onRemove(nb.id)}
              aria-label="Delete notebook"
            >
              <Trash2 size={14} />
            </button>
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
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
