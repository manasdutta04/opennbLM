import type { IpcMain } from "electron";
import { dialog } from "electron";
import type { BrowserWindow } from "electron";
import type { NotebookStore } from "@opennblm/memory";
import type { LLMProvider } from "@opennblm/llm-providers";
import {
  buildPodcastScriptPrompt,
  buildSourceContext,
  defaultTransformPrompt,
  ingestFileSource,
  ingestTextSource,
  ingestUrlSource,
} from "@opennblm/notebook-runtime";
import type { createRumikManager } from "@opennblm/rumik-runtime";
import { RUMIK_SPEAKERS } from "@opennblm/rumik-runtime";

type Rumik = ReturnType<typeof createRumikManager>;

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

  ipcMain.handle("notebooks:transform-note", async (_e, notebookId: string, transform: "summarize" | "concepts" | "faq") => {
    const chunks = store().listChunks(notebookId, { excludeExcluded: true });
    const material = chunks.map((c) => c.text).join("\n\n");
    if (!material.trim()) throw new Error("Add ready sources before generating an AI note.");
    const { provider, model } = await getProvider();
    const prompt = defaultTransformPrompt(transform, material);
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
  });

  ipcMain.handle("notebooks:ask", async (_e, notebookId: string, question: string) => {
    const { context, citations } = buildSourceContext(store(), notebookId, question);
    if (!context.trim()) throw new Error("Add ready sources before asking.");
    const { provider, model } = await getProvider();
    const response = await provider.chat({
      model,
      messages: [
        {
          role: "system",
          content:
            "Answer using only the provided notebook excerpts. Write a clear research answer with natural citations like [1].",
        },
        { role: "user", content: `Question: ${question}\n\nExcerpts:\n${context}` },
      ],
    });
    const text = response.content.trim();
    const rumik = getRumik();
    const healthy = await rumik.healthCheck().catch(() => false);
    if (healthy) {
      void rumik.synthesize(text, { deliveryDescription: "professional, steady pace", language: "English" }).catch(() => undefined);
    }
    return { text, citations };
  });

  ipcMain.handle("notebooks:list-podcasts", (_e, notebookId: string) => store().listPodcasts(notebookId));
  ipcMain.handle(
    "notebooks:create-podcast",
    async (_e, notebookId: string, options?: { title?: string; speakers?: number }) => {
      const speakerCount = Math.min(4, Math.max(1, options?.speakers ?? 2));
      const speakers = [...RUMIK_SPEAKERS].slice(0, speakerCount);
      const episode = store().createPodcast({
        notebookId,
        title: options?.title?.trim() || "Study audio overview",
        speakers,
        status: "processing",
      });
      try {
        const chunks = store().listChunks(notebookId, { excludeExcluded: true });
        const material = chunks.map((c) => c.text).join("\n\n");
        if (!material.trim()) throw new Error("Add ready sources before creating study audio.");
        const { provider, model } = await getProvider();
        const scriptResponse = await provider.chat({
          model,
          messages: [
            { role: "system", content: "You write short educational dialogue scripts. Plain text only." },
            { role: "user", content: buildPodcastScriptPrompt(material, speakers) },
          ],
        });
        const script = scriptResponse.content.trim();
        store().updatePodcast(episode.id, { script });
        const rumik = getRumik();
        const healthy = await rumik.healthCheck().catch(() => false);
        if (!healthy) throw new Error(rumik.getStatus().error || "Rumik voice is not available");
        const lines = script
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean);
        const audioPaths: string[] = [];
        for (const line of lines.slice(0, 24)) {
          const match = line.match(/^([A-Za-z]+)\s*:\s*(.+)$/);
          const speakerName = match?.[1];
          const speaker = (
            speakerName && (speakers as string[]).includes(speakerName) ? speakerName : speakers[0]
          ) as "Ira" | "Aisha" | "Siya" | "Zoya";
          const text = match?.[2] || line;
          const result = await rumik.synthesize(text, {
            speaker,
            language: "English",
            deliveryDescription: "warm, conversational, steady pace",
            maxTokens: 512,
          });
          for (const segment of result.segments) audioPaths.push(segment.wavPath);
        }
        void audioDir;
        return store().updatePodcast(episode.id, { status: "ready", audioPaths, error: null });
      } catch (error) {
        return store().updatePodcast(episode.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Study audio failed",
        });
      }
    },
  );
}
