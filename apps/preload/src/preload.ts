import { contextBridge, ipcRenderer } from "electron";
import type { PreloadApi } from "@opennblm/contracts";

const api: PreloadApi = { getAppInfo: () => ipcRenderer.invoke("app:info"), conversations: { list: (search) => ipcRenderer.invoke("conversations:list", search), create: (input) => ipcRenderer.invoke("conversations:create", input), rename: (id, title) => ipcRenderer.invoke("conversations:rename", id, title), addMessage: (input) => ipcRenderer.invoke("conversations:add-message", input), delete: (id) => ipcRenderer.invoke("conversations:delete", id) } };
contextBridge.exposeInMainWorld("opennbLM", api);
