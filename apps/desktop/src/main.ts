import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { createLocalServices } from "@opennblm/local-services";
import { ProviderManager } from "./provider-manager.js";
import { createRumikManager } from "@opennblm/rumik-runtime";

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
  ipcMain.handle("providers:test", (_event, id) => providers!.test(id));
  ipcMain.handle("providers:models", (_event, id) => providers!.models(id));
  ipcMain.handle("rumik:status", () => rumik!.getStatus());
  ipcMain.handle("rumik:start", () => rumik!.start());
  ipcMain.handle("rumik:stop", () => rumik!.stop());
  ipcMain.handle("rumik:health", () => rumik!.healthCheck());
  ipcMain.handle("rumik:synthesize", (_event, text, config) => rumik!.synthesize(text, config));
  ipcMain.handle("rumik:cancel", () => rumik!.cancel());
  ipcMain.handle("rumik:voices", () => rumik!.getVoices());
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { services?.close(); });
