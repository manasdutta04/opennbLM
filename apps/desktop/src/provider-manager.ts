import { safeStorage } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createProvider, providerDefaults } from "@opennblm/llm-providers";
import type { ProviderId, ProviderSettingsApi, ProviderStatus } from "@opennblm/contracts";

const definitions: Array<{ id: ProviderId; label: string }> = [
  { id: "groq", label: "Groq" }, { id: "openai", label: "OpenAI" }, { id: "gemini", label: "Gemini" }, { id: "openrouter", label: "OpenRouter" }, { id: "ollama", label: "Ollama" }, { id: "custom", label: "Custom" }
];
type Preferences = Record<ProviderId, { model: string; baseUrl?: string }>;

export class ProviderManager implements ProviderSettingsApi {
  private readonly keyPath: string;
  private readonly preferencesPath: string;
  private keys: Partial<Record<ProviderId, string>> = {};
  private preferences: Preferences;
  constructor(userDataPath: string) {
    this.keyPath = join(userDataPath, "provider-credentials.enc"); this.preferencesPath = join(userDataPath, "provider-preferences.json");
    this.preferences = Object.fromEntries(definitions.map(({ id }) => [id, { model: providerDefaults[id].models[0] ?? "" }])) as Preferences;
    if (existsSync(this.preferencesPath)) { try { this.preferences = { ...this.preferences, ...JSON.parse(readFileSync(this.preferencesPath, "utf8")) }; } catch {} }
    this.loadKeys();
  }
  private loadKeys() { if (!existsSync(this.keyPath) || !safeStorage.isEncryptionAvailable()) return; try { const encrypted = JSON.parse(readFileSync(this.keyPath, "utf8")) as Record<string, string>; for (const [id, value] of Object.entries(encrypted)) this.keys[id as ProviderId] = safeStorage.decryptString(Buffer.from(value, "base64")); } catch {} }
  private saveKeys() { if (!safeStorage.isEncryptionAvailable()) throw new Error("OS credential storage is unavailable"); const encrypted = Object.fromEntries(Object.entries(this.keys).filter(([, value]) => value).map(([id, value]) => [id, safeStorage.encryptString(value!).toString("base64")])); writeFileSync(this.keyPath, JSON.stringify(encrypted), { mode: 0o600 }); }
  private savePreferences() { writeFileSync(this.preferencesPath, JSON.stringify(this.preferences, null, 2), { mode: 0o600 }); }
  private status(id: ProviderId, connection: ProviderStatus["connection"] = "unknown", error?: string): ProviderStatus { const definition = definitions.find((item) => item.id === id)!; return { id, label: definition.label, configured: id === "ollama" ? true : Boolean(this.keys[id]), model: this.preferences[id].model, connection, error }; }
  async list() { return definitions.map(({ id }) => this.status(id)); }
  async saveKey(id: ProviderId, key: string) { if (id === "ollama") return; if (!key.trim()) throw new Error("API key cannot be empty"); this.keys[id] = key.trim(); this.saveKeys(); }
  async removeKey(id: ProviderId) { delete this.keys[id]; this.saveKeys(); }
  async setModel(id: ProviderId, model: string) { this.preferences[id].model = model.trim(); this.savePreferences(); }
  async setEndpoint(id: ProviderId, endpoint: string) { this.preferences[id].baseUrl = endpoint.trim(); this.savePreferences(); }
  async models(id: ProviderId) { const provider = createProvider({ id, apiKey: this.keys[id], baseUrl: this.preferences[id].baseUrl }); try { return await provider.listModels(); } catch { return providerDefaults[id].models; } }
  async test(id: ProviderId): Promise<ProviderStatus> { const current = this.status(id); if (id !== "ollama" && !this.keys[id]) return { ...current, connection: "error" as const, error: "Not configured" }; try { await createProvider({ id, apiKey: this.keys[id], baseUrl: this.preferences[id].baseUrl }).healthCheck(); return this.status(id, "connected"); } catch (error) { return this.status(id, "error", error instanceof Error ? error.message : "Connection failed"); } }
}
