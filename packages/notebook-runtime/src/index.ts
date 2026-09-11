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

/** Spoken-length targets at ~150 wpm. maxLines is a safety ceiling, not a quality goal. */
const LENGTH_WORDS: Record<AudioOverviewLength, { min: number; max: number; label: string; maxLines: number }> = {
  shorter: { min: 160, max: 280, label: "about 1–2 minutes spoken", maxLines: 12 },
  default: { min: 450, max: 650, label: "about 3–4 minutes spoken", maxLines: 20 },
  longer: { min: 750, max: 1050, label: "about 5–7 minutes spoken", maxLines: 28 },
};

export function audioLengthLimits(length: AudioOverviewLength = "default") {
  return LENGTH_WORDS[length];
}

export type PodcastTurn = { speaker: string; text: string };

/**
 * Parse "Speaker: dialogue" scripts into clean turns.
 * Merges continuation lines, drops junk, and keeps only complete spoken text.
 */
export function parsePodcastScript(
  raw: string,
  allowedSpeakers: string[],
  maxLines?: number,
): PodcastTurn[] {
  const speakers = allowedSpeakers.length ? allowedSpeakers : ["Ira"];
  const defaultSpeaker = speakers[0]!;
  const speakerSet = new Set(speakers.map((s) => s.toLowerCase()));
  const turns: PodcastTurn[] = [];

  const cleaned = raw
    .replace(/^```[\s\S]*?```/gm, (block) => block.replace(/^```\w*\n?|\n?```$/g, ""))
    .replace(/^\s*(script|dialogue|transcript)\s*:?\s*$/gim, "")
    .trim();

  for (const rawLine of cleaned.split(/\n+/)) {
    let line = rawLine.trim();
    if (!line) continue;
    line = line.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "");
    if (/^\[.*\]$/.test(line) || /^\(.*\)$/.test(line)) continue;

    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]{0,24})\s*[:：]\s*(.+)$/);
    if (match) {
      const name = match[1]!;
      const text = match[2]!.trim();
      if (!text) continue;
      if (speakerSet.has(name.toLowerCase())) {
        const speaker = speakers.find((s) => s.toLowerCase() === name.toLowerCase()) || defaultSpeaker;
        turns.push({ speaker, text });
      } else if (turns.length) {
        // Unknown "Name: …" — fold into previous turn so we don't invent cracked speaker jumps.
        const prev = turns[turns.length - 1]!;
        prev.text = `${prev.text} ${text}`.replace(/\s+/g, " ").trim();
      } else {
        turns.push({ speaker: defaultSpeaker, text });
      }
      continue;
    }

    // Continuation of previous turn (wrapped dialogue without a speaker prefix).
    if (turns.length) {
      const prev = turns[turns.length - 1]!;
      prev.text = `${prev.text} ${line}`.replace(/\s+/g, " ").trim();
    }
  }

  const normalized = turns
    .map((turn) => {
      let text = turn.text.replace(/\s+/g, " ").trim();
      text = text.replace(/^["“]|["”]$/g, "").trim();
      if (!text) return null;
      if (!/[.!?。！？]$/.test(text)) text = `${text}.`;
      return { speaker: turn.speaker, text };
    })
    .filter((t): t is PodcastTurn => Boolean(t));

  if (maxLines != null && maxLines > 0) return normalized.slice(0, maxLines);
  return normalized;
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
    ? `Learner focus (honor this throughout): ${options.focusPrompt.trim()}`
    : "";

  const formatGuide: Record<AudioOverviewFormat, string> = {
    deep_dive: `Deep Dive: a natural two-host conversation between ${speakerNames.join(" and ")} that unpacks core ideas, explains why they matter, and connects them.`,
    brief: `The Brief: a single host (${speakerNames[0]}) delivers a clear spoken briefing with takeaways — still full sentences, not bullet fragments.`,
    critique: `The Critique: ${speakerNames.slice(0, 2).join(" and ")} evaluate strengths, gaps, and implications of the material constructively.`,
    debate: `The Debate: ${speakerNames.slice(0, 2).join(" and ")} take opposing but fair perspectives, then land on a clear wrap-up.`,
  };

  const structure =
    length === "shorter"
      ? "Structure: quick hook → 2–3 core ideas with brief examples → crisp close."
      : length === "longer"
        ? "Structure: hook → several core ideas with examples/contrasts → how pieces connect → memorable close."
        : "Structure: hook → core ideas with concrete examples → how they connect → practical close.";

  return `Write a polished educational Audio Overview script in ${language}.
This will be spoken aloud by a voice model — quality and completeness matter more than brevity tricks.

Format: ${formatGuide[format]}
${structure}

DURATION (must hit — do not undershoot):
- Total spoken words: ${budget.min}–${budget.max} (${budget.label}).
- Use about ${Math.max(6, Math.round(budget.maxLines * 0.65))}–${budget.maxLines} dialogue turns.
- Each turn is 1–3 COMPLETE sentences (roughly 35–90 words). Never leave a sentence unfinished.
- Every line MUST end with . ! or ?

QUALITY RULES (non-negotiable):
- Format EXACTLY: SpeakerName: dialogue
- Speakers allowed: ${speakerNames.join(", ")} only.
- Alternate speakers naturally (except The Brief).
- Each turn is a finished thought that the next turn can build on — no mid-sentence cuts, no abrupt topic teleporting.
- Do NOT use stage directions, markdown, bullets, numbering, or quotes around the whole line.
- Do NOT write hooks like "Do you know this" without finishing the idea in the SAME turn.
- Cover the CORE story of the sources; do not read documents page by page.
${focus}

SOURCES:
${material.slice(0, length === "shorter" ? 8000 : length === "longer" ? 14000 : 11000)}`;
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
