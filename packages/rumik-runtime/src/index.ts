import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync, ChildProcess } from "node:child_process";
import { detectCudaAvailable } from "./cuda.js";
import { DEFAULT_REMOTE_ENDPOINT, synthesizeRemoteSegment } from "./remote.js";

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
}

export interface RumikStatus {
  state: RumikVoiceState;
  runtimeAvailable: boolean;
  modelAvailable: boolean;
  modelId: string;
  modelRevision: string;
  sampleRate: 24000;
  mode: RumikMode;
  cudaAvailable: boolean;
  remoteEndpoint?: string;
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
}

const defaultConfig: RumikConfig = {
  speaker: "Ira",
  temperature: 0.8,
  topK: 30,
  maxTokens: 2048,
  deliveryDescription: "professional, steady pace",
  language: "English",
};
const SYNTHESIS_TIMEOUT_MS = 180000;

export function segmentForRumik(text: string, maxCharacters = 420): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const sentences = normalized.split(/(?<=[.!?。！？])\s+/u).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > maxCharacters) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current} ${sentence}` : sentence;
  }
  if (current) chunks.push(current);
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
  const runner =
    options.runnerPath ||
    resolve(join(dirname(fileURLToPath(import.meta.url)), "../runtime/rumik_runner.py"));

  let cudaAvailable = detectCudaAvailable(python);
  let mode: RumikMode = resolveMode(
    options.preferredMode,
    cudaAvailable,
    Boolean(options.modelPath && existsSync(options.modelPath)),
  );

  let status: RumikStatus = {
    state: "idle",
    runtimeAvailable: mode === "remote" ? true : false,
    modelAvailable: mode === "remote" ? true : Boolean(options.modelPath && existsSync(options.modelPath)),
    modelId: RUMIK_MODEL_ID,
    modelRevision: RUMIK_MODEL_REVISION,
    sampleRate: 24000,
    mode,
    cudaAvailable,
    remoteEndpoint: mode === "remote" ? remoteEndpoint : undefined,
  };

  let currentProcess: ChildProcess | undefined;
  let cancelRequested = false;
  const segmentListeners = new Set<(segment: RumikAudioSegment) => void>();
  const stateListeners = new Set<(next: RumikStatus) => void>();
  const emitState = () => {
    const next = { ...status };
    stateListeners.forEach((listener) => listener(next));
  };

  const refreshMode = () => {
    mode = resolveMode(
      options.preferredMode,
      cudaAvailable,
      Boolean(options.modelPath && existsSync(options.modelPath)),
    );
    status = {
      ...status,
      mode,
      cudaAvailable,
      remoteEndpoint: mode === "remote" ? remoteEndpoint : undefined,
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
    status.modelAvailable = Boolean(options.modelPath && existsSync(options.modelPath));
    return status.modelAvailable;
  }

  async function runLocalSegment(segment: string, index: number, config: RumikConfig): Promise<string> {
    const wavPath = join(options.outputDirectory, `rumik-${Date.now()}-${index}.wav`);
    try {
      await new Promise<void>((resolvePromise, reject) => {
        const env = { ...process.env };
        if (!env.RUMIK_LOW_VRAM) env.RUMIK_LOW_VRAM = "1";
        const args = [
          runner,
          "--model-path",
          options.modelPath!,
          "--revision",
          RUMIK_MODEL_REVISION,
          "--text",
          segment,
          "--speaker",
          config.speaker,
          "--temperature",
          String(config.temperature),
          "--top-k",
          String(config.topK),
          "--max-new-tokens",
          String(Math.min(config.maxTokens, env.RUMIK_LOW_VRAM === "0" ? config.maxTokens : 1024)),
          "--description",
          config.deliveryDescription,
          "--language",
          config.language,
          "--output",
          wavPath,
        ];
        if (env.RUMIK_LOW_VRAM !== "0") args.push("--low-vram");
        currentProcess = spawn(python, args, {
          stdio: ["ignore", "pipe", "pipe"],
          timeout: SYNTHESIS_TIMEOUT_MS,
          env,
        });
        let error = "";
        currentProcess.stderr?.on("data", (data) => {
          error += String(data);
        });
        currentProcess.stdout?.on("data", (data) => {
          error += String(data);
        });
        currentProcess.once("error", reject);
        currentProcess.once("exit", (code, signal) => {
          currentProcess = undefined;
          if (code === 0) resolvePromise();
          else reject(new Error(error || `Rumik exited with code ${code ?? signal ?? "unknown"}`));
        });
      });
      if (cancelRequested) throw new Error("Rumik synthesis cancelled");
      return wavPath;
    } catch (error) {
      rmSync(wavPath, { force: true });
      throw error;
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
        const results: RumikAudioSegment[] = [];
        const segments = segmentForRumik(text);
        for (let index = 0; index < segments.length; index += 1) {
          const segment = segments[index]!;
          const wavPath =
            mode === "remote"
              ? await runRemoteSegment(segment, index, config)
              : await runLocalSegment(segment, index, config);
          const ready = { id: `${Date.now()}-${index}`, text: segment, wavPath };
          results.push(ready);
          status = { ...status, state: "speaking", mode };
          emitState();
          segmentListeners.forEach((listener) => listener(ready));
        }
        return { segments: results };
      } catch (error) {
        if (cancelRequested) {
          status = { ...status, state: "paused", error: undefined };
          emitState();
        } else {
          status = {
            ...status,
            state: "error",
            error: error instanceof Error ? error.message : "Rumik synthesis failed",
          };
          emitState();
        }
        throw error;
      } finally {
        currentProcess = undefined;
      }
    },
    async cancel() {
      cancelRequested = true;
      if (currentProcess) {
        currentProcess.kill();
        currentProcess = undefined;
      }
      status = { ...status, state: "paused", error: undefined };
      emitState();
    },
    getVoices: () => RUMIK_SPEAKERS,
  };
}

export { detectCudaAvailable } from "./cuda.js";
export { DEFAULT_REMOTE_ENDPOINT, parseDeliveryControls } from "./remote.js";
