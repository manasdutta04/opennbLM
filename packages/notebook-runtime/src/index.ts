import type { NotebookStore } from "@opennblm/memory";
import type {
  AudioOverviewFormat,
  AudioOverviewLength,
  NotebookSource,
  SourceKind,
  StudioArtifactKind,
} from "@opennblm/contracts";
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

export function collectMaterial(
  store: NotebookStore,
  notebookId: string,
  sourceIds?: string[],
  maxChars = 14000,
): string {
  const chunks = store.listChunks(notebookId, { excludeExcluded: true, sourceIds });
  if (!chunks.length) return "";
  // Prefer evenly spaced chunks for long sources (gist, not page-by-page).
  const step = Math.max(1, Math.floor(chunks.length / 24));
  const sampled = chunks.filter((_, i) => i % step === 0).slice(0, 24);
  let out = "";
  for (const chunk of sampled) {
    const source = store.listSources(notebookId).find((s) => s.id === chunk.sourceId);
    const block = `(${source?.title || "Source"})\n${chunk.text}\n\n`;
    if (out.length + block.length > maxChars) break;
    out += block;
  }
  return out.trim();
}

export function buildSourceContext(
  store: NotebookStore,
  notebookId: string,
  question: string,
  limit = 6,
  sourceIds?: string[],
): {
  context: string;
  citations: Array<{ sourceId: string; title: string; excerpt: string }>;
} {
  const hits = store.searchChunks(question, notebookId, limit, { sourceIds, excludeExcluded: true });
  const fallback = hits.length
    ? hits
    : store
        .listChunks(notebookId, { excludeExcluded: true, sourceIds })
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
  language = "English",
): { title: string; instruction: string } {
  const lang = `Write in ${language}.`;
  if (transform === "summarize") {
    return {
      title: "Summary",
      instruction: `${lang} Write a clear summary note from these notebook sources. Focus on the core ideas, not a page-by-page retelling.\n\n${material.slice(0, 12000)}`,
    };
  }
  if (transform === "concepts") {
    return {
      title: "Key concepts",
      instruction: `${lang} Extract key concepts and short definitions from these notebook sources:\n\n${material.slice(0, 12000)}`,
    };
  }
  return {
    title: "FAQ",
    instruction: `${lang} Create a short FAQ (5–8 Q&A pairs) grounded in these notebook sources:\n\n${material.slice(0, 12000)}`,
  };
}

export function buildGuidePrompt(material: string, language = "English"): string {
  return `You are writing the notebook guide card for a private research notebook.
Language: ${language}.

Return exactly this shape:
Line 1: TITLE: <short notebook name, 2–6 words, no quotes, no trailing punctuation>
Then a blank line.
Then 2–4 short paragraphs that give a learner the gist of the selected sources: what the notebook is about, the core themes, and why they matter.
Do NOT list every section or retell documents page by page. Bold key terms with **markdown** sparingly.
The TITLE must be a concise subject label (examples: "AES Encryption", "Photosynthesis Basics", "Cyber Law Ethics").

Sources material:
${material.slice(0, 12000)}`;
}

export function parseGuideResponse(raw: string): { title?: string; text: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^TITLE:\s*(.+)\s*(?:\n+|$)/i);
  if (!match) return { text: trimmed };
  const title = match[1]!.replace(/^["']|["']$/g, "").trim().slice(0, 80);
  const text = trimmed.slice(match[0].length).trim();
  return { title: title || undefined, text: text || trimmed };
}

const LENGTH_WORDS: Record<AudioOverviewLength, { min: number; max: number; label: string; maxLines: number }> = {
  // Keep shorter truly short — each Rumik line is a full model pass and dominates wall time.
  shorter: { min: 120, max: 180, label: "about 45–75 seconds spoken", maxLines: 4 },
  default: { min: 350, max: 500, label: "a medium overview (a few minutes)", maxLines: 8 },
  longer: { min: 700, max: 950, label: "a deeper overview; still a gist, not a page-by-page read", maxLines: 12 },
};

export function audioLengthLimits(length: AudioOverviewLength = "default") {
  return LENGTH_WORDS[length];
}

export function buildPodcastScriptPrompt(
  material: string,
  speakerNames: string[],
  options?: {
    format?: AudioOverviewFormat;
    length?: AudioOverviewLength;
    language?: string;
    focusPrompt?: string;
  },
): string {
  const format = options?.format ?? "deep_dive";
  const length = options?.length ?? "default";
  const language = options?.language ?? "English";
  const budget = LENGTH_WORDS[length];
  const focus = options?.focusPrompt?.trim()
    ? `Focus instructions from the learner: ${options.focusPrompt.trim()}`
    : "";

  const formatGuide: Record<AudioOverviewFormat, string> = {
    deep_dive: `Deep Dive: lively conversation between ${speakerNames.join(" and ")} that unpacks and connects core topics.`,
    brief: `The Brief: a single host (${speakerNames[0]}) delivers key takeaways quickly.`,
    critique: `The Critique: ${speakerNames.slice(0, 2).join(" and ")} constructively evaluate the material.`,
    debate: `The Debate: ${speakerNames.slice(0, 2).join(" and ")} take opposing but fair perspectives on the topic.`,
  };

  return `Create an educational Audio Overview script in ${language}.
Format: ${formatGuide[format]}
HARD LIMITS (must obey):
- At most ${budget.max} words total (aim ${budget.min}–${budget.max}). ${budget.label}.
- At most ${budget.maxLines} dialogue lines total.
- Each line under 220 characters.
Style: story-like gist of the sources — CORE ideas only. Do NOT retell long documents.
Format each line as "SpeakerName: dialogue" using only these speakers: ${speakerNames.join(", ")}.
${focus}

SOURCES (excerpt):
${material.slice(0, length === "shorter" ? 5000 : length === "longer" ? 10000 : 8000)}`;
}

export function buildStudioArtifactPrompt(
  kind: Exclude<StudioArtifactKind, "audio_overview" | "note">,
  material: string,
  language = "English",
  focusPrompt?: string,
): { title: string; instruction: string } {
  const focus = focusPrompt?.trim() ? `\nLearner focus: ${focusPrompt.trim()}` : "";
  const base = `Language: ${language}. Ground every claim in the sources. Prefer core concepts over exhaustive coverage.${focus}\n\nSOURCES:\n${material.slice(0, 12000)}`;

  switch (kind) {
    case "report":
      return {
        title: "Report",
        instruction: `${base}\n\nWrite a structured briefing report using Markdown headings (## Overview, ## Key ideas, ## Important details, ## Open questions), bullet lists, and **bold** for key terms. Do not wrap the whole answer in a code fence.`,
      };
    case "mind_map":
      return {
        title: "Mind map",
        instruction: `${base}\n\nReturn ONLY valid JSON: {"root":"Topic","children":[{"label":"...","children":[{"label":"..."}]}]}. Max depth 3. Focus on the conceptual map of the sources.`,
      };
    case "flashcards":
      return {
        title: "Flashcards",
        instruction: `${base}\n\nReturn ONLY valid JSON: {"cards":[{"front":"...","back":"..."}]} with 8–16 cards covering core definitions and ideas.`,
      };
    case "quiz":
      return {
        title: "Quiz",
        instruction: `${base}\n\nReturn ONLY valid JSON: {"questions":[{"prompt":"...","choices":["A","B","C","D"],"answerIndex":0,"explanation":"..."}]} with 6–10 multiple-choice questions.`,
      };
    case "slide_deck":
      return {
        title: "Slide deck",
        instruction: `${base}\n\nReturn ONLY valid JSON: {"slides":[{"title":"...","bullets":["..."]}]} with 6–12 slides telling a clear teaching story.`,
      };
    case "infographic":
      return {
        title: "Infographic",
        instruction: `${base}\n\nReturn ONLY valid JSON: {"headline":"...","sections":[{"title":"...","points":["..."]}]} summarizing the gist visually as text blocks.`,
      };
    case "data_table":
      return {
        title: "Data table",
        instruction: `${base}\n\nReturn ONLY valid JSON: {"columns":["..."],"rows":[["..."]]} extracting comparable facts or concepts from the sources.`,
      };
    default:
      return { title: "Studio artifact", instruction: base };
  }
}

export { chunkText, extractPlainText, fetchUrlText } from "./ingest.js";
