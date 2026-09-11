import type { IpcMain } from "electron";
import { dialog } from "electron";
import type { BrowserWindow } from "electron";
import type { NotebookStore } from "@opennblm/memory";
import type { LLMProvider } from "@opennblm/llm-providers";
import type {
  AudioOverviewOptions,
  StudioArtifactKind,
} from "@opennblm/contracts";
import {
  audioLengthLimits,
  buildGuidePrompt,
  parseGuideResponse,
  parsePodcastScript,
  utterancesFromPodcastTurns,
  buildPodcastScriptPrompt,
  buildSourceContext,
  buildStudioArtifactPrompt,
  collectMaterial,
  defaultTransformPrompt,
  ingestFileSource,
  ingestTextSource,
  ingestUrlSource,
} from "@opennblm/notebook-runtime";
import type { createRumikManager } from "@opennblm/rumik-runtime";
import { concatWavFiles, RUMIK_SPEAKERS } from "@opennblm/rumik-runtime";
import { join } from "node:path";

type Rumik = ReturnType<typeof createRumikManager>;

function speakersForFormat(format: AudioOverviewOptions["format"], count?: number): string[] {
  if (format === "brief") return [RUMIK_SPEAKERS[0]!];
  const n = Math.min(4, Math.max(2, count ?? 2));
  return [...RUMIK_SPEAKERS].slice(0, n);
}

function sourceKey(ids?: string[]): string {
  return [...(ids ?? [])].sort().join(",");
}

export function registerNotebookHandlers(
  ipcMain: IpcMain,
  getStore: () => NotebookStore,
  getWindow: () => BrowserWindow | undefined,
  getProvider: () => Promise<{ provider: LLMProvider; model: string }>,
  getRumik: () => Rumik,
  audioDir: string,
) {
  const store = () => getStore();

  ipcMain.handle("notebooks:list", () => store().listNotebooks());
  ipcMain.handle("notebooks:create", (_e, title?: string) => store().createNotebook(title));
  ipcMain.handle("notebooks:rename", (_e, id: string, title: string) => store().renameNotebook(id, title));
  ipcMain.handle("notebooks:remove", (_e, id: string) => {
    store().removeNotebook(id);
  });
  ipcMain.handle("notebooks:list-sources", (_e, notebookId: string) => store().listSources(notebookId));
  ipcMain.handle("notebooks:add-text", (_e, notebookId: string, title: string, text: string) =>
    ingestTextSource(store(), notebookId, title, text),
  );
  ipcMain.handle("notebooks:add-url", (_e, notebookId: string, url: string) => ingestUrlSource(store(), notebookId, url));
  ipcMain.handle("notebooks:add-file", (_e, notebookId: string, filePath: string) =>
    ingestFileSource(store(), notebookId, filePath),
  );
  ipcMain.handle("notebooks:set-source-context", (_e, sourceId: string, level) =>
    store().updateSource(sourceId, { contextLevel: level }),
  );
  ipcMain.handle("notebooks:remove-source", (_e, sourceId: string) => {
    store().removeSource(sourceId);
  });
  ipcMain.handle("notebooks:list-notes", (_e, notebookId: string) => store().listNotes(notebookId));
  ipcMain.handle("notebooks:create-note", (_e, notebookId: string, input) => store().createNote(notebookId, input));
  ipcMain.handle("notebooks:update-note", (_e, noteId: string, input) => store().updateNote(noteId, input));
  ipcMain.handle("notebooks:remove-note", (_e, noteId: string) => {
    store().removeNote(noteId);
  });
  ipcMain.handle("notebooks:search", (_e, query: string, notebookId?: string) => store().searchAll(query, notebookId));
  ipcMain.handle("notebooks:list-artifacts", (_e, notebookId: string) => store().listArtifacts(notebookId));
  ipcMain.handle("notebooks:remove-artifact", (_e, artifactId: string) => {
    store().removeArtifact(artifactId);
  });
  ipcMain.handle("notebooks:pick-source-file", async () => {
    const win = getWindow();
    const result = await dialog.showOpenDialog(win!, {
      title: "Add source file",
      properties: ["openFile"],
      filters: [
        { name: "Documents", extensions: ["pdf", "txt", "md", "docx", "pptx", "html"] },
        { name: "All files", extensions: ["*"] },
      ],
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipcMain.handle(
    "notebooks:transform-note",
    async (
      _e,
      notebookId: string,
      transform: "summarize" | "concepts" | "faq",
      options?: { sourceIds?: string[]; language?: string },
    ) => {
      const material = collectMaterial(store(), notebookId, options?.sourceIds);
      if (!material.trim()) throw new Error("Add ready sources before generating an AI note.");
      const { provider, model } = await getProvider();
      const prompt = defaultTransformPrompt(transform, material, options?.language ?? "English");
      const response = await provider.chat({
        model,
        messages: [
          { role: "system", content: "You write concise study notes for a private local notebook. Return plain text only." },
          { role: "user", content: prompt.instruction },
        ],
      });
      return store().createNote(notebookId, {
        title: prompt.title,
        body: response.content.trim(),
        kind: "ai",
      });
    },
  );

  ipcMain.handle(
    "notebooks:ask",
    async (_e, notebookId: string, question: string, options?: { sourceIds?: string[]; language?: string }) => {
      const { context, citations } = buildSourceContext(store(), notebookId, question, 6, options?.sourceIds);
      if (!context.trim()) throw new Error("Add ready sources before asking.");
      const { provider, model } = await getProvider();
      const language = options?.language ?? "English";
      const response = await provider.chat({
        model,
        messages: [
          {
            role: "system",
            content: `Answer in ${language} using only the provided notebook excerpts. Write a clear research answer with natural citations like [1]. Focus on understanding, not dumping every detail.`,
          },
          { role: "user", content: `Question: ${question}\n\nExcerpts:\n${context}` },
        ],
      });
      const text = response.content.trim();
    return { text, citations };
  },
  );

  ipcMain.handle(
    "notebooks:generate-guide",
    async (_e, notebookId: string, options?: { sourceIds?: string[]; language?: string }) => {
      const language = options?.language ?? "English";
      const key = sourceKey(options?.sourceIds);
      const cached = store().getGuide(notebookId, language, key);
      if (cached) return { text: cached, cached: true as const };
      const material = collectMaterial(store(), notebookId, options?.sourceIds);
      if (!material.trim()) return { text: "Add sources on the left to generate a notebook guide.", cached: false as const };
      const { provider, model } = await getProvider();
      const response = await provider.chat({
        model,
        messages: [
          { role: "system", content: "You write concise notebook guides. Follow the TITLE + body format exactly." },
          { role: "user", content: buildGuidePrompt(material, language) },
        ],
      });
      const parsed = parseGuideResponse(response.content.trim());
      store().setGuide(notebookId, language, key, parsed.text);
      let title: string | undefined;
      const current = store().listNotebooks().find((n) => n.id === notebookId);
      const isDefaultTitle = !current?.title?.trim() || /^untitled notebook$/i.test(current.title.trim());
      if (parsed.title && isDefaultTitle) {
        try {
          const renamed = store().renameNotebook(notebookId, parsed.title);
          title = renamed.title;
        } catch {
          /* keep existing title */
        }
      }
      return { text: parsed.text, cached: false as const, title };
    },
  );

  ipcMain.handle(
    "notebooks:generate-artifact",
    async (
      _e,
      notebookId: string,
      kind: Exclude<StudioArtifactKind, "audio_overview" | "note">,
      options?: { sourceIds?: string[]; language?: string; focusPrompt?: string },
    ) => {
      const material = collectMaterial(store(), notebookId, options?.sourceIds);
      if (!material.trim()) throw new Error("Add ready sources before generating Studio output.");
      const artifact = store().createArtifact({
        notebookId,
        kind,
        title: kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        status: "processing",
      });
      try {
        const { provider, model } = await getProvider();
        const prompt = buildStudioArtifactPrompt(kind, material, options?.language ?? "English", options?.focusPrompt);
        const response = await provider.chat({
          model,
          messages: [
            { role: "system", content: "You generate structured study artifacts. Follow the output format exactly." },
            { role: "user", content: prompt.instruction },
          ],
        });
        return store().updateArtifact(artifact.id, {
          status: "ready",
          title: prompt.title,
          body: response.content.trim(),
          error: null,
        });
      } catch (error) {
        return store().updateArtifact(artifact.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Studio generation failed",
        });
      }
    },
  );

  ipcMain.handle("notebooks:list-podcasts", (_e, notebookId: string) => store().listPodcasts(notebookId));
  ipcMain.handle("notebooks:create-podcast", async (_e, notebookId: string, options?: AudioOverviewOptions) => {
    const format = options?.format ?? "deep_dive";
    const length = options?.length ?? "default";
    const language = options?.language ?? "English";
    const speakers = speakersForFormat(format, options?.speakers);
    const episode = store().createPodcast({
      notebookId,
      title: options?.title?.trim() || "Audio Overview",
      speakers,
      status: "processing",
    });
    const artifact = store().createArtifact({
      notebookId,
      kind: "audio_overview",
      title: episode.title,
      status: "processing",
      meta: {
        format,
        length,
        language,
        podcastId: episode.id,
        sourceCount: options?.sourceIds?.length ?? store().listSources(notebookId).filter((s) => s.status === "ready").length,
        phase: "script",
      },
    });
    try {
      const material = collectMaterial(store(), notebookId, options?.sourceIds);
      if (!material.trim()) throw new Error("Add ready sources before creating an Audio Overview.");
      const { provider, model } = await getProvider();
      const scriptResponse = await provider.chat({
        model,
        messages: [
          {
            role: "system",
            content:
              "You write polished educational podcast scripts meant to be spoken aloud. Every line must be a complete thought ending with punctuation. Never cut a sentence mid-way or jump topics abruptly. Plain text only as SpeakerName: dialogue.",
          },
          {
            role: "user",
            content: buildPodcastScriptPrompt(material, speakers, {
              format,
              length,
              language,
              focusPrompt: options?.focusPrompt,
            }),
          },
        ],
      });
      const script = scriptResponse.content.trim();
      store().updatePodcast(episode.id, { script });
      store().updateArtifact(artifact.id, {
        body: "",
        status: "processing",
        meta: {
          format,
          length,
          language,
          podcastId: episode.id,
          sourceCount: options?.sourceIds?.length,
          phase: "voice",
        },
      });
      const rumik = getRumik();
      const healthy = await rumik.healthCheck().catch(() => false);
      if (!healthy) throw new Error(rumik.getStatus().error || "Rumik voice is not available");
      const budget = audioLengthLimits(length);
      const turns = parsePodcastScript(script, speakers, budget.maxLines);
      if (!turns.length) throw new Error("Could not parse a usable Audio Overview script.");
      // One Rumik job per sentence — packing multiple sentences caused mid-utterance cuts / speaker jumps.
      const utterances = utterancesFromPodcastTurns(turns);
      const segmentPaths: string[] = [];
      for (let i = 0; i < utterances.length; i += 1) {
        const utterance = utterances[i]!;
        const speaker = (
          (speakers as string[]).includes(utterance.speaker) ? utterance.speaker : speakers[0]
        ) as "Ira" | "Aisha" | "Siya" | "Zoya";
        const result = await rumik.synthesize(utterance.text, {
          speaker,
          language,
          deliveryDescription: "warm, clear, conversational; speak the full sentence to the end at a steady pace",
          maxTokens: 2048,
          broadcast: false,
        });
        for (const segment of result.segments) segmentPaths.push(segment.wavPath);
      }
      if (!segmentPaths.length) throw new Error("Rumik produced no audio for this overview.");
      const mergedPath = join(audioDir, `overview-${episode.id}.wav`);
      // Pause between sentences so the next speaker never feels overlapped.
      concatWavFiles(segmentPaths, mergedPath, { gapMs: 450 });
      const audioPaths = [mergedPath];
      const ready = store().updatePodcast(episode.id, { status: "ready", audioPaths, error: null });
      store().updateArtifact(artifact.id, {
        status: "ready",
        // Keep script in meta only — not shown as body in the list
        body: "",
        audioPaths,
        error: null,
        meta: {
          format,
          length,
          language,
          podcastId: episode.id,
          sourceCount: options?.sourceIds?.length,
          phase: "ready",
          turnCount: turns.length,
          utteranceCount: utterances.length,
        },
      });
      return { ...ready, format, length, language };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Audio Overview failed";
      store().updateArtifact(artifact.id, { status: "error", error: message });
      return store().updatePodcast(episode.id, { status: "error", error: message });
    }
  });
}
