import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn, spawnSync, ChildProcess } from "node:child_process";
import { splitSpokenSentences } from "@opennblm/contracts";
import { detectCudaAvailable } from "./cuda.js";
import { directoryHasRumikWeights } from "./model-path.js";
import { DEFAULT_REMOTE_ENDPOINT, synthesizeRemoteSegment } from "./remote.js";
import { resolveRumikRunnerPath } from "./runner-path.js";
export { asUnpackedAsarPath, resolveRumikRunnerPath } from "./runner-path.js";
export { concatWavFiles } from "./wav.js";
export { directoryHasRumikWeights, resolveRumikModelPath } from "./model-path.js";
export {
  accentFromLanguage,
  buildRumikDescription,
  parseDeliveryControls,
  RUMIK_ACCENTS,
  RUMIK_PACES,
  RUMIK_TONES,
} from "./delivery.js";
export type { RumikAccent, RumikPace, RumikTone } from "./delivery.js";

export const RUMIK_MODEL_ID = "rumik-ai/rumik-oss-1";
export const RUMIK_MODEL_REVISION = process.env.RUMIK_MODEL_REVISION || "main";
export const RUMIK_SPEAKERS = ["Ira", "Aisha", "Siya", "Zoya"] as const;
export type RumikSpeaker = (typeof RUMIK_SPEAKERS)[number];
export type RumikVoiceState = "idle" | "preparing" | "speaking" | "paused" | "error";
/** Local CUDA inference vs hosted Gradio/ZeroGPU fallback. */
export type RumikMode = "local" | "remote";

export interface RumikConfig {
  speaker: RumikSpeaker;
  temperature: number;
  topK: number;
  maxTokens: number;
  deliveryDescription: string;
  language: string;
  modelPath?: string;
  pythonPath?: string;
  /** When false, do not emit onSegmentReady (batch jobs / no autoplay). Default true. */
  broadcast?: boolean;
}

export interface RumikStatus {
  state: RumikVoiceState;
  runtimeAvailable: boolean;
  modelAvailable: boolean;
  modelId: string;
  modelRevision: string;
  sampleRate: 24000;
  mode: RumikMode;
  preferredMode?: RumikMode;
  cudaAvailable: boolean;
  remoteEndpoint?: string;
  hasHfToken?: boolean;
  error?: string;
}

export interface RumikAudioSegment {
  id: string;
  text: string;
  wavPath: string;
  durationSeconds?: number;
}

export interface RumikSynthesisResult {
  segments: RumikAudioSegment[];
}

export interface RumikManager {
  detectRuntime(): Promise<boolean>;
  detectModel(): Promise<boolean>;
  detectCuda(): Promise<boolean>;
  getStatus(): RumikStatus;
  getMode(): RumikMode;
  setPreferredMode(mode: RumikMode): void;
  setHfToken(token?: string): void;
  start(): Promise<void>;
  stop(): Promise<void>;
  healthCheck(): Promise<boolean>;
  synthesize(text: string, config?: Partial<RumikConfig>): Promise<RumikSynthesisResult>;
  cancel(): Promise<void>;
  getVoices(): readonly RumikSpeaker[];
  onSegmentReady(listener: (segment: RumikAudioSegment) => void): () => void;
  onStateChange(listener: (status: RumikStatus) => void): () => void;
}

export interface RumikManagerOptions {
  modelPath?: string;
  pythonPath?: string;
  outputDirectory: string;
  runnerPath?: string;
  /** Override auto mode selection. */
  preferredMode?: RumikMode;
  remoteEndpoint?: string;
  hfToken?: string;
}

const defaultConfig: RumikConfig = {
  speaker: "Ira",
  temperature: 0.8,
  topK: 30,
  maxTokens: 2048,
  deliveryDescription: "professional, Indian English accent, steady pace",
  language: "English",
};
/** Per-sentence synthesis after the model is warm. */
const SYNTHESIS_TIMEOUT_MS = 240000;
/** First local load (LM + Mimi) can take several minutes on 4 GB laptop GPUs. */
const WORKER_READY_TIMEOUT_MS = 900000;

/** Strip tqdm / stack noise so Studio never shows a raw process dump. */
export function summarizeRumikFailure(raw: string, fallback = "Rumik voice synthesis failed"): string {
  const text = String(raw || "")
    .replace(/\x1b\[[0-9;]*m/g, "")
    .replace(/\r/g, "\n");
  const lower = text.toLowerCase();
  if (/command line is too long|enametoolong/i.test(text)) {
    return "Rumik could not start on Windows (command line too long). Try Audio Overview again — the app now uses a local worker.";
  }
  if (/out of memory|cuda out of memory|cudnn_status/i.test(lower)) {
    return "Rumik ran out of GPU memory. Close other GPU apps and try again.";
  }
  if (/timed out|timeout/i.test(lower)) {
    return "Rumik timed out while synthesizing speech. Try again — long Audio Overviews can take a while on local GPU.";
  }
  if (/cancelled/i.test(lower)) return "Rumik synthesis cancelled";
  if (/zerogpu|zero.?gpu|quota/i.test(lower)) {
    return "The hosted Rumik Space ran out of ZeroGPU quota. That is remote voice, not this PC. Switch to Local (this PC) in Settings, or paste a Hugging Face token under Remote.";
  }
  if (/can't open file|no such file|rumik_runner/i.test(lower)) {
    return "Rumik's local runner is missing from this install. Use remote voice, or install the latest Windows build.";
  }
  if (/worker (exited|stopped)|not available|did not write audio/i.test(lower)) {
    const line =
      text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((l) => !/%\|/.test(l) && !/it\/s/.test(l))
        .at(-1) || fallback;
    const cleaned = line.replace(/^\[rumik\]\s*/i, "").slice(0, 240);
    if (/^rumik worker (exited|stopped)/i.test(cleaned)) {
      return "Local Rumik stopped on this PC. Close other GPU apps and run Audio Overview again. This is not the hosted ZeroGPU quota.";
    }
    return cleaned;
  }
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/%\|/.test(l) && !/it\/s/.test(l) && !/^loading checkpoint/i.test(l) && !/^\d+%/.test(l));
  const useful = lines.filter((l) =>
    /error|exception|failed|traceback|runtimeerror|\[rumik\]|timeout|timed out|cuda|memory/i.test(l),
  );
  const pick = useful.at(-1) || lines.find((l) => l.startsWith("[rumik]")) || "";
  if (pick) return pick.replace(/^\[rumik\]\s*/i, "").slice(0, 240);
  // Keep short, already-clean messages (do not replace with a generic fallback).
  const compact = lines.join(" ").trim() || text.replace(/\s+/g, " ").trim();
  if (compact && compact.length <= 240 && !/%\|/.test(compact)) return compact.slice(0, 240);
  return fallback.slice(0, 240);
}

/** Split an oversized sentence on clause/word boundaries so Rumik stays under ~30s/segment. */
function splitOversizedSentence(sentence: string, maxCharacters: number): string[] {
  if (sentence.length <= maxCharacters) return [sentence];
  const parts: string[] = [];
  const clauses = sentence.split(/(?<=[,;:—–])\s+/u).filter(Boolean);
  let current = "";
  const pushCurrent = () => {
    if (current) {
      parts.push(current);
      current = "";
    }
  };
  for (const clause of clauses.length ? clauses : [sentence]) {
    if (clause.length > maxCharacters) {
      pushCurrent();
      const words = clause.split(/\s+/);
      let piece = "";
      for (const word of words) {
        const next = piece ? `${piece} ${word}` : word;
        if (piece && next.length > maxCharacters) {
          parts.push(piece);
          piece = word;
        } else {
          piece = next;
        }
      }
      if (piece) parts.push(piece);
      continue;
    }
    if (current && current.length + clause.length + 1 > maxCharacters) {
      pushCurrent();
    }
    current = current ? `${current} ${clause}` : clause;
  }
  pushCurrent();
  return parts;
}

const INDIC_SCRIPT = /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0B80-\u0BFF\u0C00-\u0C7F]/u;
const ENGLISH_SEGMENT_CHARS = 420;
const INDIC_SEGMENT_CHARS = 200;

export function rumikSegmentLimit(text: string, language?: string, maxCharacters?: number): number {
  if (typeof maxCharacters === "number" && maxCharacters > 0) return maxCharacters;
  const lang = (language || "").trim().toLowerCase();
  if (lang && lang !== "english") return INDIC_SEGMENT_CHARS;
  if (INDIC_SCRIPT.test(text)) return INDIC_SEGMENT_CHARS;
  return ENGLISH_SEGMENT_CHARS;
}

export function segmentForRumik(text: string, maxCharacters?: number, language?: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const limit = rumikSegmentLimit(normalized, language, maxCharacters);
  // One Rumik generation per sentence — packing sentences caused unfinished speech then abrupt jumps.
  const sentences = splitSpokenSentences(normalized);
  const chunks: string[] = [];
  for (const sentence of sentences.length ? sentences : [normalized]) {
    for (const piece of splitOversizedSentence(sentence, limit)) {
      chunks.push(piece);
    }
  }
  return chunks;
}

function resolveMode(
  preferred: RumikMode | undefined,
  cudaAvailable: boolean,
  localReady: boolean,
): RumikMode {
  if (preferred === "remote") return "remote";
  if (preferred === "local") return "local";
  if (process.env.RUMIK_FORCE_REMOTE === "1") return "remote";
  if (process.env.RUMIK_FORCE_LOCAL === "1") return "local";
  // Local-first when CUDA + model are present; otherwise remote reachability fallback.
  if (cudaAvailable && localReady) return "local";
  return "remote";
}

export function createRumikManager(options: RumikManagerOptions): RumikManager {
  const python = options.pythonPath || process.env.RUMIK_PYTHON || "python";
  const remoteEndpoint = (options.remoteEndpoint || DEFAULT_REMOTE_ENDPOINT).replace(/\/$/, "");
  const runner = resolveRumikRunnerPath(options.runnerPath);

  let cudaAvailable = detectCudaAvailable(python);
  let preferredMode = options.preferredMode;
  let hfToken = options.hfToken?.trim() || undefined;
  let mode: RumikMode = resolveMode(
    preferredMode,
    cudaAvailable,
    directoryHasRumikWeights(options.modelPath),
  );

  let status: RumikStatus = {
    state: "idle",
    runtimeAvailable: mode === "remote" ? true : false,
    modelAvailable: mode === "remote" ? true : directoryHasRumikWeights(options.modelPath),
    modelId: RUMIK_MODEL_ID,
    modelRevision: RUMIK_MODEL_REVISION,
    sampleRate: 24000,
    mode,
    preferredMode,
    cudaAvailable,
    remoteEndpoint: mode === "remote" ? remoteEndpoint : undefined,
    hasHfToken: Boolean(hfToken || process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN),
  };

  let worker: ChildProcess | undefined;
  let workerReady: Promise<void> | undefined;
  let workerStdout = "";
  let cancelRequested = false;
  let jobSeq = 0;
  const pendingJobs = new Map<
    string,
    { resolve: (value: void) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }
  >();
  const segmentListeners = new Set<(segment: RumikAudioSegment) => void>();
  const stateListeners = new Set<(next: RumikStatus) => void>();
  const emitState = () => {
    const next = { ...status };
    stateListeners.forEach((listener) => listener(next));
  };

  const refreshMode = () => {
    mode = resolveMode(
      preferredMode,
      cudaAvailable,
      directoryHasRumikWeights(options.modelPath),
    );
    status = {
      ...status,
      mode,
      preferredMode,
      cudaAvailable,
      remoteEndpoint: mode === "remote" ? remoteEndpoint : undefined,
      hasHfToken: Boolean(hfToken || process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN),
    };
  };

  async function detectCuda(): Promise<boolean> {
    cudaAvailable = detectCudaAvailable(python);
    refreshMode();
    emitState();
    return cudaAvailable;
  }

  async function detectRuntime(): Promise<boolean> {
    refreshMode();
    if (mode === "remote") {
      status.runtimeAvailable = true;
      return true;
    }
    const result = spawnSync(python, ["--version"], { stdio: "ignore", timeout: 3000 });
    status.runtimeAvailable = result.status === 0;
    return status.runtimeAvailable;
  }

  async function detectModel(): Promise<boolean> {
    refreshMode();
    if (mode === "remote") {
      status.modelAvailable = true;
      return true;
    }
    status.modelAvailable = directoryHasRumikWeights(options.modelPath);
    return status.modelAvailable;
  }

  function rejectAllJobs(reason: string) {
    for (const [id, job] of pendingJobs) {
      clearTimeout(job.timer);
      job.reject(new Error(reason));
      pendingJobs.delete(id);
    }
  }

  function killWorker() {
    rejectAllJobs(cancelRequested ? "Rumik synthesis cancelled" : "Rumik worker stopped");
    workerReady = undefined;
    workerStdout = "";
    if (worker) {
      try {
        worker.stdin?.end();
      } catch {
        /* ignore */
      }
      worker.kill();
      worker = undefined;
    }
  }

  function handleWorkerLine(line: string) {
    const trimmed = line.trim();
    if (!trimmed) return;
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return;
    }
    if (msg.event === "ready") return;
    const id = String(msg.id || "");
    const job = pendingJobs.get(id);
    if (!job) return;
    clearTimeout(job.timer);
    pendingJobs.delete(id);
    if (msg.ok) job.resolve();
    else job.reject(new Error(summarizeRumikFailure(String(msg.error || "Rumik job failed"))));
  }

  async function ensureLocalWorker(): Promise<void> {
    if (worker && !worker.killed && workerReady) {
      await workerReady;
      return;
    }
    if (!runner) {
      throw new Error("Rumik's local runner is missing from this install. Use remote voice, or install the latest Windows build.");
    }
    mkdirSync(options.outputDirectory, { recursive: true });
    const env = { ...process.env };
    if (!env.RUMIK_LOW_VRAM) env.RUMIK_LOW_VRAM = "1";
    env.TQDM_DISABLE = "1";
    env.HF_HUB_DISABLE_PROGRESS_BARS = "1";
    env.TRANSFORMERS_VERBOSITY = "error";

    const args = [
      runner,
      "--serve",
      "--model-path",
      options.modelPath!,
      "--revision",
      RUMIK_MODEL_REVISION,
    ];
    if (env.RUMIK_LOW_VRAM !== "0") args.push("--low-vram");

    workerReady = new Promise<void>((resolveReady, rejectReady) => {
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        killWorker();
        rejectReady(error);
      };
      const ok = () => {
        if (settled) return;
        settled = true;
        resolveReady();
      };

      const child = spawn(python, args, {
        stdio: ["pipe", "pipe", "pipe"],
        env,
        windowsHide: true,
      });
      worker = child;

      const readyTimer = setTimeout(() => {
        fail(new Error("Rumik model load timed out. Keep the app open and try again."));
      }, WORKER_READY_TIMEOUT_MS);

      child.stdout?.on("data", (data) => {
        workerStdout += String(data);
        const parts = workerStdout.split(/\r?\n/);
        workerStdout = parts.pop() || "";
        for (const line of parts) {
          if (!settled) {
            try {
              const msg = JSON.parse(line.trim()) as { event?: string };
              if (msg.event === "ready") {
                clearTimeout(readyTimer);
                ok();
                continue;
              }
            } catch {
              /* not ready yet */
            }
          }
          handleWorkerLine(line);
        }
      });

      let stderrTail = "";
      child.stderr?.on("data", (data) => {
        stderrTail = (stderrTail + String(data)).slice(-4000);
      });

      child.once("error", (err) => {
        clearTimeout(readyTimer);
        fail(new Error(summarizeRumikFailure(err.message, "Failed to start Rumik worker")));
      });
      child.once("exit", (code, signal) => {
        clearTimeout(readyTimer);
        const reason = summarizeRumikFailure(
          stderrTail,
          `Rumik worker exited (${code ?? signal ?? "unknown"})`,
        );
        rejectAllJobs(reason);
        worker = undefined;
        workerReady = undefined;
        if (!settled) fail(new Error(reason));
      });
    });

    await workerReady;
  }

  async function runLocalSegment(segment: string, index: number, config: RumikConfig): Promise<string> {
    mkdirSync(options.outputDirectory, { recursive: true });
    const stamp = `${Date.now()}-${index}`;
    const wavPath = join(options.outputDirectory, `rumik-${stamp}.wav`);
    const textPath = join(options.outputDirectory, `rumik-${stamp}.txt`);
    writeFileSync(textPath, segment, "utf8");
    try {
      await ensureLocalWorker();
      if (!worker?.stdin) throw new Error("Rumik worker is not available");
      if (cancelRequested) throw new Error("Rumik synthesis cancelled");

      const id = `job-${++jobSeq}`;
      // Prefer full HF demo budget (2048); 4-bit load must not starve generation length.
      const maxTokens = Math.min(Math.max(config.maxTokens, 512), 2048);
      await new Promise<void>((resolveJob, rejectJob) => {
        const timer = setTimeout(() => {
          pendingJobs.delete(id);
          rejectJob(new Error("Rumik sentence synthesis timed out"));
        }, SYNTHESIS_TIMEOUT_MS);
        pendingJobs.set(id, { resolve: resolveJob, reject: rejectJob, timer });
        const payload = JSON.stringify({
          id,
          cmd: "synth",
          text_file: textPath,
          speaker: config.speaker,
          description: config.deliveryDescription,
          language: config.language,
          temperature: config.temperature,
          top_k: config.topK,
          max_new_tokens: maxTokens,
          output: wavPath,
        });
        try {
          worker!.stdin!.write(`${payload}\n`);
        } catch (error) {
          clearTimeout(timer);
          pendingJobs.delete(id);
          rejectJob(error instanceof Error ? error : new Error("Failed to write Rumik job"));
        }
      });

      if (cancelRequested) throw new Error("Rumik synthesis cancelled");
      if (!existsSync(wavPath)) throw new Error("Rumik did not write audio output");
      return wavPath;
    } catch (error) {
      rmSync(wavPath, { force: true });
      const message = error instanceof Error ? error.message : "Rumik synthesis failed";
      throw new Error(summarizeRumikFailure(message));
    } finally {
      rmSync(textPath, { force: true });
    }
  }

  async function runRemoteSegment(segment: string, index: number, config: RumikConfig): Promise<string> {
    const wavPath = join(options.outputDirectory, `rumik-remote-${Date.now()}-${index}.wav`);
    try {
      if (cancelRequested) throw new Error("Rumik synthesis cancelled");
      await synthesizeRemoteSegment({
        text: segment,
        config,
        outputPath: wavPath,
        endpoint: remoteEndpoint,
        timeoutMs: SYNTHESIS_TIMEOUT_MS,
        hfToken,
      });
      if (cancelRequested) {
        rmSync(wavPath, { force: true });
        throw new Error("Rumik synthesis cancelled");
      }
      return wavPath;
    } catch (error) {
      rmSync(wavPath, { force: true });
      throw error;
    }
  }

  return {
    detectRuntime,
    detectModel,
    detectCuda,
    getStatus: () => ({ ...status }),
    getMode: () => mode,
    setPreferredMode(next) {
      preferredMode = next;
      if (next === "remote") killWorker();
      refreshMode();
      if (mode === "remote") {
        status = {
          ...status,
          state: "idle",
          runtimeAvailable: true,
          modelAvailable: true,
          error: undefined,
        };
      }
      emitState();
    },
    setHfToken(next) {
      const trimmed = next?.trim();
      hfToken = trimmed || undefined;
      status = {
        ...status,
        hasHfToken: Boolean(hfToken || process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN),
      };
      emitState();
    },
    onSegmentReady(listener) {
      segmentListeners.add(listener);
      return () => segmentListeners.delete(listener);
    },
    onStateChange(listener) {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
    async start() {
      status = { ...status, state: "preparing", error: undefined };
      emitState();
      await detectCuda();
      refreshMode();
      if (mode === "remote") {
        status = {
          ...status,
          state: "idle",
          runtimeAvailable: true,
          modelAvailable: true,
          error: undefined,
          mode,
          remoteEndpoint,
        };
        emitState();
        return;
      }
      const runtime = await detectRuntime();
      if (!runtime) {
        status = { ...status, state: "error", error: `Python runtime not found: ${python}` };
        emitState();
        throw new Error(status.error);
      }
      await detectModel();
      status = { ...status, state: "idle", error: undefined };
      emitState();
    },
    async stop() {
      await this.cancel();
      status = { ...status, state: "idle", error: undefined };
      emitState();
    },
    async healthCheck() {
      await detectCuda();
      return (await detectRuntime()) && (await detectModel());
    },
    async synthesize(text, override = {}) {
      if (!text.trim()) return { segments: [] };
      cancelRequested = false;
      try {
        await detectCuda();
        refreshMode();
        if (!status.runtimeAvailable) await this.start();
        if (!status.modelAvailable) {
          status = {
            ...status,
            state: "error",
            error:
              mode === "remote"
                ? "Rumik remote endpoint is not available"
                : "Rumik model is not available locally",
          };
          emitState();
          throw new Error(status.error);
        }
        status = { ...status, state: "preparing", error: undefined, mode };
        emitState();
        const config = { ...defaultConfig, ...override };
        const broadcast = config.broadcast !== false;
        const results: RumikAudioSegment[] = [];
        const segments = segmentForRumik(text, undefined, config.language);
        for (let index = 0; index < segments.length; index += 1) {
          if (cancelRequested) throw new Error("Rumik synthesis cancelled");
          const segment = segments[index]!;
          const wavPath =
            mode === "remote"
              ? await runRemoteSegment(segment, index, config)
              : await runLocalSegment(segment, index, config);
          const ready = { id: `${Date.now()}-${index}`, text: segment, wavPath };
          results.push(ready);
          status = { ...status, state: broadcast ? "speaking" : "preparing", mode };
          emitState();
          if (broadcast) segmentListeners.forEach((listener) => listener(ready));
        }
        status = { ...status, state: "idle", mode };
        emitState();
        return { segments: results };
      } catch (error) {
        if (cancelRequested) {
          status = { ...status, state: "paused", error: undefined };
          emitState();
          throw new Error("Rumik synthesis cancelled");
        }
        const message = summarizeRumikFailure(
          error instanceof Error ? error.message : "Rumik synthesis failed",
        );
        status = {
          ...status,
          state: "error",
          error: message,
        };
        emitState();
        throw new Error(message);
      }
    },
    async cancel() {
      cancelRequested = true;
      killWorker();
      status = { ...status, state: "paused", error: undefined };
      emitState();
    },
    getVoices: () => RUMIK_SPEAKERS,
  };
}

export { detectCudaAvailable } from "./cuda.js";
export { DEFAULT_REMOTE_ENDPOINT } from "./remote.js";
