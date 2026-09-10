import { contextBridge, ipcRenderer } from "electron";
import type { PreloadApi, RumikSegment, RumikStatus } from "@opennblm/contracts";

const api: PreloadApi = {
  getAppInfo: () => ipcRenderer.invoke("app:info"),
  setup: { getStatus: () => ipcRenderer.invoke("setup:status"), complete: () => ipcRenderer.invoke("setup:complete") },
  conversations: { list: (search) => ipcRenderer.invoke("conversations:list", search), create: (input) => ipcRenderer.invoke("conversations:create", input), rename: (id, title) => ipcRenderer.invoke("conversations:rename", id, title), addMessage: (input) => ipcRenderer.invoke("conversations:add-message", input), delete: (id) => ipcRenderer.invoke("conversations:delete", id) },
  learnerMemory: { list: () => ipcRenderer.invoke("learner-memory:list"), forget: (id) => ipcRenderer.invoke("learner-memory:forget", id), clear: () => ipcRenderer.invoke("learner-memory:clear") },
  providers: { list: () => ipcRenderer.invoke("providers:list"), saveKey: (id, key) => ipcRenderer.invoke("providers:save-key", id, key), removeKey: (id) => ipcRenderer.invoke("providers:remove-key", id), setModel: (id, model) => ipcRenderer.invoke("providers:set-model", id, model), setEndpoint: (id, endpoint) => ipcRenderer.invoke("providers:set-endpoint", id, endpoint), select: (id) => ipcRenderer.invoke("providers:select", id), test: (id) => ipcRenderer.invoke("providers:test", id), models: (id) => ipcRenderer.invoke("providers:models", id) },
  rumik: { getStatus: () => ipcRenderer.invoke("rumik:status"), start: () => ipcRenderer.invoke("rumik:start"), stop: () => ipcRenderer.invoke("rumik:stop"), healthCheck: () => ipcRenderer.invoke("rumik:health"), synthesize: (text, config) => ipcRenderer.invoke("rumik:synthesize", text, config), cancel: () => ipcRenderer.invoke("rumik:cancel"), getVoices: () => ipcRenderer.invoke("rumik:voices"), onSegmentReady: (listener) => { const wrapped = (_event: Electron.IpcRendererEvent, segment: RumikSegment) => listener(segment); ipcRenderer.on("rumik:segment-ready", wrapped); return () => ipcRenderer.removeListener("rumik:segment-ready", wrapped); }, onStateChange: (listener) => { const wrapped = (_event: Electron.IpcRendererEvent, status: RumikStatus) => listener(status); ipcRenderer.on("rumik:state", wrapped); return () => ipcRenderer.removeListener("rumik:state", wrapped); } },
  teaching: { teach: (conversationId, question, options) => ipcRenderer.invoke("teaching:teach", conversationId, question, options) }
};

contextBridge.exposeInMainWorld("opennbLM", api);
