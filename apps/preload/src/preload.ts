import { contextBridge, ipcRenderer } from "electron";
import type { PreloadApi } from "@opennblm/contracts";

const api: PreloadApi = { getAppInfo: () => ipcRenderer.invoke("app:info") };
contextBridge.exposeInMainWorld("opennbLM", api);
