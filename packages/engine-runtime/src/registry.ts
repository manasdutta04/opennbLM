import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { InstanceInfo, ModelCatalog, ModelSelection } from "@opennblm/contracts";
import {
  EMPTY_CATALOG,
  discoverAntigravityModels,
  discoverClaudeModels,
  discoverCodexModels,
  discoverCursorModels,
  discoverGrokModels,
  discoverHermesModels,
  discoverKimiModels,
  discoverLmStudioModels,
  discoverOllamaModels,
  discoverOpenCodeModels,
  discoverQwenModels,
  hasCodexAuth,
  hasGrokAuth,
  hasKimiAuth,
  hasOpenCodeAuth,
  hermesHasHostedConfig,
  probeClaudeAuth,
  probeCursorAuth,
} from "./discover.js";
import { ENGINE_FLEET, type EngineDefinition } from "./fleet.js";
import { whichCli } from "./cli.js";

async function resolveModels(def: EngineDefinition, cli: string | null): Promise<ModelCatalog> {
  if (!cli && !def.localBaseUrl) return EMPTY_CATALOG;

  switch (def.discoverModels) {
    case "opencode":
      return cli ? discoverOpenCodeModels(cli) : EMPTY_CATALOG;
    case "cursor":
      return cli ? discoverCursorModels(cli) : EMPTY_CATALOG;
    case "codex":
      return cli ? discoverCodexModels(cli) : EMPTY_CATALOG;
    case "claude":
      return cli ? discoverClaudeModels(cli) : EMPTY_CATALOG;
    case "grok":
      return cli ? discoverGrokModels(cli) : EMPTY_CATALOG;
    case "kimi":
      return cli ? discoverKimiModels(cli) : EMPTY_CATALOG;
    case "antigravity":
      return cli ? discoverAntigravityModels(cli) : EMPTY_CATALOG;
    case "hermes":
      return cli ? discoverHermesModels(cli) : EMPTY_CATALOG;
    case "qwen":
      return cli ? discoverQwenModels(cli) : EMPTY_CATALOG;
    case "ollama":
      return (def.localBaseUrl && (await discoverOllamaModels(def.localBaseUrl))) || EMPTY_CATALOG;
    case "lmstudio":
      return (def.localBaseUrl && (await discoverLmStudioModels(def.localBaseUrl))) || EMPTY_CATALOG;
    default:
      return EMPTY_CATALOG;
  }
}

async function resolveAuthenticated(
  def: EngineDefinition,
  cli: string | null,
  models: ModelCatalog,
): Promise<boolean> {
  switch (def.discoverModels) {
    case "claude":
      return cli ? probeClaudeAuth(cli) : false;
    case "cursor":
      return cli ? probeCursorAuth(cli) : false;
    case "codex":
      return hasCodexAuth() || models.options.length > 0;
    case "opencode":
      // Free/anonymous Zen models can list without stored auth.
      return hasOpenCodeAuth() || models.options.length > 0;
    case "grok":
      return hasGrokAuth();
    case "kimi":
      return hasKimiAuth();
    case "hermes":
      return hermesHasHostedConfig() || models.options.length > 0;
    case "antigravity":
    case "qwen":
      // No reliable credential file; CLI present + (optional) discovered models.
      return Boolean(cli);
    case "ollama":
    case "lmstudio":
      return models.options.length > 0;
    default:
      return false;
  }
}

async function snapshotEngine(def: EngineDefinition): Promise<InstanceInfo> {
  if (def.localBaseUrl) {
    const models = await resolveModels(def, null);
    if (models.options.length) {
      return {
        instanceId: def.instanceId,
        driverKind: def.driverKind,
        displayName: def.displayName,
        rail: def.rail,
        install: def.install,
        snapshot: { state: "available", authenticated: true, version: "local" },
        models,
      };
    }
    const cli = await whichCli(def.cliNames);
    return {
      instanceId: def.instanceId,
      driverKind: def.driverKind,
      displayName: def.displayName,
      rail: def.rail,
      install: def.install,
      snapshot: {
        state: "unavailable",
        authenticated: false,
        reason: cli
          ? `${def.displayName} is installed but has no loaded models yet`
          : `${def.displayName} is not running`,
      },
      models: EMPTY_CATALOG,
    };
  }

  const cli = await whichCli(def.cliNames);
  if (!cli) {
    return {
      instanceId: def.instanceId,
      driverKind: def.driverKind,
      displayName: def.displayName,
      rail: def.rail,
      install: def.install,
      snapshot: {
        state: "unavailable",
        authenticated: false,
        reason: `${def.displayName} CLI is not installed`,
      },
      models: EMPTY_CATALOG,
    };
  }

  const models = await resolveModels(def, cli);
  const authenticated = await resolveAuthenticated(def, cli, models);

  return {
    instanceId: def.instanceId,
    driverKind: def.driverKind,
    displayName: def.displayName,
    rail: def.rail,
    install: def.install,
    snapshot: {
      state: "available",
      authenticated,
      version: authenticated ? "ready" : "needs sign-in",
      reason: authenticated ? undefined : `Sign in with: ${def.install?.signInCommand ?? def.displayName}`,
    },
    // Only expose models the user can actually reach after auth (or free catalogs).
    models: authenticated || def.discoverModels === "opencode" ? models : EMPTY_CATALOG,
  };
}

export class EngineRegistry {
  private cache: InstanceInfo[] = [];
  private selection: ModelSelection | null = null;
  private readonly storePath: string;

  constructor(userDataPath: string) {
    this.storePath = join(userDataPath, "engine-selection.json");
    mkdirSync(userDataPath, { recursive: true });
    this.loadSelection();
  }

  private loadSelection(): void {
    try {
      if (!existsSync(this.storePath)) return;
      const raw = JSON.parse(readFileSync(this.storePath, "utf8")) as ModelSelection;
      if (raw && typeof raw.instanceId === "string" && typeof raw.model === "string") {
        this.selection = raw;
      }
    } catch {
      this.selection = null;
    }
  }

  private persistSelection(): void {
    writeFileSync(this.storePath, JSON.stringify(this.selection ?? null, null, 2), "utf8");
  }

  /** Drop a saved selection if that model is no longer in the live catalog. */
  private reconcileSelection(instances: InstanceInfo[]): void {
    if (!this.selection) return;
    const instance = instances.find((item) => item.instanceId === this.selection!.instanceId);
    const stillValid = instance?.models.options.some((option) => option.id === this.selection!.model);
    if (stillValid) return;
    this.selection = null;
    this.persistSelection();
  }

  async list(force = false): Promise<InstanceInfo[]> {
    if (!force && this.cache.length) return this.cache;
    this.cache = await Promise.all(ENGINE_FLEET.map((def) => snapshotEngine(def)));
    this.reconcileSelection(this.cache);
    return this.cache;
  }

  async refresh(): Promise<InstanceInfo[]> {
    return this.list(true);
  }

  getSelection(): ModelSelection | null {
    return this.selection;
  }

  setSelection(selection: ModelSelection): ModelSelection {
    const instance = this.cache.find((item) => item.instanceId === selection.instanceId);
    if (
      instance &&
      instance.models.options.length > 0 &&
      !instance.models.options.some((option) => option.id === selection.model)
    ) {
      throw new Error(`Model "${selection.model}" is not available for ${selection.instanceId}`);
    }
    this.selection = selection;
    this.persistSelection();
    return selection;
  }

  getDefinition(instanceId: string): EngineDefinition | undefined {
    return ENGINE_FLEET.find((item) => item.instanceId === instanceId);
  }

  getCachedInstance(instanceId: string): InstanceInfo | undefined {
    return this.cache.find((item) => item.instanceId === instanceId);
  }
}
