import type { EngineDriverKind, EngineInstall, EngineRail, ModelCatalog } from "@opennblm/contracts";

export interface EngineDefinition {
  instanceId: string;
  driverKind: EngineDriverKind;
  displayName: string;
  rail: EngineRail;
  cliNames: string[];
  install?: EngineInstall;
  models: ModelCatalog;
  localBaseUrl?: string;
  authArgs?: string[];
  /** When set, models are refreshed from CLI output (e.g. `opencode models`). */
  discoverModels?: "opencode";
}

export const ENGINE_FLEET: EngineDefinition[] = [
  {
    instanceId: "claude",
    driverKind: "claudeAgent",
    displayName: "Claude",
    rail: "cloud",
    cliNames: ["claude"],
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
    models: {
      default: "claude-sonnet-5",
      options: [
        { id: "claude-fable-5", label: "Claude Fable 5" },
        { id: "claude-opus-5", label: "Claude Opus 5" },
        { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
        { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
        { id: "claude-opus-4-5", label: "Claude Opus 4.5" },
        { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
      ],
    },
    authArgs: ["auth", "status", "--json"],
  },
  {
    instanceId: "codex",
    driverKind: "codex",
    displayName: "Codex",
    rail: "cloud",
    cliNames: ["codex"],
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
    models: {
      default: "gpt-5.3-codex",
      options: [
        { id: "gpt-5.3-codex", label: "GPT-5.3 Codex" },
        { id: "gpt-5.2-codex", label: "GPT-5.2 Codex" },
        { id: "gpt-5.1-codex-max", label: "GPT-5.1 Codex Max" },
        { id: "o3", label: "o3" },
        { id: "o4-mini", label: "o4-mini" },
        { id: "gpt-4.1", label: "GPT-4.1" },
      ],
    },
  },
  {
    instanceId: "cursor",
    driverKind: "cursorAgent",
    displayName: "Cursor",
    rail: "cloud",
    cliNames: ["cursor-agent", "agent"],
    install: {
      command: {
        darwin: "curl https://cursor.com/install -fsS | bash",
        linux: "curl https://cursor.com/install -fsS | bash",
        win32: "irm 'https://cursor.com/install?win32=true' | iex",
      },
      docsUrl: "https://cursor.com/docs/cli/installation",
      signInCommand: "cursor-agent login",
    },
    models: {
      default: "auto",
      options: [
        { id: "auto", label: "Auto" },
        { id: "composer-2.5", label: "Composer 2.5" },
        { id: "composer-2.5-fast", label: "Composer 2.5 Fast" },
        { id: "gpt-5.3-codex", label: "Codex 5.3" },
        { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
        { id: "claude-opus-4-5-thinking-high", label: "Claude Opus 4.5 Thinking" },
        { id: "gemini-3.1-pro", label: "Gemini 3.1 Pro" },
      ],
    },
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
    models: {
      default: "opencode/x-preview-f-free",
      options: [
        { id: "opencode/x-preview-f-free", label: "Zen · Ox Alpha Free" },
        { id: "anthropic/claude-sonnet-4-5", label: "Anthropic · Claude Sonnet 4.5" },
        { id: "anthropic/claude-opus-4-5", label: "Anthropic · Claude Opus 4.5" },
        { id: "openai/gpt-5", label: "OpenAI · GPT-5" },
        { id: "openai/gpt-5-mini", label: "OpenAI · GPT-5 Mini" },
        { id: "google/gemini-2.5-pro", label: "Google · Gemini 2.5 Pro" },
        { id: "google/gemini-2.5-flash", label: "Google · Gemini 2.5 Flash" },
        { id: "openrouter/auto", label: "OpenRouter · Auto" },
      ],
    },
  },
  {
    instanceId: "grok",
    driverKind: "grokAgent",
    displayName: "Grok",
    rail: "cloud",
    cliNames: ["grok"],
    install: {
      command: {
        darwin: "curl -fsSL https://x.ai/cli/install.sh | bash",
        linux: "curl -fsSL https://x.ai/cli/install.sh | bash",
      },
      docsUrl: "https://x.ai/cli",
      signInCommand: "grok login",
    },
    models: {
      default: "grok-4",
      options: [
        { id: "grok-4", label: "Grok 4" },
        { id: "grok-4-fast", label: "Grok 4 Fast" },
        { id: "grok-4.5", label: "Grok 4.5" },
        { id: "grok-3", label: "Grok 3" },
        { id: "grok-3-mini", label: "Grok 3 Mini" },
      ],
    },
  },
  {
    instanceId: "antigravity",
    driverKind: "antigravityAgent",
    displayName: "Antigravity",
    rail: "cloud",
    cliNames: ["agy", "antigravity"],
    install: {
      command: {
        darwin: "curl -fsSL https://antigravity.google/cli/install.sh | bash",
        linux: "curl -fsSL https://antigravity.google/cli/install.sh | bash",
        win32: "irm https://antigravity.google/cli/install.ps1 | iex",
      },
      docsUrl: "https://github.com/google-antigravity/antigravity-cli#installation",
      signInCommand: "agy auth login",
    },
    models: {
      default: "gemini-3.1-pro-high",
      options: [
        { id: "gemini-3.1-pro-high", label: "Gemini 3.1 Pro (High)" },
        { id: "gemini-3.1-pro-low", label: "Gemini 3.1 Pro (Low)" },
        { id: "gemini-3.7-flash-high", label: "Gemini 3.7 Flash (High)" },
        { id: "gemini-3.7-flash-medium", label: "Gemini 3.7 Flash (Medium)" },
        { id: "gemini-3.7-flash-low", label: "Gemini 3.7 Flash (Low)" },
        { id: "gemini-3.6-flash-high", label: "Gemini 3.6 Flash (High)" },
        { id: "gemini-3.6-flash-medium", label: "Gemini 3.6 Flash (Medium)" },
        { id: "gemini-3.6-flash-low", label: "Gemini 3.6 Flash (Low)" },
        { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Thinking)" },
        { id: "claude-opus-4-6-thinking", label: "Claude Opus 4.6 (Thinking)" },
        { id: "gpt-oss-120b-medium", label: "GPT-OSS 120B (Medium)" },
      ],
    },
  },
  {
    instanceId: "hermes",
    driverKind: "hermesAgent",
    displayName: "Hermes",
    rail: "cloud",
    cliNames: ["hermes"],
    install: {
      command: {
        darwin: "curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash",
        linux: "curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash",
        win32: "iex (irm https://hermes-agent.nousresearch.com/install.ps1)",
      },
      docsUrl: "https://hermes-agent.nousresearch.com/docs/getting-started/quickstart",
      signInCommand: "hermes setup",
    },
    models: {
      default: "hermes-default",
      options: [
        { id: "hermes-default", label: "Hermes default" },
        { id: "openrouter/auto", label: "OpenRouter · Auto", provider: "cloud" },
        { id: "ollama::llama3.2", label: "Ollama · llama3.2", custom: true },
        { id: "ollama::qwen2.5", label: "Ollama · qwen2.5", custom: true },
      ],
    },
  },
  {
    instanceId: "kimi",
    driverKind: "kimiAgent",
    displayName: "Kimi",
    rail: "cloud",
    cliNames: ["kimi"],
    install: {
      command: {
        darwin: "curl -fsSL https://code.kimi.com/kimi-code/install.sh | bash",
        linux: "curl -fsSL https://code.kimi.com/kimi-code/install.sh | bash",
        win32: "irm https://code.kimi.com/kimi-code/install.ps1 | iex",
      },
      docsUrl: "https://moonshotai.github.io/kimi-code/en/guides/getting-started.html",
      signInCommand: "kimi login",
    },
    models: {
      default: "kimi-code/k3",
      options: [
        { id: "kimi-code/k3", label: "Kimi K3" },
        { id: "kimi-code/k3-256k", label: "Kimi K3 256K" },
        { id: "kimi-code/kimi-for-coding", label: "Kimi for Coding" },
        { id: "kimi-code/kimi-for-coding-highspeed", label: "Kimi for Coding Highspeed" },
      ],
    },
  },
  {
    instanceId: "qwen",
    driverKind: "qwenAgent",
    displayName: "Qwen",
    rail: "cloud",
    cliNames: ["qwen"],
    install: {
      command: {
        darwin: "curl -fsSL https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen-standalone.sh | bash",
        linux: "curl -fsSL https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen-standalone.sh | bash",
        win32: "irm https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen-standalone.ps1 | iex",
      },
      docsUrl: "https://qwenlm.github.io/qwen-code-docs/en/users/overview/",
      signInCommand: "qwen",
    },
    models: {
      default: "qwen3-coder-plus",
      options: [
        { id: "qwen3-coder-plus", label: "Qwen3 Coder Plus" },
        { id: "qwen3-coder", label: "Qwen3 Coder" },
        { id: "qwen2.5-coder-32b", label: "Qwen2.5 Coder 32B" },
      ],
    },
  },
  {
    instanceId: "ollama",
    driverKind: "ollama",
    displayName: "Ollama",
    rail: "local",
    cliNames: ["ollama"],
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
    models: {
      default: "llama3.2",
      options: [
        { id: "llama3.2", label: "llama3.2" },
        { id: "qwen2.5", label: "qwen2.5" },
        { id: "mistral", label: "mistral" },
        { id: "gemma3", label: "gemma3" },
      ],
    },
  },
  {
    instanceId: "lmstudio",
    driverKind: "lmstudio",
    displayName: "LM Studio",
    rail: "local",
    cliNames: ["lms"],
    localBaseUrl: "http://127.0.0.1:1234/v1",
    install: {
      docsUrl: "https://lmstudio.ai",
      signInCommand: "Load a model in LM Studio, then start the local server",
    },
    models: {
      default: "local-model",
      options: [{ id: "local-model", label: "Loaded model" }],
    },
  },
];
