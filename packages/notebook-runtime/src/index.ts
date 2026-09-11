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

/** Word budgets for Audio Overview scripts (spoken by Rumik end-to-end). */
const LENGTH_WORDS: Record<AudioOverviewLength, { min: number; max: number; label: string; maxLines: number }> = {
  shorter: { min: 300, max: 400, label: "300–400 words", maxLines: 14 },
  default: { min: 550, max: 700, label: "550–700 words", maxLines: 22 },
  longer: { min: 900, max: 1200, label: "900–1200 words", maxLines: 32 },
};

export function audioLengthLimits(length: AudioOverviewLength = "default") {
  return LENGTH_WORDS[length];
}

/** Debate needs more back-and-forth turns than a lecture overview. */
export function audioTurnBudget(format: AudioOverviewFormat = "deep_dive", length: AudioOverviewLength = "default") {
  const base = LENGTH_WORDS[length];
  if (format !== "debate") return base;
  return {
    ...base,
    maxLines: Math.min(48, Math.round(base.maxLines * 1.4)),
  };
}

export type PodcastTurn = { speaker: string; text: string; tone: string };

/** Teaching-safe tones only — never sad/angry/happy melodrama. */
const VOCAL_TAGS = /<\/?(?:laugh|chuckle|sigh)>/gi;

function normalizeLineTone(raw?: string): string {
  const tone = (raw || "").trim().toLowerCase();
  if (tone === "professional") return "professional";
  if (tone === "excited" || tone === "happy") return "excited";
  return "excited";
}

/** Clean dialogue for Rumik: strip markdown and remove laugh/sigh tags (teaching, not theatre). */
export function sanitizeSpokenText(raw: string): string {
  let text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  text = text
    .replace(VOCAL_TAGS, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[_~|>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  const words = text.split(/\s+/).filter(Boolean);
  // Allow short complete rebuttals ("I disagree.") while dropping telegraphic junk.
  if (words.length < 2) return "";
  if (!/[.!?。！？]$/.test(text)) {
    text = `${text.replace(/[.!?。！？]*$/, "")}.`;
  }
  return text;
}

/** Split turns into one complete sentence per utterance so Rumik never cuts mid-thought. */
export function utterancesFromPodcastTurns(turns: PodcastTurn[]): PodcastTurn[] {
  const out: PodcastTurn[] = [];
  for (const turn of turns) {
    const cleaned = sanitizeSpokenText(turn.text);
    if (!cleaned) continue;
    const parts = cleaned.split(/(?<=[.!?。！？])\s+/u).map((s) => s.trim()).filter(Boolean);
    for (const sentence of parts.length ? parts : [cleaned]) {
      const text = sanitizeSpokenText(sentence);
      if (text) out.push({ speaker: turn.speaker, text, tone: normalizeLineTone(turn.tone) });
    }
  }
  return out;
}

/** Keep opening + closing when trimming — debate wrap-ups must survive. */
export function trimPodcastTurns(turns: PodcastTurn[], maxLines?: number, preserveClose = 0): PodcastTurn[] {
  if (maxLines == null || maxLines <= 0 || turns.length <= maxLines) return turns;
  if (preserveClose <= 0) return turns.slice(0, maxLines);
  const close = Math.min(preserveClose, Math.floor(maxLines / 2));
  const head = maxLines - close;
  return [...turns.slice(0, head), ...turns.slice(turns.length - close)];
}

/**
 * Parse "Speaker [tone]: dialogue" scripts into clean turns.
 * Tone is excited or professional only (teaching energy, not melodrama).
 */
export function parsePodcastScript(
  raw: string,
  allowedSpeakers: string[],
  maxLines?: number,
  options?: { preserveClose?: number },
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

    const match = line.match(
      /^([A-Za-z][A-Za-z0-9_-]{0,24})(?:\s*[\[(]\s*(happy|sad|angry|excited|professional)\s*[\])])?\s*[:：]\s*(.+)$/i,
    );
    if (match) {
      const name = match[1]!;
      const tone = normalizeLineTone(match[2]);
      const text = match[3]!.trim();
      if (!text) continue;
      if (speakerSet.has(name.toLowerCase())) {
        const speaker = speakers.find((s) => s.toLowerCase() === name.toLowerCase()) || defaultSpeaker;
        turns.push({ speaker, text, tone });
      } else if (turns.length) {
        const prev = turns[turns.length - 1]!;
        prev.text = `${prev.text} ${text}`.replace(/\s+/g, " ").trim();
      } else {
        turns.push({ speaker: defaultSpeaker, text, tone });
      }
      continue;
    }

    if (turns.length) {
      const prev = turns[turns.length - 1]!;
      prev.text = `${prev.text} ${line}`.replace(/\s+/g, " ").trim();
    }
  }

  const normalized = turns
    .map((turn) => {
      const text = sanitizeSpokenText(turn.text);
      if (!text) return null;
      return { speaker: turn.speaker, text, tone: normalizeLineTone(turn.tone) } satisfies PodcastTurn;
    })
    .filter((t): t is PodcastTurn => t != null);

  return trimPodcastTurns(normalized, maxLines, options?.preserveClose ?? 0);
}

function toneGuideForFormat(format: AudioOverviewFormat, speakerNames: string[]): string {
  const a = speakerNames[0] || "Ira";
  const b = speakerNames[1] || "Aisha";
  switch (format) {
    case "brief":
      return `Tone for The Brief: keep ${a} mostly [excited] — an eager teacher who wants the learner to get it. Use [professional] only for crisp definitions or takeaways.`;
    case "critique":
      return `Tone for The Critique: ${a} stays mostly [professional] (clear critic). ${b} stays mostly [excited] when defending strengths or naming insights. Never sad or angry.`;
    case "debate":
      return `Tone for The Debate: ${a} (Challenger) speaks [professional] — calm, probing, skeptical. ${b} (Advocate) speaks [excited] — energetic, clear, teaching the case. Keep both respectful and educational.`;
    case "deep_dive":
    default:
      return `Tone for Deep Dive: default to [excited] for both hosts so teaching feels lively. Use [professional] sparingly for precise definitions. Never sad, angry, or theatrical.`;
  }
}

function structureForFormat(
  format: AudioOverviewFormat,
  length: AudioOverviewLength,
  speakerNames: string[],
): string {
  const a = speakerNames[0] || "Ira";
  const b = speakerNames[1] || "Aisha";
  const rounds =
    length === "shorter" ? "2" : length === "longer" ? "4–5" : "3–4";

  switch (format) {
    case "brief":
      return `STRUCTURE for The Brief (single host only — ${a}):
1) Hook: name the topic and why the learner should care (1 turn).
2) Core briefing: ${length === "shorter" ? "2–3" : length === "longer" ? "5–6" : "3–4"} clear idea turns with concrete examples.
3) Takeaways: 1–2 turns with practical remember-this points.
4) Close: one confident wrap sentence.
Do NOT invent a second speaker. Do NOT turn this into a Q&A.`;

    case "critique":
      return `STRUCTURE for The Critique (${a} = Critic, ${b} = Strengths advocate):
1) Frame: ${a} states what is being reviewed and the review lens (1 turn).
2) Exchange (${rounds} rounds): ${a} raises a gap, risk, or weak spot; ${b} answers with a fair strength, nuance, or fix grounded in the sources.
3) Synthesis: both help the learner weigh trade-offs (2 turns).
4) Close: one clear "what to remember" from each side.
Never pile on; stay constructive and source-grounded.`;

    case "debate":
      return `STRUCTURE for The Debate — this MUST sound like a real educational debate, not a polite dual lecture.

ROLES (fixed):
- ${a} = Challenger: asks sharp questions, probes weak claims, presses for precision.
- ${b} = Advocate: answers, defends a clear position, teaches the "how/why" with examples.

FLOW (follow in order):
1) Frame (2 turns): ${a} names the debate question in one sentence. ${b} states their position in one sentence.
2) Opening case (2 turns): ${b} gives the strongest case. ${a} challenges one specific claim.
3) Clash (${rounds} question→answer pairs): STRICT alternation.
   - ${a} asks OR rebuts (one focused challenge per turn).
   - ${b} answers that challenge directly before adding anything new.
   - Each reply must address the previous speaker's last point — no parallel monologues.
4) Learner wrap (2–3 turns): both restate the clash in plain words, then ${b} or ${a} lands one balanced takeaway so the learner understands BOTH sides.

HARD RULES for Debate:
- Alternate speakers every turn after the frame (no two ${a} lines in a row, no two ${b} lines in a row).
- Prefer short turns: 1 sentence, sometimes 2 — never long speeches.
- Do NOT have both hosts agree early. Steelman disagreement first, then reconcile at the end.
- Do NOT narrate stage directions ("I disagree with you because…" is fine; "(laughs)" is not).
- The learner should finish knowing: the question, Side A, Side B, and a clear wrap.`;

    case "deep_dive":
    default:
      return `STRUCTURE for Deep Dive (${a} + ${b} as co-teachers):
1) Open: one host names the topic and the learning goal (1 turn).
2) Build: alternate hosts unpack ${length === "shorter" ? "2–3" : length === "longer" ? "5–6" : "3–4"} core ideas with concrete examples.
3) Connect: show how the ideas fit together (1–2 turns).
4) Close: a practical "now you understand / remember this" turn.
Sound like two good teachers helping one learner — curious, clear, collaborative.`;
  }
}

export function buildPodcastSystemPrompt(format: AudioOverviewFormat = "deep_dive"): string {
  const base =
    "You write educational Audio Overview scripts for TTS. Every line must be exactly: SpeakerName [tone]: dialogue. Tone is only excited or professional — default excited. No laughter, sadness, anger, markdown, or stage directions.";
  switch (format) {
    case "debate":
      return `${base} Format is The Debate: one Challenger questions/rebuts; one Advocate answers/defends. Strict speaker alternation. Short turns. End with a learner wrap that teaches both sides.`;
    case "brief":
      return `${base} Format is The Brief: one host only. Crisp spoken briefing with takeaways — full sentences, not bullets.`;
    case "critique":
      return `${base} Format is The Critique: constructive critic vs strengths advocate. Fair, source-grounded, educational.`;
    case "deep_dive":
    default:
      return `${base} Format is Deep Dive: two co-teachers unpacking core ideas so a learner understands the whole topic.`;
  }
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
  const budget = audioTurnBudget(format, length);
  const focus = options?.focusPrompt?.trim()
    ? `Learner focus (honor this throughout): ${options.focusPrompt.trim()}`
    : "";
  const a = speakerNames[0] || "Ira";
  const b = speakerNames[1] || "Aisha";

  const formatGuide: Record<AudioOverviewFormat, string> = {
    deep_dive: `Deep Dive: ${a} and ${b} co-teach the topic like two clear, lively teachers helping one learner understand the whole story.`,
    brief: `The Brief: single host ${a} delivers a focused spoken briefing — what matters, why it matters, what to remember.`,
    critique: `The Critique: ${a} (Critic) and ${b} (Strengths advocate) pressure-test the material so the learner sees gaps and strengths clearly.`,
    debate: `The Debate: ${a} (Challenger) questions and presses; ${b} (Advocate) answers and defends. It must feel like a real educational debate with clash and a clear wrap — not two people politely summarizing the same notes.`,
  };

  const turnHint =
    format === "debate"
      ? `- Use ${Math.max(10, Math.round(budget.maxLines * 0.7))}–${budget.maxLines} short dialogue turns (question / answer rhythm).
- Each turn: usually 1 COMPLETE sentence (2 max). Each sentence under 24 words.`
      : `- Use ${Math.max(6, Math.round(budget.maxLines * 0.55))}–${budget.maxLines} dialogue turns.
- Each turn: 1–2 COMPLETE sentences. Each sentence under 28 words.`;

  const speakRules =
    format === "debate"
      ? `- Speakers allowed: ${a}, ${b} only.
- Alternate every turn after the opening frame.
- ${a} challenges or asks; ${b} answers that challenge.
- Use plain, clear vocabulary. Full statements only — never telegraphic fragments like "math, math introduction."
- Do NOT write cliffhangers or dangling continuations that need the previous line to make sense as incomplete grammar.
- Do NOT use stage directions, markdown, bullets, numbering, or quotes around the whole line.
- Ground every claim in the sources; invent a fair clash from the material, not random drama.`
      : `- Speakers allowed: ${speakerNames.join(", ")} only.
- Alternate speakers naturally (except The Brief — ${a} only).
- Use plain, clear vocabulary. Prefer full statements like "Machine learning finds patterns in data." Never telegraphic fragments like "math, math introduction, math law."
- Do NOT write cliffhanger hooks ("Do you know this") or dangling continuations ("And that…", "This again…") that need the previous line to make sense.
- Do NOT use stage directions, markdown, bullets, numbering, or quotes around the whole line.
- Cover the CORE story of the sources; do not read documents page by page.`;

  return `Write an educational Audio Overview script in ${language} meant to be read aloud by a TTS voice model (Rumik).
Each sentence is synthesized alone, so every sentence must be a complete, self-contained thought.
Goal: help the learner understand the whole topic. Sound clear, eager to teach, and controlled — never theatrical.

Format: ${formatGuide[format]}
${structureForFormat(format, length, speakerNames)}
${toneGuideForFormat(format, speakerNames)}

LINE FORMAT (exact):
SpeakerName [tone]: dialogue
- tone MUST be exactly one of: excited, professional
- Default to excited. Use professional when calm precision helps.
- NEVER use sad, angry, happy, or any other tone label.
- NEVER include <laugh>, <chuckle>, <sigh>, jokes-as-filler, or stage emotion. No laughter.

WORD LIMIT (hard requirement — count spoken words only):
- Write between ${budget.min} and ${budget.max} words total (${budget.label}).
${turnHint}
- Every line MUST end with . ! or ?

SPEAKABILITY RULES (non-negotiable):
${speakRules}
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
