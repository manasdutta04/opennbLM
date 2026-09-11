import type { NotebookStore } from "@opennblm/memory";
import type { NotebookSource, SourceKind } from "@opennblm/contracts";
import { chunkText, extractPlainText, fetchUrlText } from "./ingest.js";

export async function ingestTextSource(
  store: NotebookStore,
  notebookId: string,
  title: string,
  text: string,
): Promise<NotebookSource> {
  const source = store.createSource({
    notebookId,
    kind: "text",
    title: title.trim() || "Pasted text",
    status: "processing",
  });
  try {
    const chunks = chunkText(text);
    if (!chunks.length) throw new Error("No text content to index");
    store.replaceChunks(source.id, notebookId, chunks);
    return store.updateSource(source.id, { status: "ready", error: null });
  } catch (error) {
    return store.updateSource(source.id, {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to ingest text",
    });
  }
}

export async function ingestUrlSource(store: NotebookStore, notebookId: string, url: string): Promise<NotebookSource> {
  const source = store.createSource({
    notebookId,
    kind: "url",
    title: url,
    url,
    status: "processing",
  });
  try {
    const fetched = await fetchUrlText(url);
    const kind: SourceKind = fetched.kind === "youtube" ? "youtube" : "url";
    const chunks = chunkText(fetched.text);
    if (!chunks.length) throw new Error("No extractable text from URL");
    store.replaceChunks(source.id, notebookId, chunks);
    return store.updateSource(source.id, { status: "ready", title: fetched.title, kind, error: null });
  } catch (error) {
    return store.updateSource(source.id, {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to ingest URL",
    });
  }
}

export async function ingestFileSource(store: NotebookStore, notebookId: string, filePath: string): Promise<NotebookSource> {
  const source = store.createSource({
    notebookId,
    kind: "pdf",
    title: filePath.split(/[/\\]/).pop() || "File",
    localPath: filePath,
    status: "processing",
  });
  try {
    const extracted = await extractPlainText(filePath);
    const chunks = chunkText(extracted.text);
    if (!chunks.length) throw new Error("No extractable text from file");
    store.replaceChunks(source.id, notebookId, chunks);
    return store.updateSource(source.id, {
      status: "ready",
      title: extracted.title,
      kind: extracted.kind,
      error: null,
    });
  } catch (error) {
    return store.updateSource(source.id, {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to ingest file",
    });
  }
}

export function buildSourceContext(store: NotebookStore, notebookId: string, question: string, limit = 6): {
  context: string;
  citations: Array<{ sourceId: string; title: string; excerpt: string }>;
} {
  const hits = store.searchChunks(question, notebookId, limit);
  const fallback = hits.length
    ? hits
    : store
        .listChunks(notebookId, { excludeExcluded: true })
        .slice(0, limit)
        .map((chunk) => {
          const source = store.listSources(notebookId).find((item) => item.id === chunk.sourceId);
          return { ...chunk, title: source?.title || "Source" };
        });

  const citations = fallback.map((hit) => ({
    sourceId: hit.sourceId,
    title: "title" in hit ? String((hit as { title: string }).title) : "Source",
    excerpt: hit.text.slice(0, 280),
  }));

  const context = fallback
    .map((hit, index) => {
      const title = "title" in hit ? String((hit as { title: string }).title) : "Source";
      return `[${index + 1}] (${title})\n${hit.text.slice(0, 1200)}`;
    })
    .join("\n\n");

  return { context, citations };
}

export function defaultTransformPrompt(
  transform: "summarize" | "concepts" | "faq",
  material: string,
): { title: string; instruction: string } {
  if (transform === "summarize") {
    return {
      title: "Summary",
      instruction: `Write a clear summary note from these notebook sources:\n\n${material.slice(0, 12000)}`,
    };
  }
  if (transform === "concepts") {
    return {
      title: "Key concepts",
      instruction: `Extract key concepts and short definitions from these notebook sources:\n\n${material.slice(0, 12000)}`,
    };
  }
  return {
    title: "FAQ",
    instruction: `Create a short FAQ (5–8 Q&A pairs) grounded in these notebook sources:\n\n${material.slice(0, 12000)}`,
  };
}

export function buildPodcastScriptPrompt(material: string, speakerNames: string[]): string {
  return `Create a short study-audio dialogue script (about 600–900 words) for speakers: ${speakerNames.join(", ")}.
Format each line as "SpeakerName: dialogue".
Ground the conversation in these notebook sources. Keep it educational and conversational.

SOURCES:
${material.slice(0, 14000)}`;
}

export { chunkText, extractPlainText, fetchUrlText } from "./ingest.js";
