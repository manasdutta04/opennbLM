import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { Client } from "@gradio/client";
import type { RumikConfig, RumikSpeaker } from "./index.js";

export const DEFAULT_REMOTE_ENDPOINT =
  process.env.RUMIK_REMOTE_URL?.replace(/\/$/, "") ||
  "https://rumik-ai-rumik-oss-1.hf.space";

const DEFAULT_SPACE_ID = "rumik-ai/rumik-oss-1";

const TONES = ["happy", "sad", "angry", "excited", "professional"] as const;
const ACCENTS = [
  "Hindi accent",
  "Telugu accent",
  "Tamil accent",
  "Kannada accent",
  "Bengali accent",
  "Punjabi accent",
  "Indian English accent",
] as const;
const PACES = ["slow pace", "fast pace", "steady pace"] as const;

export function parseDeliveryControls(description: string): {
  tone: (typeof TONES)[number];
  accent: (typeof ACCENTS)[number];
  pace: (typeof PACES)[number];
} {
  const lower = description.toLowerCase();
  const tone = TONES.find((item) => lower.includes(item)) ?? "professional";
  const accent =
    ACCENTS.find((item) => lower.includes(item.toLowerCase().replace(" accent", ""))) ??
    (/\benglish\b/i.test(description) ? "Indian English accent" : "Hindi accent");
  const pace =
    PACES.find((item) => lower.includes(item.replace(" pace", ""))) ?? "steady pace";
  return { tone, accent, pace };
}

function resolveSpaceId(endpoint: string): string {
  const custom = process.env.RUMIK_REMOTE_SPACE?.trim();
  if (custom) return custom;
  if (endpoint.includes("rumik-ai-rumik-oss-1") || endpoint === DEFAULT_REMOTE_ENDPOINT) {
    return DEFAULT_SPACE_ID;
  }
  return DEFAULT_SPACE_ID;
}

function hfToken(): `hf_${string}` | undefined {
  const token = process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN;
  if (!token) return undefined;
  return token.startsWith("hf_") ? (token as `hf_${string}`) : undefined;
}

function formatRemoteError(error: unknown): string {
  if (!error) return "Rumik remote synthesis failed";
  if (typeof error === "string" && error.trim() && error !== "null") return error.trim();
  if (error instanceof Error) {
    const message = error.message?.trim();
    if (message && message !== "null") return message;
    const titled = error as Error & { title?: string; original_msg?: string };
    if (titled.title) return titled.title;
    if (titled.original_msg) return titled.original_msg;
  }
  if (typeof error === "object") {
    const rec = error as Record<string, unknown>;
    for (const key of ["title", "message", "msg", "detail", "original_msg"]) {
      const value = rec[key];
      if (typeof value === "string" && value.trim() && value !== "null") return value.trim();
    }
  }
  return "Rumik remote synthesis failed (hosted Space unavailable or ZeroGPU quota exceeded). Set HF_TOKEN for more quota, or bind local CUDA weights.";
}

function extractAudioUrl(result: unknown, root: string): string | null {
  const visit = (node: unknown): string | null => {
    if (!node) return null;
    if (typeof node === "string") {
      if (/^https?:\/\//i.test(node) && /\.(wav|mp3|flac|ogg)(\?|$)/i.test(node)) return node;
      if (node.startsWith("/file=") || node.startsWith("/gradio_api/file=")) return `${root}${node}`;
      if (node.startsWith("/")) return `${root}${node}`;
      return null;
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = visit(item);
        if (found) return found;
      }
      return null;
    }
    if (typeof node === "object") {
      const rec = node as Record<string, unknown>;
      if (typeof rec.url === "string" && rec.url) {
        return /^https?:\/\//i.test(rec.url) ? rec.url : `${root}${rec.url.startsWith("/") ? "" : "/"}${rec.url}`;
      }
      if (typeof rec.path === "string" && /^https?:\/\//i.test(rec.path)) return rec.path;
      for (const value of Object.values(rec)) {
        const found = visit(value);
        if (found) return found;
      }
    }
    return null;
  };
  return visit(result);
}

async function downloadToFile(url: string, dest: string, timeoutMs: number): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {};
    const token = process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { signal: controller.signal, headers });
    if (!response.ok || !response.body) {
      throw new Error(`Rumik remote download failed (${response.status})`);
    }
    const nodeStream = Readable.fromWeb(response.body as import("node:stream/web").ReadableStream);
    await pipeline(nodeStream, createWriteStream(dest));
  } finally {
    clearTimeout(timer);
  }
}

/** Call the public rumik-ai Gradio Space `synthesize` endpoint and save WAV. */
export async function synthesizeRemoteSegment(options: {
  text: string;
  config: RumikConfig;
  outputPath: string;
  endpoint?: string;
  timeoutMs?: number;
}): Promise<void> {
  const root = (options.endpoint || DEFAULT_REMOTE_ENDPOINT).replace(/\/$/, "");
  const timeoutMs = options.timeoutMs ?? 180_000;
  const { tone, accent, pace } = parseDeliveryControls(options.config.deliveryDescription);
  const speaker = (["Ira", "Aisha", "Siya", "Zoya"] as RumikSpeaker[]).includes(options.config.speaker)
    ? options.config.speaker
    : "Ira";

  const space = resolveSpaceId(root);
  const token = hfToken();

  let result: unknown;
  try {
    const client = await Client.connect(space, token ? { hf_token: token } : {});
    const prediction = await Promise.race([
      client.predict("/synthesize", {
        text: options.text,
        speaker,
        tone,
        accent,
        pace,
        mode: "Controls",
        temperature: options.config.temperature,
        top_k: options.config.topK,
        max_new_tokens: Math.min(options.config.maxTokens, 2048),
        seed: -1,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Rumik remote timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
    result = prediction?.data ?? prediction;
  } catch (error) {
    throw new Error(formatRemoteError(error));
  }

  const audioUrl = extractAudioUrl(result, root);
  if (!audioUrl) throw new Error("Rumik remote response did not include audio");
  await downloadToFile(audioUrl, options.outputPath, timeoutMs);
}
