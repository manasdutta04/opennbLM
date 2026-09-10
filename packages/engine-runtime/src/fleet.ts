import type { EngineDriverKind, EngineInstall, EngineRail, ModelCatalog } from "@opennblm/contracts";
import { EMPTY_CATALOG } from "./discover.js";

export type DiscoverKind =
  | "claude"
  | "codex"
  | "cursor"
  | "opencode"
  | "grok"
  | "antigravity"
  | "hermes"
  | "kimi"
  | "qwen"
  | "ollama"
  | "lmstudio";

export interface EngineDefinition {
  instanceId: string;
  driverKind: EngineDriverKind;
  displayName: string;
  rail: EngineRail;
  cliNames: string[];
  install?: EngineInstall;
  /** Seed only — live discovery replaces this; never shown as a fake catalog. */
  models: ModelCatalog;
  localBaseUrl?: string;
  discoverModels: DiscoverKind;
}

export const ENGINE_FLEET: EngineDefinition[] = [
  {
    instanceId: "claude",
    driverKind: "claudeAgent",
    displayName: "Claude",
    rail: "cloud",
    cliNames: ["claude"],
    discoverModels: "claude",
    install: {
      command: {
        darwin: "npm install -g @anthropic-ai/claude-code",
        linux: "npm install -g @anthropic-ai/claude-code",
        win32: "npm install -g @anthropic-ai/claude-code",
      },
      needsNode: true,
      docsUrl: "https://claude.com/claude-code",
      signInCommand: "claude",
    },
    models: EMPTY_CATALOG,
  },
  {
    instanceId: "codex",
    driverKind: "codex",
    displayName: "Codex",
    rail: "cloud",
    cliNames: ["codex"],
    discoverModels: "codex",
    install: {
      command: {
        darwin: "npm install -g @openai/codex",
        linux: "npm install -g @openai/codex",
        win32: "npm install -g @openai/codex",
      },
      needsNode: true,
      docsUrl: "https://github.com/openai/codex",
      signInCommand: "codex login",
    },
    models: EMPTY_CATALOG,
  },
  {
    instanceId: "cursor",
    driverKind: "cursorAgent",
    displayName: "Cursor",
    rail: "cloud",
    cliNames: ["cursor-agent", "agent"],
    discoverModels: "cursor",
    install: {
      command: {
        darwin: "curl https://cursor.com/install -fsS | bash",
        linux: "curl https://cursor.com/install -fsS | bash",
        win32: "irm 'https://cursor.com/install?win32=true' | iex",
      },
      docsUrl: "https://cursor.com/docs/cli/installation",
      signInCommand: "cursor-agent login",
    },
    models: EMPTY_CATALOG,
  },
  {
    instanceId: "opencode",
    driverKind: "opencodeGo",
    displayName: "OpenCode",
    rail: "cloud",
    cliNames: ["opencode"],
    discoverModels: "opencode",
    install: {
      command: {
        darwin: "npm install -g opencode-ai",
        linux: "npm install -g opencode-ai",
        win32: "npm install -g opencode-ai",
      },
      needsNode: true,
      docsUrl: "https://opencode.ai/docs/",
      signInCommand: "opencode auth login",
    },
    models: EMPTY_CATALOG,
  },
  {
    instanceId: "grok",
    driverKind: "grokAgent",
    displayName: "Grok",
    rail: "cloud",
    cliNames: ["grok"],
    discoverModels: "grok",
    install: {
      command: {
        darwin: "curl -fsSL https://x.ai/cli/install.sh | bash",
        linux: "curl -fsSL https://x.ai/cli/install.sh | bash",
      },
      docsUrl: "https://x.ai/cli",
      signInCommand: "grok login",
    },
    models: EMPTY_CATALOG,
  },
  {
    instanceId: "antigravity",
    driverKind: "antigravityAgent",
    displayName: "Antigravity",
    rail: "cloud",
    cliNames: ["agy", "antigravity"],
    discoverModels: "antigravity",
    install: {
      command: {
        darwin: "curl -fsSL https://antigravity.google/cli/install.sh | bash",
        linux: "curl -fsSL https://antigravity.google/cli/install.sh | bash",
        win32: "irm https://antigravity.google/cli/install.ps1 | iex",
      },
      docsUrl: "https://github.com/google-antigravity/antigravity-cli#installation",
      signInCommand: "agy auth login",
    },
    models: EMPTY_CATALOG,
  },
  {
    instanceId: "hermes",
    driverKind: "hermesAgent",
    displayName: "Hermes",
    rail: "cloud",
    cliNames: ["hermes"],
    discoverModels: "hermes",
    install: {
      command: {
        darwin: "curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash",
        linux: "curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash",
        win32: "iex (irm https://hermes-agent.nousresearch.com/install.ps1)",
      },
      docsUrl: "https://hermes-agent.nousresearch.com/docs/getting-started/quickstart",
      signInCommand: "hermes setup",
    },
    models: EMPTY_CATALOG,
  },
  {
    instanceId: "kimi",
    driverKind: "kimiAgent",
    displayName: "Kimi",
    rail: "cloud",
    cliNames: ["kimi"],
    discoverModels: "kimi",
    install: {
      command: {
        darwin: "curl -fsSL https://code.kimi.com/kimi-code/install.sh | bash",
        linux: "curl -fsSL https://code.kimi.com/kimi-code/install.sh | bash",
        win32: "irm https://code.kimi.com/kimi-code/install.ps1 | iex",
      },
      docsUrl: "https://moonshotai.github.io/kimi-code/en/guides/getting-started.html",
      signInCommand: "kimi login",
    },
    models: EMPTY_CATALOG,
  },
  {
    instanceId: "qwen",
    driverKind: "qwenAgent",
    displayName: "Qwen",
    rail: "cloud",
    cliNames: ["qwen"],
    discoverModels: "qwen",
    install: {
      command: {
        darwin: "curl -fsSL https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen-standalone.sh | bash",
        linux: "curl -fsSL https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen-standalone.sh | bash",
        win32: "irm https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen-standalone.ps1 | iex",
      },
      docsUrl: "https://qwenlm.github.io/qwen-code-docs/en/users/overview/",
      signInCommand: "qwen",
    },
    models: EMPTY_CATALOG,
  },
  {
    instanceId: "ollama",
    driverKind: "ollama",
    displayName: "Ollama",
    rail: "local",
    cliNames: ["ollama"],
    discoverModels: "ollama",
    localBaseUrl: "http://127.0.0.1:11434",
    install: {
      command: {
        darwin: "brew install ollama && ollama serve",
        linux: "curl -fsSL https://ollama.com/install.sh | sh && ollama serve",
        win32: "Install Ollama from https://ollama.com/download and open the app",
      },
      docsUrl: "https://ollama.com",
      signInCommand: "ollama pull llama3.2",
    },
    models: EMPTY_CATALOG,
  },
  {
    instanceId: "lmstudio",
    driverKind: "lmstudio",
    displayName: "LM Studio",
    rail: "local",
    cliNames: ["lms"],
    discoverModels: "lmstudio",
    localBaseUrl: "http://127.0.0.1:1234/v1",
    install: {
      docsUrl: "https://lmstudio.ai",
      signInCommand: "Load a model in LM Studio, then start the local server",
    },
    models: EMPTY_CATALOG,
  },
];
