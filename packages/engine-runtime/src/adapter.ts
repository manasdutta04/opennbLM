import type { LLMProvider, LLMRequest, LLMResponse } from "@opennblm/llm-providers";
import type { ModelSelection } from "@opennblm/contracts";
import { runCli, whichCli } from "./cli.js";
import type { EngineDefinition } from "./fleet.js";
import type { EngineRegistry } from "./registry.js";

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Empty engine response");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Engine response was not JSON");
  }
}

function promptFromRequest(request: LLMRequest): string {
  return request.messages.map((message) => `${message.role.toUpperCase()}:\n${message.content}`).join("\n\n");
}

async function localChat(baseUrl: string, request: LLMRequest, ollama: boolean): Promise<string> {
  const url = ollama
    ? `${baseUrl.replace(/\/$/, "")}/api/chat`
    : `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = ollama
    ? { model: request.model, messages: request.messages, stream: false, format: request.responseSchema ? "json" : undefined }
    : {
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        response_format: request.responseSchema ? { type: "json_object" } : undefined,
      };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Local engine failed (${response.status})`);
  const json = (await response.json()) as {
    message?: { content?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.message?.content ?? json.choices?.[0]?.message?.content ?? "";
}

async function cliChat(def: EngineDefinition, model: string, prompt: string): Promise<string> {
  const cli = await whichCli(def.cliNames);
  if (!cli) throw new Error(`${def.displayName} CLI is not installed`);

  const attempts: Array<{ args: string[] }> = [];
  switch (def.driverKind) {
    case "claudeAgent":
      attempts.push({ args: ["-p", prompt, "--output-format", "text", "--model", model] });
      attempts.push({ args: ["-p", prompt, "--output-format", "text"] });
      break;
    case "codex":
      attempts.push({ args: ["exec", "--model", model, prompt] });
      attempts.push({ args: ["exec", prompt] });
      break;
    case "cursorAgent":
      attempts.push({ args: ["-p", prompt, "--model", model, "--force"] });
      attempts.push({ args: ["-p", prompt, "--force"] });
      break;
    case "opencodeGo":
      attempts.push({ args: ["run", prompt] });
      break;
    case "grokAgent":
      attempts.push({ args: ["ask", "-m", model, prompt] });
      attempts.push({ args: ["ask", prompt] });
      break;
    case "antigravityAgent":
      attempts.push({ args: ["-p", prompt, "-m", model] });
      attempts.push({ args: ["-p", prompt] });
      break;
    case "hermesAgent":
      attempts.push({ args: ["chat", prompt] });
      attempts.push({ args: ["-p", prompt] });
      break;
    case "kimiAgent":
      attempts.push({ args: ["-m", model, "-p", prompt] });
      attempts.push({ args: ["-p", prompt] });
      break;
    case "qwenAgent":
      attempts.push({ args: ["-m", model, "-p", prompt] });
      attempts.push({ args: ["-p", prompt] });
      break;
    default:
      attempts.push({ args: ["-p", prompt] });
  }

  let lastError = "CLI teaching call failed";
  for (const attempt of attempts) {
    const result = await runCli(cli, attempt.args, { timeout: 120_000 });
    const text = (result.stdout || result.stderr).trim();
    if (result.ok && text) return text;
    if (text) lastError = text.slice(0, 400);
  }
  throw new Error(lastError);
}

export function createEngineLLMProvider(registry: EngineRegistry, selection: ModelSelection): LLMProvider {
  const def = registry.getDefinition(selection.instanceId);
  if (!def) throw new Error(`Unknown engine: ${selection.instanceId}`);

  const provider: LLMProvider = {
    id: "custom",
    async chat(request: LLMRequest): Promise<LLMResponse> {
      const content = def.localBaseUrl
        ? await localChat(def.localBaseUrl, { ...request, model: selection.model || request.model }, def.driverKind === "ollama")
        : await cliChat(def, selection.model || request.model, promptFromRequest(request));
      return { content, model: selection.model || request.model };
    },
    async *stream(request: LLMRequest): AsyncIterable<string> {
      yield (await provider.chat(request)).content;
    },
    async structured<T>(request: LLMRequest): Promise<T> {
      const response = await provider.chat(request);
      return extractJson(response.content) as T;
    },
    async listModels(): Promise<string[]> {
      const instance = registry.getCachedInstance(selection.instanceId);
      return instance?.models.options.map((option) => option.id) ?? [selection.model];
    },
    async healthCheck(): Promise<void> {
      const instances = await registry.refresh();
      const instance = instances.find((item) => item.instanceId === selection.instanceId);
      if (!instance || instance.snapshot.state !== "available" || instance.snapshot.authenticated === false) {
        throw new Error(instance?.snapshot.reason ?? "Engine is not ready");
      }
    },
  };

  return provider;
}
