import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { createLocalServices } from "@opennblm/local-services";

let mainWindow: BrowserWindow | undefined;
let services: ReturnType<typeof createLocalServices> | undefined;

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
  ipcMain.handle("app:info", () => ({ name: "opennbLM", version: app.getVersion() }));
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { services?.close(); });
