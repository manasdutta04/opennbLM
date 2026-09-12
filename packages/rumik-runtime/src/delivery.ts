/** Official Rumik-OSS-1 delivery controls (HF Space / model card). */

export const RUMIK_TONES = ["happy", "sad", "angry", "excited", "professional"] as const;
export type RumikTone = (typeof RUMIK_TONES)[number];

export const RUMIK_ACCENTS = [
  "Hindi accent",
  "Telugu accent",
  "Tamil accent",
  "Kannada accent",
  "Bengali accent",
  "Punjabi accent",
  "Indian English accent",
] as const;
export type RumikAccent = (typeof RUMIK_ACCENTS)[number];

export const RUMIK_PACES = ["slow pace", "fast pace", "steady pace"] as const;
export type RumikPace = (typeof RUMIK_PACES)[number];

const LANGUAGE_ACCENT: Record<string, RumikAccent> = {
  english: "Indian English accent",
  hindi: "Hindi accent",
  telugu: "Telugu accent",
  tamil: "Tamil accent",
  kannada: "Kannada accent",
  bengali: "Bengali accent",
  punjabi: "Punjabi accent",
};

export function accentFromLanguage(language?: string): RumikAccent {
  const key = (language || "English").trim().toLowerCase();
  return LANGUAGE_ACCENT[key] || "Indian English accent";
}

export function buildRumikDescription(input?: {
  tone?: string;
  accent?: string;
  pace?: string;
  language?: string;
}): string {
  const tone = (RUMIK_TONES as readonly string[]).includes(input?.tone || "")
    ? (input!.tone as RumikTone)
    : "professional";
  const accent = (RUMIK_ACCENTS as readonly string[]).includes(input?.accent || "")
    ? (input!.accent as RumikAccent)
    : accentFromLanguage(input?.language);
  const pace = (RUMIK_PACES as readonly string[]).includes(input?.pace || "")
    ? (input!.pace as RumikPace)
    : "steady pace";
  return `${tone}, ${accent}, ${pace}`;
}

export function parseDeliveryControls(description: string): {
  tone: RumikTone;
  accent: RumikAccent;
  pace: RumikPace;
} {
  const lower = description.toLowerCase();
  const tone = RUMIK_TONES.find((item) => lower.includes(item)) ?? "professional";
  const accent =
    RUMIK_ACCENTS.find((item) => lower.includes(item.toLowerCase().replace(" accent", ""))) ??
    (/\benglish\b/i.test(description) ? "Indian English accent" : "Hindi accent");
  const pace =
    RUMIK_PACES.find((item) => lower.includes(item.replace(" pace", ""))) ?? "steady pace";
  return { tone, accent, pace };
}
