import { app, BrowserWindow, clipboard, ipcMain, Menu, safeStorage, shell } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chmodSync, existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { arch, freemem, homedir, platform } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createLocalServices } from "@opennblm/local-services";
import { ProviderManager } from "./provider-manager.js";
import { createRumikManager } from "@opennblm/rumik-runtime";
import { createTeachingEngine } from "@opennblm/teaching-engine";
import type { TeachingStyle } from "@opennblm/teaching-engine";
import type { LearnerMemory, ModelSelection } from "@opennblm/contracts";
import { createEngineLLMProvider, EngineRegistry } from "@opennblm/engine-runtime";
import { buildSourceContext } from "@opennblm/notebook-runtime";
import { openBlankTerminal } from "./terminal-launch.js";
import { windowChromeOptions } from "./window-chrome.js";
import { installAppMenu, popupApplicationSubmenu } from "./app-menu.js";
import { registerNotebookHandlers } from "./notebook-ipc.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

Menu.setApplicationMenu(null);

/** Prefer RUMIK_PYTHON, then bundled, then a local CUDA-capable interpreter. */
function resolveRumikPython(bundledPython: string): string | undefined {
  if (process.env.RUMIK_PYTHON) return process.env.RUMIK_PYTHON;
  if (existsSync(bundledPython)) return bundledPython;
  if (process.platform !== "win32") return undefined;
  const local = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
  const candidates = ["Python312", "Python311", "Python310", "Python313"].map((name) =>
    join(local, "Programs", "Python", name, "python.exe"),
  );
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const probe = spawnSync(
      candidate,
      ["-c", "import torch; raise SystemExit(0 if torch.cuda.is_available() else 1)"],
      { stdio: "ignore", timeout: 15_000, windowsHide: true },
    );
    if (probe.status === 0) return candidate;
  }
  return undefined;
}

let mainWindow: BrowserWindow | undefined;
let services: Awaited<ReturnType<typeof createLocalServices>> | undefined;
let providers: ProviderManager | undefined;
let engines: EngineRegistry | undefined;
let rumik: ReturnType<typeof createRumikManager> | undefined;
let setupStatus: Awaited<ReturnType<typeof getSetupStatus>> | undefined;

async function getSetupStatus() {
  const packagedResources = process.resourcesPath;
  const bundledPython = process.platform === "win32" ? join(packagedResources, "rumik", "python", "python.exe") : join(packagedResources, "rumik", "python", "bin", "python3");
  const bundledModel = join(packagedResources, "rumik", "model");
  const userModel = join(app.getPath("userData"), "models", "rumik-oss-1");
  const bindPath = process.env.RUMIK_MODEL_PATH || (existsSync(bundledModel) ? bundledModel : userModel);
  await rumik!.detectCuda();
  const rumikStatus = rumik!.getStatus();
  const runtimeAvailable = await rumik!.detectRuntime();
  const modelAvailable = await rumik!.detectModel();
  const mode = rumik!.getMode();
  let gpuStatus = "unknown";
  try { gpuStatus = app.getGPUFeatureStatus().gpu_compositing || "unknown"; } catch {}
  let audioAvailable = true; let audioDetail = "Audio output is available to the operating system.";
  try { if (process.platform === "win32") execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Get-CimInstance Win32_SoundDevice | Select-Object -First 1 -ExpandProperty Status"], { stdio: ["ignore", "pipe", "ignore"], timeout: 3000 }); else if (process.platform === "darwin") execFileSync("system_profiler", ["SPAudioDataType"], { stdio: ["ignore", "pipe", "ignore"], timeout: 3000 }); } catch { audioAvailable = false; audioDetail = "No audio device could be confirmed."; }
  return {
    firstRun: !existsSync(join(app.getPath("userData"), "setup-complete.json")),
    runtime: {
      available: runtimeAvailable,
      source: mode === "remote" ? "remote" : existsSync(bundledPython) ? "bundled" : runtimeAvailable ? "system" : "unavailable",
      detail:
        mode === "remote"
          ? "Remote (HTTPS) is selected — using the public rumik-ai Space."
          : runtimeAvailable
            ? undefined
            : "Install Python 3 on PATH, or set RUMIK_PYTHON to a CUDA-capable interpreter.",
    },
    model: {
      available: modelAvailable,
      modelId: "rumik-ai/rumik-oss-1",
      revision: rumikStatus.modelRevision,
      bindPath,
      detail:
        mode === "remote"
          ? "The built-in HTTPS Space is the voice host. Switch to Local if you want inference on this PC."
          : modelAvailable
            ? undefined
            : `Download rumik-ai/rumik-oss-1 into ${bindPath} (or set RUMIK_MODEL_PATH).`,
    },
    audio: { available: audioAvailable, detail: audioDetail },
    system: { freeMemoryMb: Math.round(freemem() / 1024 / 1024), gpuStatus, platform: platform(), arch: arch() },
    dataPaths: { userData: app.getPath("userData"), logs: app.getPath("logs"), resources: packagedResources, rumikModel: bindPath },
    rumik: {
      mode,
      preferredMode: rumikStatus.preferredMode ?? mode,
      cudaAvailable: rumikStatus.cudaAvailable,
      remoteEndpoint: rumikStatus.remoteEndpoint,
      hasHfToken: Boolean(rumikStatus.hasHfToken),
    },
  };
}

function rumikPreferencePath() {
  return join(app.getPath("userData"), "rumik-preference.json");
}

function loadRumikPreferredMode(): "local" | "remote" {
  try {
    const raw = JSON.parse(readFileSync(rumikPreferencePath(), "utf8")) as { mode?: string };
    if (raw.mode === "local" || raw.mode === "remote") return raw.mode;
  } catch {
    /* first run */
  }
  return "remote";
}

function saveRumikPreferredMode(mode: "local" | "remote") {
  writeFileSync(rumikPreferencePath(), JSON.stringify({ mode }));
}

function rumikTokenPath() {
  return join(app.getPath("userData"), "rumik-hf-token.enc");
}

function loadRumikHfToken(): string | undefined {
  const fromEnv = process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN;
  try {
    if (!existsSync(rumikTokenPath())) return fromEnv || undefined;
    const raw = JSON.parse(readFileSync(rumikTokenPath(), "utf8")) as { enc?: string };
    if (!raw.enc || !safeStorage.isEncryptionAvailable()) return fromEnv || undefined;
    return safeStorage.decryptString(Buffer.from(raw.enc, "base64")) || fromEnv || undefined;
  } catch {
    return fromEnv || undefined;
  }
}

function saveRumikHfToken(token?: string) {
  const path = rumikTokenPath();
  if (!token) {
    if (existsSync(path)) unlinkSync(path);
    return;
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Windows could not store the Hugging Face token securely on this machine.");
  }
  writeFileSync(path, JSON.stringify({ enc: safeStorage.encryptString(token).toString("base64") }), { mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    /* ignore */
  }
}

function learnerContext(memory: LearnerMemory[]): string { return memory.slice(0, 12).map((item) => `${item.kind}: ${item.key} — ${item.value}`).join("; "); }
function extractLearnerMemory(conversationId: string, result: { plan: { topic: string; learner_level: "beginner" | "intermediate" | "advanced"; summary: string; misconception_risks: string[] } }, options?: { language?: string; style?: TeachingStyle }): void {
  const store = services!.memory;
  store.upsertLearnerMemory({ kind: "topic", key: result.plan.topic, value: "Studied in a lesson", confidence: 0.8, sourceConversationId: conversationId });
  store.upsertLearnerMemory({ kind: "level", key: "current", value: result.plan.learner_level, confidence: 0.7, sourceConversationId: conversationId });
  store.upsertLearnerMemory({ kind: "completed_lesson", key: result.plan.topic, value: result.plan.summary, confidence: 0.75, sourceConversationId: conversationId });
  store.upsertLearnerMemory({ kind: "recent_context", key: "latest", value: `${result.plan.topic}: ${result.plan.summary}`, confidence: 0.65, sourceConversationId: conversationId });
  if (options?.language) store.upsertLearnerMemory({ kind: "language", key: "preferred", value: options.language, confidence: 0.8, sourceConversationId: conversationId });
  if (options?.style) store.upsertLearnerMemory({ kind: "preference", key: "explanation-style", value: options.style, confidence: 0.7, sourceConversationId: conversationId });
  for (const risk of result.plan.misconception_risks.slice(0, 2)) store.upsertLearnerMemory({ kind: "weak_concept", key: risk, value: "Possible misconception to revisit with simpler intuition", confidence: 0.45, sourceConversationId: conversationId });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    icon: join(__dirname, "../icon.png"),
    show: false,
    ...windowChromeOptions(),
    webPreferences: {
      preload: join(__dirname, "../../preload/dist/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const rendererUrl = process.env.OPENNBLM_RENDERER_URL;
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event) => { event.preventDefault(); });
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  if (rendererUrl && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/.test(rendererUrl)) void mainWindow.loadURL(rendererUrl);
  else void mainWindow.loadFile(join(__dirname, "../../renderer/dist/index.html"));
}

app.whenReady().then(async () => {
  services = await createLocalServices(app.getPath("userData"));
  providers = new ProviderManager(app.getPath("userData"));
  engines = new EngineRegistry(app.getPath("userData"));
  await engines.refresh();
  const rumikOutput = join(app.getPath("userData"), "audio");
  mkdirSync(rumikOutput, { recursive: true });
  const bundledPython = process.platform === "win32" ? join(process.resourcesPath, "rumik", "python", "python.exe") : join(process.resourcesPath, "rumik", "python", "bin", "python3");
  const bundledModel = join(process.resourcesPath, "rumik", "model");
  rumik = createRumikManager({
    pythonPath: resolveRumikPython(bundledPython),
    modelPath: process.env.RUMIK_MODEL_PATH || (existsSync(bundledModel) ? bundledModel : join(app.getPath("userData"), "models", "rumik-oss-1")),
    outputDirectory: rumikOutput,
    preferredMode: loadRumikPreferredMode(),
    hfToken: loadRumikHfToken(),
  });
  await rumik.healthCheck().catch(() => false);
  rumik.onSegmentReady((segment) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send("rumik:segment-ready", segment);
  });
  rumik.onStateChange((status) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send("rumik:state", status);
  });
  ipcMain.handle("app:info", () => ({ name: "opennbLM", version: app.getVersion() }));
  ipcMain.handle("setup:status", async () => { setupStatus = await getSetupStatus(); return setupStatus; });
  ipcMain.handle("setup:complete", () => { writeFileSync(join(app.getPath("userData"), "setup-complete.json"), JSON.stringify({ completedAt: new Date().toISOString() })); });
  ipcMain.handle("conversations:list", (_event, search?: string) => services!.memory.listConversations(search));
  ipcMain.handle("conversations:create", (_event, input) => services!.memory.createConversation(input));
  ipcMain.handle("conversations:rename", (_event, id: string, title: string) => services!.memory.renameConversation(id, title));
  ipcMain.handle("conversations:add-message", (_event, input) => services!.memory.addMessage(input));
  ipcMain.handle("conversations:delete", (_event, id: string) => services!.memory.deleteConversation(id));
  ipcMain.handle("learner-memory:list", () => services!.memory.listLearnerMemory());
  ipcMain.handle("learner-memory:forget", (_event, id: string) => services!.memory.forgetLearnerMemory(id));
  ipcMain.handle("learner-memory:clear", () => services!.memory.clearLearnerMemory());
  ipcMain.handle("providers:list", () => providers!.list());
  ipcMain.handle("providers:save-key", (_event, id, key) => providers!.saveKey(id, key));
  ipcMain.handle("providers:remove-key", (_event, id) => providers!.removeKey(id));
  ipcMain.handle("providers:set-model", (_event, id, model) => providers!.setModel(id, model));
  ipcMain.handle("providers:set-endpoint", (_event, id, endpoint) => providers!.setEndpoint(id, endpoint));
  ipcMain.handle("providers:select", (_event, id) => providers!.select(id));
  ipcMain.handle("providers:test", (_event, id) => providers!.test(id));
  ipcMain.handle("providers:models", (_event, id) => providers!.models(id));
  ipcMain.handle("engines:list", () => engines!.list());
  ipcMain.handle("engines:refresh", () => engines!.refresh());
  ipcMain.handle("engines:get-selection", () => engines!.getSelection());
  ipcMain.handle("engines:set-selection", (_event, selection: ModelSelection) => engines!.setSelection(selection));
  ipcMain.handle("engine:open-terminal", async (_event, command: string) => {
    if (typeof command !== "string" || !command.trim()) return false;
    clipboard.writeText(command);
    return openBlankTerminal();
  });
  ipcMain.handle("shell:platform", () => process.platform);
  ipcMain.handle("shell:open-external", async (_event, url: string) => {
    if (typeof url !== "string" || !/^https:\/\//i.test(url)) return false;
    await shell.openExternal(url);
    return true;
  });
  ipcMain.handle("shell:popup-menu", (event, label: string, x: number, y: number) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
    popupApplicationSubmenu(win, label, x, y);
  });
  ipcMain.handle("rumik:status", () => rumik!.getStatus());
  ipcMain.handle("rumik:set-mode", async (_event, mode: unknown) => {
    if (mode !== "local" && mode !== "remote") throw new Error("Choose remote or local for the voice engine.");
    saveRumikPreferredMode(mode);
    rumik!.setPreferredMode(mode);
    await rumik!.start().catch(() => undefined);
    return rumik!.getStatus();
  });
  ipcMain.handle("rumik:set-hf-token", async (_event, token: unknown) => {
    if (token !== undefined && token !== null && typeof token !== "string") {
      throw new Error("Hugging Face token must be text.");
    }
    const next = typeof token === "string" ? token.trim() : "";
    if (next && !next.startsWith("hf_")) {
      throw new Error("Hugging Face tokens start with hf_.");
    }
    saveRumikHfToken(next || undefined);
    rumik!.setHfToken(next || undefined);
    return rumik!.getStatus();
  });
  ipcMain.handle("rumik:start", () => rumik!.start());
  ipcMain.handle("rumik:stop", () => rumik!.stop());
  ipcMain.handle("rumik:health", () => rumik!.healthCheck());
  ipcMain.handle("rumik:synthesize", (_event, text, config) => rumik!.synthesize(text, config));
  ipcMain.handle("rumik:cancel", () => rumik!.cancel());
  ipcMain.handle("rumik:voices", () => rumik!.getVoices());
  ipcMain.handle("teaching:teach", async (_event, conversationId: string, question: string, options?: { learnerLevel?: "beginner" | "intermediate" | "advanced"; language?: string; style?: TeachingStyle; referenceExplanation?: string; notebookId?: string; sourceIds?: string[] }) => {
    const selection = engines!.getSelection();
    if (!selection?.instanceId || !selection.model) {
      throw new Error("Connect a teaching brain in the lesson picker first.");
    }
    await engines!.refresh();
    const provider = createEngineLLMProvider(engines!, selection);
    const teaching = createTeachingEngine(provider);
    const grounded = options?.notebookId
      ? buildSourceContext(services!.memory.notebooks, options.notebookId, question, 6, options.sourceIds)
      : { context: "", citations: [] as Array<{ sourceId: string; title: string; excerpt: string }> };
    const result = await teaching.teach({
      question,
      model: selection.model,
      learnerLevel: options?.learnerLevel,
      language: options?.language,
      style: options?.style,
      referenceExplanation: options?.referenceExplanation,
      learnerContext: learnerContext(services!.memory.listLearnerMemory()),
      sourceContext: grounded.context || undefined,
    });
    services!.memory.addMessage({ conversationId, role: "assistant", text: result.response, teachingMetadata: { difficulty: result.plan.learner_level } });
    extractLearnerMemory(conversationId, result, options);
    const deliveryDescription = `${result.delivery.overallTone}, ${result.delivery.pace} pace`;
    const healthy = await rumik!.healthCheck().catch(() => false);
    if (!healthy) {
      return {
        text: result.response,
        deliveryLabel: result.delivery.overallTone,
        voiceStarted: false,
        voiceError: rumik!.getStatus().error || "Rumik voice is not available right now.",
        usedFallback: result.usedFallback,
        citations: grounded.citations,
      };
    }
    void rumik!
      .synthesize(result.response, {
        speaker: result.delivery.speaker,
        language: result.delivery.language,
        deliveryDescription,
      })
      .catch(() => undefined);
    return {
      text: result.response,
      deliveryLabel: result.delivery.overallTone,
      voiceStarted: true,
      usedFallback: result.usedFallback,
      citations: grounded.citations,
    };
  });

  registerNotebookHandlers(
    ipcMain,
    () => services!.memory.notebooks,
    () => mainWindow,
    async () => {
      const selection = engines!.getSelection();
      if (!selection?.instanceId || !selection.model) throw new Error("Connect a teaching brain first.");
      await engines!.refresh();
      return { provider: createEngineLLMProvider(engines!, selection), model: selection.model };
    },
    () => rumik!,
    rumikOutput,
  );

  installAppMenu();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { void rumik?.stop(); services?.close(); });
