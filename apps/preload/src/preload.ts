import { contextBridge, ipcRenderer } from "electron";
import type { PreloadApi, RumikSegment, RumikStatus } from "@opennblm/contracts";

const api: PreloadApi = {
  getAppInfo: () => ipcRenderer.invoke("app:info"),
  setup: { getStatus: () => ipcRenderer.invoke("setup:status"), complete: () => ipcRenderer.invoke("setup:complete") },
  conversations: { list: (search) => ipcRenderer.invoke("conversations:list", search), getForNotebook: (notebookId) => ipcRenderer.invoke("conversations:for-notebook", notebookId), create: (input) => ipcRenderer.invoke("conversations:create", input), rename: (id, title) => ipcRenderer.invoke("conversations:rename", id, title), addMessage: (input) => ipcRenderer.invoke("conversations:add-message", input), delete: (id) => ipcRenderer.invoke("conversations:delete", id) },
  learnerMemory: { list: () => ipcRenderer.invoke("learner-memory:list"), forget: (id) => ipcRenderer.invoke("learner-memory:forget", id), clear: () => ipcRenderer.invoke("learner-memory:clear") },
  providers: { list: () => ipcRenderer.invoke("providers:list"), saveKey: (id, key) => ipcRenderer.invoke("providers:save-key", id, key), removeKey: (id) => ipcRenderer.invoke("providers:remove-key", id), setModel: (id, model) => ipcRenderer.invoke("providers:set-model", id, model), setEndpoint: (id, endpoint) => ipcRenderer.invoke("providers:set-endpoint", id, endpoint), select: (id) => ipcRenderer.invoke("providers:select", id), test: (id) => ipcRenderer.invoke("providers:test", id), models: (id) => ipcRenderer.invoke("providers:models", id) },
  engines: {
    list: () => ipcRenderer.invoke("engines:list"),
    refresh: () => ipcRenderer.invoke("engines:refresh"),
    getSelection: () => ipcRenderer.invoke("engines:get-selection"),
    setSelection: (selection) => ipcRenderer.invoke("engines:set-selection", selection),
    openInstallTerminal: (command) => ipcRenderer.invoke("engine:open-terminal", command),
  },
  shell: {
    popupMenu: (label, x, y) => ipcRenderer.invoke("shell:popup-menu", label, x, y),
    getPlatform: () => ipcRenderer.invoke("shell:platform"),
    openExternal: (url) => ipcRenderer.invoke("shell:open-external", url),
  },
  rumik: { getStatus: () => ipcRenderer.invoke("rumik:status"), setMode: (mode) => ipcRenderer.invoke("rumik:set-mode", mode), setHfToken: (token) => ipcRenderer.invoke("rumik:set-hf-token", token), start: () => ipcRenderer.invoke("rumik:start"), stop: () => ipcRenderer.invoke("rumik:stop"), healthCheck: () => ipcRenderer.invoke("rumik:health"), synthesize: (text, config) => ipcRenderer.invoke("rumik:synthesize", text, config), cancel: () => ipcRenderer.invoke("rumik:cancel"), getVoices: () => ipcRenderer.invoke("rumik:voices"), onSegmentReady: (listener) => { const wrapped = (_event: Electron.IpcRendererEvent, segment: RumikSegment) => listener(segment); ipcRenderer.on("rumik:segment-ready", wrapped); return () => ipcRenderer.removeListener("rumik:segment-ready", wrapped); }, onStateChange: (listener) => { const wrapped = (_event: Electron.IpcRendererEvent, status: RumikStatus) => listener(status); ipcRenderer.on("rumik:state", wrapped); return () => ipcRenderer.removeListener("rumik:state", wrapped); } },
  teaching: { teach: (conversationId, question, options) => ipcRenderer.invoke("teaching:teach", conversationId, question, options) },
  notebooks: {
    list: () => ipcRenderer.invoke("notebooks:list"),
    create: (title) => ipcRenderer.invoke("notebooks:create", title),
    rename: (id, title) => ipcRenderer.invoke("notebooks:rename", id, title),
    remove: (id) => ipcRenderer.invoke("notebooks:remove", id),
    listSources: (notebookId) => ipcRenderer.invoke("notebooks:list-sources", notebookId),
    addTextSource: (notebookId, title, text) => ipcRenderer.invoke("notebooks:add-text", notebookId, title, text),
    addUrlSource: (notebookId, url) => ipcRenderer.invoke("notebooks:add-url", notebookId, url),
    addFileSource: (notebookId, filePath) => ipcRenderer.invoke("notebooks:add-file", notebookId, filePath),
    setSourceContext: (sourceId, level) => ipcRenderer.invoke("notebooks:set-source-context", sourceId, level),
    removeSource: (sourceId) => ipcRenderer.invoke("notebooks:remove-source", sourceId),
    listNotes: (notebookId) => ipcRenderer.invoke("notebooks:list-notes", notebookId),
    createNote: (notebookId, input) => ipcRenderer.invoke("notebooks:create-note", notebookId, input),
    updateNote: (noteId, input) => ipcRenderer.invoke("notebooks:update-note", noteId, input),
    removeNote: (noteId) => ipcRenderer.invoke("notebooks:remove-note", noteId),
    transformNote: (notebookId, transform, options) => ipcRenderer.invoke("notebooks:transform-note", notebookId, transform, options),
    search: (query, notebookId) => ipcRenderer.invoke("notebooks:search", query, notebookId),
    ask: (notebookId, question, options) => ipcRenderer.invoke("notebooks:ask", notebookId, question, options),
    generateGuide: (notebookId, options) => ipcRenderer.invoke("notebooks:generate-guide", notebookId, options),
    listPodcasts: (notebookId) => ipcRenderer.invoke("notebooks:list-podcasts", notebookId),
    createPodcast: (notebookId, options) => ipcRenderer.invoke("notebooks:create-podcast", notebookId, options),
    listArtifacts: (notebookId) => ipcRenderer.invoke("notebooks:list-artifacts", notebookId),
    generateArtifact: (notebookId, kind, options) => ipcRenderer.invoke("notebooks:generate-artifact", notebookId, kind, options),
    removeArtifact: (artifactId) => ipcRenderer.invoke("notebooks:remove-artifact", artifactId),
    pickSourceFile: () => ipcRenderer.invoke("notebooks:pick-source-file"),
  },
};

contextBridge.exposeInMainWorld("opennbLM", api);
