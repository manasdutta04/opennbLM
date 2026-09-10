import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync, ChildProcess } from "node:child_process";

export const RUMIK_MODEL_ID = "rumik-ai/rumik-oss-1";
export const RUMIK_MODEL_REVISION = process.env.RUMIK_MODEL_REVISION || "main";
export const RUMIK_SPEAKERS = ["Ira", "Aisha", "Siya", "Zoya"] as const;
export type RumikSpeaker = typeof RUMIK_SPEAKERS[number];
export type RumikVoiceState = "idle" | "preparing" | "speaking" | "paused" | "error";
export interface RumikConfig { speaker: RumikSpeaker; temperature: number; topK: number; maxTokens: number; deliveryDescription: string; language: string; modelPath?: string; pythonPath?: string; }
export interface RumikStatus { state: RumikVoiceState; runtimeAvailable: boolean; modelAvailable: boolean; modelId: string; modelRevision: string; sampleRate: 24000; error?: string; }
export interface RumikAudioSegment { id: string; text: string; wavPath: string; durationSeconds?: number; }
export interface RumikSynthesisResult { segments: RumikAudioSegment[]; }
export interface RumikManager { detectRuntime(): Promise<boolean>; detectModel(): Promise<boolean>; getStatus(): RumikStatus; start(): Promise<void>; stop(): Promise<void>; healthCheck(): Promise<boolean>; synthesize(text: string, config?: Partial<RumikConfig>): Promise<RumikSynthesisResult>; cancel(): Promise<void>; getVoices(): readonly RumikSpeaker[]; }
export interface RumikManagerOptions { modelPath?: string; pythonPath?: string; outputDirectory: string; runnerPath?: string; }

const defaultConfig: RumikConfig = { speaker: "Ira", temperature: 0.8, topK: 30, maxTokens: 2048, deliveryDescription: "professional, steady pace", language: "English" };
export function segmentForRumik(text: string, maxCharacters = 420): string[] { const normalized = text.replace(/\s+/g, " ").trim(); const sentences = normalized ? normalized.split(/(?<=[.!?。！？])\s+/u).filter(Boolean) : []; const chunks: string[] = []; let current = ""; for (const sentence of sentences) { if (current && current.length + sentence.length + 1 > maxCharacters) { chunks.push(current); current = ""; } current = current ? `${current} ${sentence}` : sentence; } if (current) chunks.push(current); return chunks; }

export function createRumikManager(options: RumikManagerOptions): RumikManager {
  let status: RumikStatus = { state: "idle", runtimeAvailable: false, modelAvailable: Boolean(options.modelPath && existsSync(options.modelPath)), modelId: RUMIK_MODEL_ID, modelRevision: RUMIK_MODEL_REVISION, sampleRate: 24000 };
  let currentProcess: ChildProcess | undefined;
  const python = options.pythonPath || process.env.RUMIK_PYTHON || "python";
  const runner = options.runnerPath || resolve(join(dirname(fileURLToPath(import.meta.url)), "../runtime/rumik_runner.py"));
  async function detectRuntime() { const result = spawnSync(python, ["--version"], { stdio: "ignore" }); status.runtimeAvailable = result.status === 0; return status.runtimeAvailable; }
  async function detectModel() { status.modelAvailable = Boolean(options.modelPath && existsSync(options.modelPath)); return status.modelAvailable; }
  return { detectRuntime, detectModel, getStatus: () => ({ ...status }), async start() { status.state = "preparing"; const runtime = await detectRuntime(); if (!runtime) { status = { ...status, state: "error", error: `Python runtime not found: ${python}` }; throw new Error(status.error); } await detectModel(); status.state = "idle"; }, async stop() { await this.cancel(); status.state = "idle"; }, async healthCheck() { return (await detectRuntime()) && (await detectModel()); }, async synthesize(text, override = {}) { if (!text.trim()) return { segments: [] }; if (!status.runtimeAvailable) await this.start(); if (!status.modelAvailable) throw new Error("Rumik model is not available locally"); status.state = "preparing"; const config = { ...defaultConfig, ...override }; const segments = segmentForRumik(text); const results: RumikAudioSegment[] = []; for (let index = 0; index < segments.length; index += 1) { const segment = segments[index]; const wavPath = join(options.outputDirectory, `rumik-${Date.now()}-${index}.wav`); await new Promise<void>((resolvePromise, reject) => { currentProcess = spawn(python, [runner, "--model-path", options.modelPath!, "--revision", RUMIK_MODEL_REVISION, "--text", segment, "--speaker", config.speaker, "--temperature", String(config.temperature), "--top-k", String(config.topK), "--max-new-tokens", String(config.maxTokens), "--description", config.deliveryDescription, "--language", config.language, "--output", wavPath], { stdio: ["ignore", "ignore", "pipe"] }); let error = ""; currentProcess.stderr?.on("data", (data) => { error += String(data); }); currentProcess.once("error", reject); currentProcess.once("exit", (code) => { currentProcess = undefined; if (code === 0) resolvePromise(); else reject(new Error(error || `Rumik exited with code ${code}`)); }); }); results.push({ id: `${Date.now()}-${index}`, text: segment, wavPath }); } status.state = "speaking"; return { segments: results }; }, async cancel() { if (currentProcess) { currentProcess.kill(); currentProcess = undefined; } status.state = "paused"; }, getVoices: () => RUMIK_SPEAKERS };
}
