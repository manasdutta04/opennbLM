import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { existsSync, writeFileSync } from "node:fs";
import { arch, freemem, platform } from "node:os";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createLocalServices } from "@opennblm/local-services";
import { ProviderManager } from "./provider-manager.js";
import { createRumikManager } from "@opennblm/rumik-runtime";
import { createTeachingEngine } from "@opennblm/teaching-engine";
import type { TeachingStyle } from "@opennblm/teaching-engine";
import type { LearnerMemory } from "@opennblm/contracts";

let mainWindow: BrowserWindow | undefined;
let services: ReturnType<typeof createLocalServices> | undefined;
let providers: ProviderManager | undefined;
let rumik: ReturnType<typeof createRumikManager> | undefined;
let setupStatus: Awaited<ReturnType<typeof getSetupStatus>> | undefined;

async function getSetupStatus() {
  const packagedResources = process.resourcesPath;
  const bundledPython = process.platform === "win32" ? join(packagedResources, "rumik", "python", "python.exe") : join(packagedResources, "rumik", "python", "bin", "python3");
  const bundledModel = join(packagedResources, "rumik", "model");
  const runtimeAvailable = await rumik!.detectRuntime();
  const modelAvailable = await rumik!.detectModel();
  let gpuStatus = "unknown";
  try { gpuStatus = app.getGPUFeatureStatus().gpu_compositing || "unknown"; } catch {}
  let audioAvailable = true; let audioDetail = "Audio output is available to the operating system.";
  try { if (process.platform === "win32") execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Get-CimInstance Win32_SoundDevice | Select-Object -First 1 -ExpandProperty Status"], { stdio: ["ignore", "pipe", "ignore"], timeout: 3000 }); else if (process.platform === "darwin") execFileSync("system_profiler", ["SPAudioDataType"], { stdio: ["ignore", "pipe", "ignore"], timeout: 3000 }); } catch { audioAvailable = false; audioDetail = "No audio device could be confirmed."; }
  return { firstRun: !existsSync(join(app.getPath("userData"), "setup-complete.json")), runtime: { available: runtimeAvailable, source: existsSync(bundledPython) ? "bundled" : runtimeAvailable ? "system" : "unavailable", detail: runtimeAvailable ? undefined : "Install the optional Rumik runtime assets or configure RUMIK_PYTHON for development." }, model: { available: modelAvailable, modelId: "rumik-ai/rumik-oss-1", revision: rumik!.getStatus().modelRevision, detail: modelAvailable ? undefined : `Place the licensed model snapshot in ${bundledModel} or configure RUMIK_MODEL_PATH.` }, audio: { available: audioAvailable, detail: audioDetail }, system: { freeMemoryMb: Math.round(freemem() / 1024 / 1024), gpuStatus, platform: platform(), arch: arch() }, dataPaths: { userData: app.getPath("userData"), logs: app.getPath("logs"), resources: packagedResources } };
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
  if (rendererUrl && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/.test(rendererUrl)) void mainWindow.loadURL(rendererUrl);
  else void mainWindow.loadFile(join(__dirname, "../../renderer/dist/index.html"));
}

app.whenReady().then(() => {
  services = createLocalServices(app.getPath("userData"));
  providers = new ProviderManager(app.getPath("userData"));
  const rumikOutput = join(app.getPath("userData"), "audio");
  mkdirSync(rumikOutput, { recursive: true });
  const bundledPython = process.platform === "win32" ? join(process.resourcesPath, "rumik", "python", "python.exe") : join(process.resourcesPath, "rumik", "python", "bin", "python3");
  const bundledModel = join(process.resourcesPath, "rumik", "model");
  rumik = createRumikManager({ pythonPath: process.env.RUMIK_PYTHON || (existsSync(bundledPython) ? bundledPython : undefined), modelPath: process.env.RUMIK_MODEL_PATH || (existsSync(bundledModel) ? bundledModel : join(app.getPath("userData"), "models", "rumik-oss-1")), outputDirectory: rumikOutput });
  rumik.onSegmentReady((segment) => { mainWindow?.webContents.send("rumik:segment-ready", segment); });
  rumik.onStateChange((status) => { mainWindow?.webContents.send("rumik:state", status); });
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
  ipcMain.handle("rumik:status", () => rumik!.getStatus());
  ipcMain.handle("rumik:start", () => rumik!.start());
  ipcMain.handle("rumik:stop", () => rumik!.stop());
  ipcMain.handle("rumik:health", () => rumik!.healthCheck());
  ipcMain.handle("rumik:synthesize", (_event, text, config) => rumik!.synthesize(text, config));
  ipcMain.handle("rumik:cancel", () => rumik!.cancel());
  ipcMain.handle("rumik:voices", () => rumik!.getVoices());
  ipcMain.handle("teaching:teach", async (_event, conversationId: string, question: string, options?: { learnerLevel?: "beginner" | "intermediate" | "advanced"; language?: string; style?: TeachingStyle; referenceExplanation?: string }) => {
    const selected = providers!.getProvider();
    const teaching = createTeachingEngine(selected.provider);
    const result = await teaching.teach({ question, model: selected.model, learnerLevel: options?.learnerLevel, language: options?.language, style: options?.style, referenceExplanation: options?.referenceExplanation, learnerContext: learnerContext(services!.memory.listLearnerMemory()) });
    services!.memory.addMessage({ conversationId, role: "assistant", text: result.response, teachingMetadata: { difficulty: result.plan.learner_level } });
    extractLearnerMemory(conversationId, result, options);
    const deliveryDescription = `${result.delivery.overallTone}, ${result.delivery.pace} pace`;
    void rumik!.synthesize(result.response, { speaker: result.delivery.speaker, language: result.delivery.language, deliveryDescription }).catch(() => undefined);
    return { text: result.response, deliveryLabel: result.delivery.overallTone, voiceStarted: Boolean(rumik!.getStatus().runtimeAvailable && rumik!.getStatus().modelAvailable) };
  });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { void rumik?.stop(); services?.close(); });
