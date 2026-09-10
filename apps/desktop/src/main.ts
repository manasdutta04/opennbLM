import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { createLocalServices } from "@opennblm/local-services";
import { ProviderManager } from "./provider-manager.js";
import { createRumikManager } from "@opennblm/rumik-runtime";
import { createTeachingEngine } from "@opennblm/teaching-engine";
import type { TeachingStyle } from "@opennblm/teaching-engine";

let mainWindow: BrowserWindow | undefined;
let services: ReturnType<typeof createLocalServices> | undefined;
let providers: ProviderManager | undefined;
let rumik: ReturnType<typeof createRumikManager> | undefined;

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
  if (rendererUrl) void mainWindow.loadURL(rendererUrl);
  else void mainWindow.loadFile(join(__dirname, "../../renderer/dist/index.html"));
}

app.whenReady().then(() => {
  services = createLocalServices(app.getPath("userData"));
  providers = new ProviderManager(app.getPath("userData"));
  const rumikOutput = join(app.getPath("userData"), "rumik-audio");
  mkdirSync(rumikOutput, { recursive: true });
  rumik = createRumikManager({ modelPath: process.env.RUMIK_MODEL_PATH || join(app.getPath("userData"), "models", "rumik-oss-1"), outputDirectory: rumikOutput });
  rumik.onSegmentReady((segment) => { mainWindow?.webContents.send("rumik:segment-ready", segment); });
  rumik.onStateChange((status) => { mainWindow?.webContents.send("rumik:state", status); });
  ipcMain.handle("app:info", () => ({ name: "opennbLM", version: app.getVersion() }));
  ipcMain.handle("conversations:list", (_event, search?: string) => services!.memory.listConversations(search));
  ipcMain.handle("conversations:create", (_event, input) => services!.memory.createConversation(input));
  ipcMain.handle("conversations:rename", (_event, id: string, title: string) => services!.memory.renameConversation(id, title));
  ipcMain.handle("conversations:add-message", (_event, input) => services!.memory.addMessage(input));
  ipcMain.handle("conversations:delete", (_event, id: string) => services!.memory.deleteConversation(id));
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
    const result = await teaching.teach({ question, learnerLevel: options?.learnerLevel, language: options?.language, style: options?.style, referenceExplanation: options?.referenceExplanation });
    services!.memory.addMessage({ conversationId, role: "assistant", text: result.response, teachingMetadata: { difficulty: result.plan.learner_level } });
    const deliveryDescription = `${result.delivery.overallTone}, ${result.delivery.pace} pace`;
    void rumik!.synthesize(result.response, { speaker: result.delivery.speaker, language: result.delivery.language, deliveryDescription }).catch(() => undefined);
    return { text: result.response, deliveryLabel: result.delivery.overallTone, voiceStarted: Boolean(rumik!.getStatus().runtimeAvailable && rumik!.getStatus().modelAvailable) };
  });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { services?.close(); });
