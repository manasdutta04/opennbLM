import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { InstanceInfo, ModelCatalog, ModelOption, ModelSelection } from "@opennblm/contracts";
import { ENGINE_FLEET, type EngineDefinition } from "./fleet.js";
import { runCli, whichCli } from "./cli.js";

function labelForSlug(id: string): string {
  const separator = id.indexOf("/");
  if (separator > 0) {
    const provider = id.slice(0, separator);
    const model = id.slice(separator + 1);
    const providerLabel =
      provider === "opencode" ? "Zen" : provider === "opencode-go" ? "Go" : provider.charAt(0).toUpperCase() + provider.slice(1);
    return `${providerLabel} · ${model}`;
  }
  return id;
}

async function discoverOpenCodeModels(cli: string, fallback: ModelCatalog): Promise<ModelCatalog> {
  const probe = await runCli(cli, ["models"], { timeout: 20_000 });
  if (!probe.ok && !probe.stdout.trim()) return fallback;
  const options: ModelOption[] = [];
  const seen = new Set<string>();
  for (const line of probe.stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("{") || trimmed.startsWith("[")) continue;
    const slug = trimmed.split(/\s+/)[0];
    if (!slug || !slug.includes("/") || seen.has(slug) || /\s/.test(slug)) continue;
    seen.add(slug);
    options.push({ id: slug, label: labelForSlug(slug) });
  }
  if (!options.length) return fallback;
  const preferred = options.find((option) => option.id === fallback.default) ?? options[0]!;
  return { default: preferred.id, options };
}

async function probeLocalModels(def: EngineDefinition): Promise<ModelCatalog | null> {
  if (!def.localBaseUrl) return null;
  try {
    if (def.driverKind === "ollama") {
      const response = await fetch(`${def.localBaseUrl.replace(/\/$/, "")}/api/tags`);
      if (!response.ok) return null;
      const body = (await response.json()) as { models?: Array<{ name?: string }> };
      const options: ModelOption[] = (body.models ?? [])
        .map((model) => model.name)
        .filter((name): name is string => Boolean(name))
        .map((id) => ({ id, label: id, custom: true, loaded: true }));
      if (!options.length) return { default: def.models.default, options: def.models.options };
      return { default: options[0]!.id, options };
    }
    const response = await fetch(`${def.localBaseUrl.replace(/\/$/, "")}/models`);
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: Array<{ id?: string }> };
    const options: ModelOption[] = (body.data ?? [])
      .map((model) => model.id)
      .filter((id): id is string => Boolean(id))
      .map((id) => ({ id, label: id, custom: true, loaded: true }));
    if (!options.length) return { default: def.models.default, options: def.models.options };
    return { default: options[0]!.id, options };
  } catch {
    return null;
  }
}

async function resolveModels(def: EngineDefinition, cli: string | null): Promise<ModelCatalog> {
  if (def.discoverModels === "opencode" && cli) {
    return discoverOpenCodeModels(cli, def.models);
  }
  return def.models;
}

async function snapshotEngine(def: EngineDefinition): Promise<InstanceInfo> {
  if (def.localBaseUrl) {
    const models = await probeLocalModels(def);
    if (models) {
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
          ? `${def.displayName} is installed but not serving models yet`
          : `${def.displayName} is not running`,
      },
      models: def.models,
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
      models: def.models,
    };
  }

  let authenticated = true;
  if (def.authArgs) {
    const probe = await runCli(cli, def.authArgs, { timeout: 8000 });
    if (def.driverKind === "claudeAgent") {
      try {
        const status = JSON.parse(probe.stdout) as { loggedIn?: boolean };
        authenticated = status.loggedIn === true;
      } catch {
        authenticated = probe.ok;
      }
    } else {
      authenticated = probe.ok;
    }
  }

  const models = await resolveModels(def, cli);

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
    models,
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

  async list(force = false): Promise<InstanceInfo[]> {
    if (!force && this.cache.length) return this.cache;
    this.cache = await Promise.all(ENGINE_FLEET.map((def) => snapshotEngine(def)));
    return this.cache;
  }

  async refresh(): Promise<InstanceInfo[]> {
    return this.list(true);
  }

  getSelection(): ModelSelection | null {
    return this.selection;
  }

  setSelection(selection: ModelSelection): ModelSelection {
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
