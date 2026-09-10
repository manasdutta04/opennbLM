import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ModelCatalog, ModelOption } from "@opennblm/contracts";
import { runCli, spawnCli } from "./cli.js";

export const EMPTY_CATALOG: ModelCatalog = { default: "", options: [] };

const MODEL_ID = /^[a-z0-9][a-z0-9._:+/-]*$/i;
const SLUG = /^[a-z0-9][a-z0-9._-]*$/i;

function home(env: NodeJS.ProcessEnv = process.env): string {
  return env.HOME || env.USERPROFILE || homedir();
}

function readText(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function readJson(path: string): unknown {
  const text = readText(path);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function unquote(raw: string): string {
  let value = raw.trim();
  if (value.length >= 2) {
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      return value.slice(1, -1).replace(/\\"/g, '"');
    }
  }
  return value;
}

function catalogFromOptions(options: ModelOption[], preferred?: string): ModelCatalog {
  if (!options.length) return EMPTY_CATALOG;
  const defaultId =
    preferred && options.some((option) => option.id === preferred) ? preferred : options[0]!.id;
  return { default: defaultId, options };
}

function firstJsonValue(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    /* banner before payload */
  }
  const start = trimmed.search(/[{[]/);
  if (start < 0) return null;
  for (let end = trimmed.length; end > start + 1; end--) {
    const slice = trimmed.slice(start, end).trim();
    if (!slice.endsWith("}") && !slice.endsWith("]")) continue;
    try {
      return JSON.parse(slice);
    } catch {
      /* shrink */
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function truthyAuthFlag(value: unknown): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "authenticated", "logged_in", "logged-in", "yes"].includes(normalized)) return true;
    if (["false", "unauthenticated", "logged_out", "logged-out", "no"].includes(normalized)) return false;
  }
  return null;
}

function extrasFromUnknown(value: unknown): ModelOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") {
      return MODEL_ID.test(item) ? [{ id: item, label: item }] : [];
    }
    if (!item || typeof item !== "object") return [];
    const row = item as {
      id?: unknown;
      model?: unknown;
      slug?: unknown;
      name?: unknown;
      displayName?: unknown;
      label?: unknown;
    };
    const id = [row.id, row.model, row.slug].find((candidate): candidate is string => typeof candidate === "string");
    if (!id || !MODEL_ID.test(id)) return [];
    const label = [row.name, row.displayName, row.label].find(
      (candidate): candidate is string => typeof candidate === "string",
    );
    return [{ id, label: label || id }];
  });
}

/** Parse plain CLI model lists: `id`, `id - Label`, `(default)` markers. */
export function decodePlainModelText(text: string): ModelCatalog | null {
  const options: ModelOption[] = [];
  const seen = new Set<string>();
  let markedDefault: string | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || /^available\s+models?\b/i.test(line) || /^models?\b/i.test(line)) continue;
    const stripped = line.replace(/^[\s*•\-]+\s*/, "");
    const parts = stripped.split(/\s+[—–|:]\s+|\s+-\s+|\s{2,}/);
    let id = (parts[0] ?? "").trim();
    let rawLabel = parts.slice(1).join(" ").trim();
    let isDefault = false;
    const defaultMatch = rawLabel.match(/\s*\(default\)\s*$/i);
    if (defaultMatch) {
      isDefault = true;
      rawLabel = rawLabel.slice(0, defaultMatch.index).trim();
    }
    if (!MODEL_ID.test(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    options.push({ id, label: rawLabel || id });
    if (isDefault) markedDefault = id;
  }
  if (!options.length) return null;
  return catalogFromOptions(options, markedDefault);
}

async function tryCliModelList(cli: string, argSets: string[][]): Promise<ModelCatalog | null> {
  for (const args of argSets) {
    const probe = await runCli(cli, args, { timeout: 12_000 });
    const text = `${probe.stdout}\n${probe.stderr}`;
    if (!text.trim()) continue;
    const fromText = decodePlainModelText(probe.stdout || text);
    if (fromText) return fromText;
    const json = firstJsonValue(probe.stdout || text);
    const rec = asRecord(json);
    if (rec) {
      const rows =
        (Array.isArray(rec.models) && rec.models) ||
        (Array.isArray(rec.data) && rec.data) ||
        (Array.isArray(json) && json) ||
        [];
      const options = extrasFromUnknown(rows);
      if (options.length) return catalogFromOptions(options);
    }
  }
  return null;
}

// ── OpenCode ───────────────────────────────────────────────────────────────

function labelForModel(id: string): string {
  return id
    .split(/[-_.]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function providerLabel(id: string): string {
  if (id === "opencode") return "Zen";
  if (id === "opencode-go") return "Go";
  if (id === "openrouter") return "OpenRouter";
  return labelForModel(id);
}

function validOpenCodeSlug(value: string): boolean {
  const separator = value.indexOf("/");
  if (separator <= 0 || separator >= value.length - 1 || /\s/u.test(value)) return false;
  return [...value].every((character) => (character.codePointAt(0) ?? 0) > 0x1f);
}

export function parseOpenCodeModelsOutput(stdout: string): ModelCatalog | null {
  const options: ModelOption[] = [];
  const seen = new Set<string>();
  let slug: string | null = null;
  let jsonLines: string[] = [];

  const flush = () => {
    if (!slug || seen.has(slug)) return;
    const separator = slug.indexOf("/");
    const provider = slug.slice(0, separator);
    const model = slug.slice(separator + 1);
    let record: Record<string, unknown> = {};
    const raw = jsonLines.join("\n").trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          record = parsed as Record<string, unknown>;
        }
      } catch {
        /* header-only CLI */
      }
    }
    if (record.status === "deprecated") return;
    const name =
      typeof record.name === "string" && record.name.trim() ? record.name.trim() : labelForModel(model);
    seen.add(slug);
    options.push({ id: slug, label: `${providerLabel(provider)} · ${name}` });
  };

  for (const line of stdout.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (line === trimmed && validOpenCodeSlug(trimmed)) {
      flush();
      slug = trimmed;
      jsonLines = [];
      continue;
    }
    if (slug) jsonLines.push(line);
  }
  flush();
  return options.length ? catalogFromOptions(options) : null;
}

let lastOpenCodeCatalog: ModelCatalog | null = null;

export async function discoverOpenCodeModels(cli: string): Promise<ModelCatalog> {
  // Prefer non-verbose first: huge verbose dumps can hit buffers / timeouts, and
  // header-only lines already yield a usable account catalog.
  for (const verbose of [false, true]) {
    const probe = await runCli(cli, verbose ? ["models", "--verbose"] : ["models"], {
      timeout: 45_000,
    });
    const catalog = parseOpenCodeModelsOutput(probe.stdout || probe.stderr);
    if (catalog) {
      lastOpenCodeCatalog = catalog;
      return catalog;
    }
  }
  return lastOpenCodeCatalog ?? EMPTY_CATALOG;
}

function opencodeAuthPaths(env: NodeJS.ProcessEnv = process.env): string[] {
  const roots = [
    env.XDG_DATA_HOME || join(home(env), ".local", "share"),
    process.platform === "darwin"
      ? join(home(env), "Library", "Application Support")
      : process.platform === "win32"
        ? env.LOCALAPPDATA || join(home(env), "AppData", "Local")
        : "",
  ].filter(Boolean);
  return [...new Set(roots)].map((root) => join(root, "opencode", "auth.json"));
}

export function hasOpenCodeAuth(env: NodeJS.ProcessEnv = process.env): boolean {
  for (const path of opencodeAuthPaths(env)) {
    const parsed = asRecord(readJson(path));
    if (!parsed) continue;
    const usable = Object.values(parsed).some((auth) => {
      if (!auth || typeof auth !== "object" || Array.isArray(auth)) return false;
      const entry = auth as { key?: unknown; access?: unknown; refresh?: unknown };
      return Boolean(entry.key || entry.access || entry.refresh);
    });
    if (usable) return true;
  }
  return Boolean(env.OPENCODE_API_KEY?.trim());
}

// ── Cursor ─────────────────────────────────────────────────────────────────

export function decodeCursorAuthStatus(payload: unknown): boolean | null {
  const rec = asRecord(payload);
  if (!rec) return null;
  const auth = asRecord(rec.auth);
  for (const candidate of [
    rec.isAuthenticated,
    rec.authenticated,
    rec.loggedIn,
    rec.logged_in,
    auth?.isAuthenticated,
    auth?.authenticated,
    rec.status,
    auth?.status,
  ]) {
    const flag = truthyAuthFlag(candidate);
    if (flag !== null) return flag;
  }
  return null;
}

export function decodeCursorAuthText(text: string): boolean | null {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return null;
  if (/not (?:logged|signed) in|not authenticated|unauthenticated|logged out/.test(normalized)) return false;
  if (/login successful|logged in|signed in|authenticated/.test(normalized)) return true;
  return null;
}

export async function probeCursorAuth(cli: string): Promise<boolean> {
  if (process.env.CURSOR_API_KEY?.trim() || process.env.CURSOR_AUTH_TOKEN?.trim()) return true;
  for (const args of [["status", "--format", "json"], ["status"]] as const) {
    const probe = await runCli(cli, [...args], { timeout: 8_000 });
    if (!probe.stdout.trim() && !probe.ok) continue;
    const decoded =
      decodeCursorAuthStatus(firstJsonValue(probe.stdout)) ?? decodeCursorAuthText(probe.stdout);
    if (decoded !== null) return decoded;
  }
  return false;
}

export async function discoverCursorModels(cli: string): Promise<ModelCatalog> {
  const live = await tryCliModelList(cli, [["models"], ["--list-models"]]);
  return live ?? EMPTY_CATALOG;
}

// ── Codex (app-server) ─────────────────────────────────────────────────────

export function discoverCodexAppServerModels(cli: string, timeoutMs = 8_000): Promise<ModelCatalog> {
  return new Promise((resolve) => {
    const child = spawnCli(cli, ["app-server"], {
      cwd: home(),
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let settled = false;
    let buffer = "";
    let nextId = 1;
    const models: Array<{
      id?: string;
      displayName?: string;
      hidden?: boolean;
      isDefault?: boolean;
    }> = [];
    const cursors = new Set<string>();
    const pending = new Map<number, "initialize" | "models">();

    const finish = (catalog: ModelCatalog) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.kill();
      } catch {
        /* gone */
      }
      resolve(catalog);
    };

    const request = (method: string, params: unknown, kind: "initialize" | "models") => {
      const id = nextId++;
      pending.set(id, kind);
      try {
        child.stdin?.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      } catch {
        finish(EMPTY_CATALOG);
      }
    };

    const requestModels = (cursor: string | null) => {
      request("model/list", { cursor, limit: 100 }, "models");
    };

    const timer = setTimeout(() => finish(EMPTY_CATALOG), timeoutMs);
    timer.unref?.();

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      buffer += chunk;
      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (!line.trim()) continue;
        let message: { id?: number; error?: unknown; result?: { data?: unknown[]; nextCursor?: string } };
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }
        const kind = pending.get(message.id as number);
        if (!kind) continue;
        pending.delete(message.id as number);
        if (message.error) {
          finish(EMPTY_CATALOG);
          return;
        }
        if (kind === "initialize") {
          try {
            child.stdin?.write(`${JSON.stringify({ jsonrpc: "2.0", method: "initialized", params: {} })}\n`);
          } catch {
            finish(EMPTY_CATALOG);
            return;
          }
          requestModels(null);
          continue;
        }

        const page = message.result;
        if (Array.isArray(page?.data)) {
          models.push(...(page.data as typeof models));
        }
        const cursor = typeof page?.nextCursor === "string" && page.nextCursor ? page.nextCursor : null;
        if (cursor && !cursors.has(cursor)) {
          cursors.add(cursor);
          requestModels(cursor);
          continue;
        }

        const options: ModelOption[] = [];
        const seen = new Set<string>();
        let defaultModel: string | null = null;
        for (const row of models) {
          if (row.hidden === true || typeof row.id !== "string" || !MODEL_ID.test(row.id) || seen.has(row.id)) {
            continue;
          }
          seen.add(row.id);
          options.push({
            id: row.id,
            label: typeof row.displayName === "string" && row.displayName.trim() ? row.displayName : row.id,
          });
          if (row.isDefault === true) defaultModel = row.id;
        }
        finish(catalogFromOptions(options, defaultModel ?? undefined));
      }
    });
    child.on("error", () => finish(EMPTY_CATALOG));
    child.on("close", () => finish(EMPTY_CATALOG));
    request("initialize", { clientInfo: { name: "opennblm", version: "1" } }, "initialize");
  });
}

export async function discoverCodexModels(cli: string): Promise<ModelCatalog> {
  const live = await discoverCodexAppServerModels(cli);
  if (live.options.length) return live;
  return (await tryCliModelList(cli, [["models"], ["model", "list"]])) ?? EMPTY_CATALOG;
}

export function hasCodexAuth(env: NodeJS.ProcessEnv = process.env): boolean {
  const dir = env.CODEX_HOME || join(home(env), ".codex");
  return (
    existsSync(join(dir, "auth.json")) ||
    existsSync(join(dir, "config.toml")) ||
    Boolean(env.OPENAI_API_KEY?.trim())
  );
}

// ── Claude ─────────────────────────────────────────────────────────────────

function claudeConfigDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.CLAUDE_CONFIG_DIR) return env.CLAUDE_CONFIG_DIR;
  return join(home(env), ".claude");
}

/** Only models the user (or Claude Code settings) actually configured — no ship-time list. */
export function readClaudeConfiguredModels(env: NodeJS.ProcessEnv = process.env): ModelCatalog {
  const settings = asRecord(readJson(join(claudeConfigDir(env), "settings.json")));
  if (!settings) return EMPTY_CATALOG;
  const extras = [
    ...extrasFromUnknown(settings.availableModels),
    ...extrasFromUnknown(settings.customModels),
    ...extrasFromUnknown(settings.extraModels),
    ...extrasFromUnknown(settings.model ? [settings.model] : []),
  ];
  const nestedEnv = asRecord(settings.env) ?? {};
  const envModel = nestedEnv.ANTHROPIC_MODEL ?? env.ANTHROPIC_MODEL;
  if (typeof envModel === "string") extras.push(...extrasFromUnknown([envModel]));
  const seen = new Set<string>();
  const options = extras.filter((option) => {
    if (seen.has(option.id)) return false;
    seen.add(option.id);
    return true;
  });
  return catalogFromOptions(options);
}

export async function discoverClaudeModels(cli: string): Promise<ModelCatalog> {
  // Prefer `claude models` — when signed in this is the account-facing catalog.
  const probe = await runCli(cli, ["models"], { timeout: 12_000 });
  const blob = `${probe.stdout}\n${probe.stderr}`.toLowerCase();
  if (/not logged in|please run \/login|not signed in|unauthenticated/.test(blob)) {
    return EMPTY_CATALOG;
  }
  const fromModels = decodePlainModelText(probe.stdout);
  if (fromModels?.options.length) return fromModels;

  const live = await tryCliModelList(cli, [["model", "list"], ["--list-models"]]);
  if (live?.options.length) return live;
  return readClaudeConfiguredModels();
}

export async function probeClaudeAuth(cli: string): Promise<boolean> {
  const probe = await runCli(cli, ["auth", "status", "--json"], { timeout: 8_000 });
  try {
    const status = JSON.parse(probe.stdout) as { loggedIn?: boolean };
    return status.loggedIn === true;
  } catch {
    return probe.ok;
  }
}

// ── Grok ───────────────────────────────────────────────────────────────────

function grokHome(env: NodeJS.ProcessEnv = process.env): string {
  if (env.GROK_HOME) return env.GROK_HOME;
  return join(home(env), ".grok");
}

export function readGrokConfiguredModels(env: NodeJS.ProcessEnv = process.env): ModelCatalog {
  const text = readText(join(grokHome(env), "config.toml"));
  if (!text) return EMPTY_CATALOG;
  const options: ModelOption[] = [];
  const seen = new Set<string>();
  let configuredDefault: string | null = null;
  let current: { slug: string; name?: string } | null = null;
  let inModels = false;

  const flush = () => {
    if (!current || !SLUG.test(current.slug) || seen.has(current.slug)) {
      current = null;
      return;
    }
    seen.add(current.slug);
    options.push({ id: current.slug, label: current.name || current.slug, custom: true });
    current = null;
  };

  for (const line of text.split(/\r?\n/)) {
    const stripped = line.trim();
    if (stripped === "[models]") {
      flush();
      inModels = true;
      continue;
    }
    if (stripped.startsWith("[model.") && stripped.endsWith("]")) {
      flush();
      inModels = false;
      let inner = stripped.slice("[model.".length, -1);
      if (inner.startsWith('"') && inner.endsWith('"')) inner = inner.slice(1, -1);
      current = { slug: inner };
      continue;
    }
    if (stripped.startsWith("[")) {
      flush();
      inModels = false;
      continue;
    }
    if (!stripped || stripped.startsWith("#") || !stripped.includes("=")) continue;
    const eq = stripped.indexOf("=");
    const key = stripped.slice(0, eq).trim();
    const value = unquote(stripped.slice(eq + 1));
    if (current && key === "name" && value) current.name = value;
    if (!current && inModels && key === "default") configuredDefault = value;
  }
  flush();
  return catalogFromOptions(options, configuredDefault ?? undefined);
}

export async function discoverGrokModels(cli: string): Promise<ModelCatalog> {
  const live = await tryCliModelList(cli, [["models"], ["model", "list"], ["--list-models"]]);
  if (live?.options.length) return live;
  return readGrokConfiguredModels();
}

export function hasGrokAuth(env: NodeJS.ProcessEnv = process.env): boolean {
  return existsSync(join(grokHome(env), "auth.json")) || Boolean(env.XAI_API_KEY?.trim());
}

// ── Kimi ───────────────────────────────────────────────────────────────────

function kimiDataRoot(env: NodeJS.ProcessEnv = process.env): string {
  return join(home(env), ".kimi-code");
}

export function readKimiConfiguredModels(env: NodeJS.ProcessEnv = process.env): ModelCatalog {
  const text = readText(join(kimiDataRoot(env), "config.toml"));
  if (!text) return EMPTY_CATALOG;
  const options: ModelOption[] = [];
  const seen = new Set<string>();
  let current: { slug: string; name?: string } | null = null;

  const flush = () => {
    if (!current || !MODEL_ID.test(current.slug) || seen.has(current.slug)) {
      current = null;
      return;
    }
    seen.add(current.slug);
    options.push({ id: current.slug, label: current.name || current.slug });
    current = null;
  };

  for (const line of text.split(/\r?\n/)) {
    const stripped = line.trim();
    if ((stripped.startsWith("[model.") || stripped.startsWith("[models.")) && stripped.endsWith("]")) {
      flush();
      let inner = stripped.replace(/^\[models?\./, "").slice(0, -1);
      if (inner.startsWith('"') && inner.endsWith('"')) inner = inner.slice(1, -1);
      current = { slug: inner };
      continue;
    }
    if (stripped.startsWith("[")) {
      flush();
      continue;
    }
    if (!stripped || stripped.startsWith("#") || !stripped.includes("=")) continue;
    const eq = stripped.indexOf("=");
    const key = stripped.slice(0, eq).trim();
    let value = stripped.slice(eq + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (current && (key === "name" || key === "label") && value) current.name = value;
  }
  flush();
  return catalogFromOptions(options);
}

export async function discoverKimiModels(cli: string): Promise<ModelCatalog> {
  const live = await tryCliModelList(cli, [
    ["models"],
    ["model", "list"],
    ["provider", "list"],
    ["--list-models"],
  ]);
  if (live?.options.length) return live;
  return readKimiConfiguredModels();
}

export function hasKimiAuth(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    existsSync(join(kimiDataRoot(env), "credentials", "kimi-code.json")) ||
    Boolean(env.KIMI_API_KEY?.trim() || env.MOONSHOT_API_KEY?.trim())
  );
}

// ── Antigravity ────────────────────────────────────────────────────────────

function antigravityConfigDir(env: NodeJS.ProcessEnv = process.env): string {
  return join(home(env), ".gemini", "antigravity-cli");
}

export function readAntigravityConfiguredModels(env: NodeJS.ProcessEnv = process.env): ModelCatalog {
  const settings = asRecord(readJson(join(antigravityConfigDir(env), "settings.json")));
  if (!settings) return EMPTY_CATALOG;
  const extras = [
    ...extrasFromUnknown(settings.availableModels),
    ...extrasFromUnknown(settings.customModels),
    ...extrasFromUnknown(settings.extraModels),
    ...extrasFromUnknown(settings.models),
  ];
  const seen = new Set<string>();
  const options = extras.filter((option) => {
    if (seen.has(option.id)) return false;
    seen.add(option.id);
    return true;
  });
  return catalogFromOptions(options);
}

export async function discoverAntigravityModels(cli: string): Promise<ModelCatalog> {
  const live = await tryCliModelList(cli, [["models"], ["model", "list"], ["--list-models"]]);
  if (live?.options.length) return live;
  return readAntigravityConfiguredModels();
}

// ── Hermes (ACP session/new) ───────────────────────────────────────────────

const HERMES_HOSTED_KEYS = [
  "OPENROUTER_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_API_KEY",
  "NOUS_API_KEY",
];

function hermesHome(env: NodeJS.ProcessEnv = process.env): string {
  return env.HERMES_HOME ? env.HERMES_HOME : join(home(env), ".hermes");
}

function nonEmptyDotenvValue(text: string, name: string): string | null {
  const re = new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`, "im");
  const match = re.exec(text);
  if (!match) return null;
  let value = match[1]!.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value || null;
}

export function hermesHasHostedConfig(env: NodeJS.ProcessEnv = process.env): boolean {
  const dir = hermesHome(env);
  const secrets = readText(join(dir, ".env")) ?? "";
  if (HERMES_HOSTED_KEYS.some((name) => nonEmptyDotenvValue(secrets, name) || env[name]?.trim())) {
    return true;
  }
  const config = readText(join(dir, "config.yaml")) ?? "";
  return /model\s*:/i.test(config) || /provider\s*:/i.test(config);
}

function fetchHermesAcpModels(cli: string, timeoutMs = 5_000): Promise<ModelOption[]> {
  return new Promise((resolve) => {
    let child: ReturnType<typeof spawnCli>;
    try {
      child = spawnCli(cli, ["acp"], {
        stdio: ["pipe", "pipe", "ignore"],
        env: process.env,
      });
    } catch {
      return resolve([]);
    }
    let settled = false;
    const done = (out: ModelOption[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.kill();
      } catch {
        /* gone */
      }
      resolve(out);
    };
    const timer = setTimeout(() => done([]), timeoutMs);
    timer.unref?.();
    child.once("error", () => done([]));
    child.once("close", () => done([]));

    let buf = "";
    let id = 0;
    const send = (method: string, params: unknown) => {
      id += 1;
      try {
        child.stdin?.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      } catch {
        done([]);
      }
      return id;
    };
    let initId = 0;
    let sessionId = 0;
    child.stdout?.on("data", (chunk) => {
      buf += String(chunk);
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        let msg: {
          id?: number;
          result?: { models?: { availableModels?: Array<{ modelId?: string; name?: string }> } };
        };
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (msg?.id === initId) {
          if (!msg.result) return done([]);
          sessionId = send("session/new", {
            cwd: home(),
            mcpServers: [],
          });
        } else if (sessionId && msg?.id === sessionId) {
          const list = Array.isArray(msg.result?.models?.availableModels)
            ? msg.result!.models!.availableModels!
            : [];
          done(
            list
              .filter((m) => typeof m?.modelId === "string" && m.modelId)
              .map((m) => ({
                id: m.modelId!,
                label: (typeof m.name === "string" && m.name.trim()) || m.modelId!,
              })),
          );
        }
      }
    });
    initId = send("initialize", {
      protocolVersion: 1,
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false } },
    });
  });
}

export async function discoverHermesModels(cli: string): Promise<ModelCatalog> {
  if (!hermesHasHostedConfig()) return EMPTY_CATALOG;
  const remote = await fetchHermesAcpModels(cli);
  return catalogFromOptions(remote);
}

// ── Qwen ───────────────────────────────────────────────────────────────────

/** Qwen has no reliable cloud catalog without local inject hosts — stay empty. */
export async function discoverQwenModels(cli: string): Promise<ModelCatalog> {
  return (await tryCliModelList(cli, [["models"], ["model", "list"], ["--list-models"]])) ?? EMPTY_CATALOG;
}

// ── Local HTTP ─────────────────────────────────────────────────────────────

export async function discoverOllamaModels(baseUrl: string): Promise<ModelCatalog | null> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`);
    if (!response.ok) return null;
    const body = (await response.json()) as { models?: Array<{ name?: string }> };
    const options: ModelOption[] = (body.models ?? [])
      .map((model) => model.name)
      .filter((name): name is string => Boolean(name))
      .map((id) => ({ id, label: id, custom: true, loaded: true }));
    return catalogFromOptions(options);
  } catch {
    return null;
  }
}

export async function discoverLmStudioModels(baseUrl: string): Promise<ModelCatalog | null> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/models`);
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: Array<{ id?: string }> };
    const options: ModelOption[] = (body.data ?? [])
      .map((model) => model.id)
      .filter((id): id is string => Boolean(id))
      .map((id) => ({ id, label: id, custom: true, loaded: true }));
    return catalogFromOptions(options);
  } catch {
    return null;
  }
}
