/** Recover JSON from model output that often breaks for non-English scripts. */
export function parseStudioJson(raw: string): unknown | null {
  if (!raw?.trim()) return null;
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  text = text.slice(start, end + 1);
  const candidates = [text, softenJson(text)];
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* try next */
    }
  }
  return null;
}

function softenJson(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u00A0]/g, " ")
    .replace(/,\s*([}\]])/g, "$1");
}

export function isInfographicData(value: unknown): value is {
  headline: string;
  subtitle?: string;
  stats?: Array<{ label: string; value: string; hint?: string }>;
  sections?: Array<{ title: string; points?: string[] }>;
} {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return typeof rec.headline === "string" && rec.headline.trim().length > 0;
}
