import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Moon,
  RefreshCw,
  Sun,
  Volume2,
  Sparkles,
  Cpu,
  Cloud,
  HardDrive,
} from "lucide-react";
import type { SetupStatus } from "@opennblm/contracts";
import { cn } from "../lib/cn";
import { AppUpdateCard } from "./AppUpdateCard";

type SettingsTab = "setup" | "brain" | "voice" | "appearance";

function portableBindPath(path: string, platform: string): string {
  if (!path) {
    return platform === "win32"
      ? "%APPDATA%\\opennbLM\\models\\rumik-oss-1"
      : "~/.config/opennbLM/models/rumik-oss-1";
  }
  return path
    .replace(/^[A-Za-z]:\\Users\\[^\\]+\\AppData\\Roaming/i, "%APPDATA%")
    .replace(/^[A-Za-z]:\\Users\\[^\\]+\\AppData\\Local/i, "%LOCALAPPDATA%")
    .replace(/^[A-Za-z]:\\Users\\[^\\]+/i, "%USERPROFILE%")
    .replace(/^\/Users\/[^/]+/, "~")
    .replace(/^\/home\/[^/]+/, "~");
}

export function SettingsPage({
  onBack,
  voiceReady,
  isDark,
  setIsDark,
  onVoiceStatusChange,
  brainReady,
  onOpenBrainPicker,
}: {
  onBack: () => void;
  voiceReady: boolean;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  onVoiceStatusChange: (ready: boolean) => void;
  brainReady: boolean;
  onOpenBrainPicker?: () => void;
}) {
  const [tab, setTab] = useState<SettingsTab>("setup");
  const [setup, setSetup] = useState<SetupStatus | undefined>();
  const [rumikError, setRumikError] = useState<string | undefined>();
  const [copied, setCopied] = useState<"path" | "command" | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [hfTokenDraft, setHfTokenDraft] = useState("");
  const [savingToken, setSavingToken] = useState(false);

  const bindPath = setup?.dataPaths.rumikModel ?? setup?.model.bindPath ?? "";
  const platform = setup?.system.platform ?? "win32";
  const displayBindPath = portableBindPath(bindPath, platform);
  const downloadCommand =
    platform === "win32"
      ? `pip install -U huggingface_hub && python -c "import os; from huggingface_hub import snapshot_download; snapshot_download(repo_id='rumik-ai/rumik-oss-1', revision='main', local_dir=os.path.expandvars(r'${displayBindPath.replace(/\\/g, "\\\\")}'))"`
      : `pip install -U huggingface_hub && python -c "import os; from huggingface_hub import snapshot_download; snapshot_download(repo_id='rumik-ai/rumik-oss-1', revision='main', local_dir=os.path.expanduser('${displayBindPath.replace(/\\/g, "/")}'))"`;

  const load = async () => {
    setRefreshing(true);
    try {
      const [nextSetup, rumikOk, rumikStatus] = await Promise.all([
        window.opennbLM.setup.getStatus(),
        window.opennbLM.rumik.healthCheck().catch(() => false),
        window.opennbLM.rumik.getStatus().catch(() => undefined),
      ]);
      setSetup(nextSetup);
      setRumikError(rumikStatus?.error);
      onVoiceStatusChange(Boolean(rumikOk || (nextSetup.runtime.available && nextSetup.model.available)));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const preferredVoice = setup?.rumik?.preferredMode ?? setup?.rumik?.mode ?? "remote";

  const setVoiceMode = async (mode: "local" | "remote") => {
    if (switchingMode) return;
    setSwitchingMode(true);
    try {
      await window.opennbLM.rumik.setMode(mode);
      await load();
    } catch (error) {
      setRumikError(error instanceof Error ? error.message : "Could not switch voice mode");
    } finally {
      setSwitchingMode(false);
    }
  };

  const saveHfToken = async (token?: string) => {
    if (savingToken) return;
    setSavingToken(true);
    try {
      await window.opennbLM.rumik.setHfToken(token);
      setHfTokenDraft("");
      await load();
    } catch (error) {
      setRumikError(error instanceof Error ? error.message : "Could not save Hugging Face token");
    } finally {
      setSavingToken(false);
    }
  };

  const copyText = async (kind: "path" | "command", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  };

  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "setup", label: "Setup guide" },
    { id: "brain", label: "Teaching brain" },
    { id: "voice", label: "Voice engine" },
    { id: "appearance", label: "Appearance" },
  ];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-[13px] text-ink-secondary hover:text-ink">
          <ArrowLeft size={15} /> Home
        </button>
        <div className="flex items-center gap-3">
          <img src="./icon.svg" alt="" width={40} height={40} className="size-10 rounded-full" draggable={false} />
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">Settings</h1>
            <p className="text-[13.5px] text-ink-secondary">
              Connect a teaching brain, optionally install Rumik voice, and tune appearance.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[12.5px] font-medium",
                tab === item.id ? "bg-white text-black" : "border border-hairline/40 text-ink-secondary hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-hairline/40 bg-card">
          {tab === "setup" ? (
            <div className="space-y-5 px-5 py-5 text-[13px] leading-relaxed text-ink-secondary">
              <AppUpdateCard />
              <div>
                <div className="text-[15px] font-semibold text-ink">Get productive in three steps</div>
                <p className="mt-1">
                  opennbLM is local-first. Notebooks live on your machine. You only need a teaching brain for grounded chat and Studio. Voice is optional.
                </p>
              </div>

              <ol className="space-y-4">
                <li className="rounded-xl border border-hairline/35 bg-inset/50 p-4">
                  <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                    <span className={cn("flex size-6 items-center justify-center rounded-full text-[12px]", brainReady ? "bg-success/20 text-success" : "bg-white text-black")}>
                      {brainReady ? <Check size={14} /> : "1"}
                    </span>
                    Connect a teaching brain (required)
                  </div>
                  <p className="mt-2">
                    Open any notebook → use the model picker (“Connect brain”) → install/sign in to Claude, Codex, Gemini, OpenCode, Ollama, or LM Studio → pick a model.
                  </p>
                  <button
                    type="button"
                    className="mt-3 rounded-full border border-hairline/40 px-3 py-1.5 text-[12.5px] text-ink hover:bg-raised"
                    onClick={() => {
                      setTab("brain");
                      onOpenBrainPicker?.();
                    }}
                  >
                    Open teaching brain help
                  </button>
                </li>
                <li className="rounded-xl border border-hairline/35 bg-inset/50 p-4">
                  <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                    <span className="flex size-6 items-center justify-center rounded-full bg-white text-[12px] text-black">2</span>
                    Create a notebook and add sources
                  </div>
                  <p className="mt-2">
                    From Home, create a notebook. Add PDFs, links, or pasted text. Select sources, then ask questions or generate Studio outputs (Audio Overview, Mind Map, Quiz, …).
                  </p>
                </li>
                <li className="rounded-xl border border-hairline/35 bg-inset/50 p-4">
                  <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                    <span className={cn("flex size-6 items-center justify-center rounded-full text-[12px]", voiceReady ? "bg-success/20 text-success" : "bg-white text-black")}>
                      {voiceReady ? <Check size={14} /> : "3"}
                    </span>
                    Optional: choose a voice engine
                  </div>
                  <p className="mt-2">
                    In Voice engine, pick remote (HTTPS public Space, no install) or local (NVIDIA CUDA + weights on this PC).
                  </p>
                  <button
                    type="button"
                    className="mt-3 rounded-full border border-hairline/40 px-3 py-1.5 text-[12.5px] text-ink hover:bg-raised"
                    onClick={() => setTab("voice")}
                  >
                    Open voice engine
                  </button>
                </li>
              </ol>

              <div className="rounded-xl border border-hairline/35 px-4 py-3 text-[12.5px]">
                <div className="font-medium text-ink">Status</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <StatusPill ok={brainReady} label="Teaching brain" detail={brainReady ? "Connected" : "Not connected"} />
                  <StatusPill ok={voiceReady} label="Voice" detail={voiceReady ? (setup?.rumik?.mode === "remote" ? "Remote ready" : "Local ready") : "Not connected"} />
                </div>
              </div>
            </div>
          ) : null}

          {tab === "brain" ? (
            <div className="space-y-4 px-5 py-5 text-[13px] leading-relaxed text-ink-secondary">
              <div className="flex items-start gap-3">
                <Sparkles size={18} className="mt-0.5 text-accent-text" />
                <div>
                  <div className="text-[15px] font-semibold text-ink">Teaching brain</div>
                  <p className="mt-1">
                    Engines are connected from the notebook/lesson model picker — not with API keys pasted into Settings. That keeps secrets in each CLI or local server.
                  </p>
                </div>
              </div>
              <ol className="list-decimal space-y-2 pl-5">
                <li>Open a notebook (or start a lesson).</li>
                <li>Click the model chip / <span className="text-ink">Connect brain</span>.</li>
                <li>Install the CLI if needed (Claude Code, Codex, Gemini CLI, OpenCode) or run Ollama / LM Studio locally.</li>
                <li>Sign in when the engine asks, then choose a model.</li>
                <li>Return here — the home setup banner disappears once a brain is ready.</li>
              </ol>
              <div className="rounded-xl border border-hairline/35 bg-inset/50 p-4">
                <div className="font-medium text-ink">Supported options</div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Cloud CLIs: Claude, Codex, Gemini, OpenCode</li>
                  <li>Local: Ollama, LM Studio (OpenAI-compatible)</li>
                </ul>
              </div>
              <StatusPill ok={brainReady} label="Current brain" detail={brainReady ? "Ready for chat & Studio" : "Connect from a notebook to continue"} />
            </div>
          ) : null}

          {tab === "voice" ? (
            <div className="px-5 py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Volume2 size={18} className="mt-0.5 text-accent-text" />
                  <div>
                    <div className="text-[15px] font-semibold text-ink">Voice engine (Rumik)</div>
                    <div className="text-[12.5px] text-ink-secondary">
                      Rumik-OSS-1 · {setup?.model.modelId ?? "rumik-ai/rumik-oss-1"} · rev {setup?.model.revision ?? "main"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void load()}
                    className="rounded-full border border-hairline/40 bg-raised p-2 text-ink-secondary hover:text-ink"
                    title="Recheck Rumik"
                  >
                    <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
                  </button>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11.5px]",
                      setup?.rumik?.mode === "remote" ? "border-accent/30 text-accent-text" : "border-hairline/40 text-ink-secondary",
                    )}
                  >
                    {setup?.rumik?.mode === "remote" ? "Remote" : "Local"}
                  </span>
                  <span className={cn("rounded-full border px-2.5 py-1 text-[11.5px]", voiceReady ? "border-success/30 text-success" : "border-warning/30 text-warning")}>
                    {voiceReady ? "Ready" : preferredVoice === "local" ? "Weights not found" : "Not connected"}
                  </span>
                </div>
              </div>

              {rumikError ? (
                <div className="mt-3 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-[12.5px] leading-relaxed text-warning">
                  {rumikError}
                </div>
              ) : null}

              <div className="mt-4">
                <div className="text-[13px] font-medium text-ink">How should voice connect?</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
                  Pick one. Remote uses the public rumik-ai Space over HTTPS. Local runs Rumik on this PC.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={switchingMode}
                    onClick={() => void setVoiceMode("remote")}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition-colors disabled:opacity-60",
                      preferredVoice === "remote"
                        ? "border-accent/40 bg-accent/10"
                        : "border-hairline/35 bg-inset/40 hover:bg-control/40",
                    )}
                  >
                    <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
                      <Cloud size={15} /> Remote (HTTPS)
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-ink-secondary">
                      Public Space. Works after the .exe install. No GPU or weights.
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={switchingMode}
                    onClick={() => void setVoiceMode("local")}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition-colors disabled:opacity-60",
                      preferredVoice === "local"
                        ? "border-accent/40 bg-accent/10"
                        : "border-hairline/35 bg-inset/40 hover:bg-control/40",
                    )}
                  >
                    <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
                      <HardDrive size={15} /> Local (this PC)
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-ink-secondary">
                      NVIDIA CUDA + rumik-oss-1 weights on this machine.
                    </p>
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-[12.5px] text-ink-secondary sm:grid-cols-2">
                <div className={cn("rounded-xl border px-3 py-2", setup?.rumik?.cudaAvailable ? "border-success/25 bg-success/5" : "border-hairline/35 bg-inset/40")}>
                  <div className="flex items-center gap-2 font-medium text-ink">
                    <Cpu size={14} /> CUDA
                  </div>
                  <div className="mt-1">{setup?.rumik?.cudaAvailable ? "Detected" : "Not available"}</div>
                  <div className="mt-1 text-[11.5px] opacity-90">
                    {setup?.rumik?.cudaAvailable
                      ? "Ready if you switch to local and bind weights."
                      : "Needed only for local voice. Remote does not use a GPU."}
                  </div>
                </div>
                <div className={cn("rounded-xl border px-3 py-2", setup?.runtime.available ? "border-success/25 bg-success/5" : "border-warning/25 bg-warning/5")}>
                  <div className="font-medium text-ink">{preferredVoice === "remote" ? "Hosted endpoint" : "Python runtime"}</div>
                  <div className="mt-1">{setup?.runtime.available ? "Ready" : "Missing"}</div>
                  {setup?.runtime.detail ? <div className="mt-1 text-[11.5px] opacity-90">{setup.runtime.detail}</div> : null}
                </div>
              </div>

              {preferredVoice === "remote" ? (
                <div className="mt-4 space-y-3 rounded-xl border border-accent/25 bg-accent/5 p-4 text-[12.5px] leading-relaxed text-ink-secondary">
                  <div className="text-[13px] font-medium text-ink">Remote is selected — no local install</div>
                  <p>
                    The .exe already talks to rumik’s public Hugging Face Space over HTTPS. You do not clone this repo, start a server, or download weights. Audio Overview just sends text and gets a WAV back.
                  </p>
                  {setup?.rumik?.remoteEndpoint ? (
                    <code className="block break-all rounded-lg border border-hairline/40 bg-raised px-2.5 py-2 text-[11.5px] text-ink">
                      {setup.rumik.remoteEndpoint}
                    </code>
                  ) : null}
                  <div>
                    <div className="text-[13px] font-medium text-ink">Hugging Face token (optional)</div>
                    <p className="mt-1">
                      Not required to start. Anonymous use works until the public Space hits its daily ZeroGPU quota. Paste your own token here only if that happens — it is stored on this PC, not in the installer.
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="password"
                        autoComplete="off"
                        spellCheck={false}
                        value={hfTokenDraft}
                        onChange={(event) => setHfTokenDraft(event.target.value)}
                        placeholder={setup?.rumik?.hasHfToken ? "Token saved on this PC — paste a new one to replace" : "hf_…"}
                        className="min-w-0 flex-1 rounded-lg border border-hairline/40 bg-raised px-2.5 py-2 text-[12.5px] text-ink outline-none focus:border-accent/50"
                      />
                      <button
                        type="button"
                        disabled={savingToken || !hfTokenDraft.trim()}
                        onClick={() => void saveHfToken(hfTokenDraft)}
                        className="rounded-full border border-hairline/40 bg-raised px-3 py-1.5 text-[12.5px] font-medium text-ink hover:bg-control/60 disabled:opacity-40"
                      >
                        {savingToken ? "Saving…" : "Save token"}
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full border px-2.5 py-1 text-[11.5px]", setup?.rumik?.hasHfToken ? "border-success/30 text-success" : "border-hairline/40")}>
                        {setup?.rumik?.hasHfToken ? "Using your token" : "Using anonymous quota"}
                      </span>
                      {setup?.rumik?.hasHfToken ? (
                        <button
                          type="button"
                          disabled={savingToken}
                          onClick={() => void saveHfToken("")}
                          className="text-[12px] text-ink-secondary underline-offset-2 hover:underline"
                        >
                          Remove token
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void window.opennbLM.shell?.openExternal?.("https://huggingface.co/settings/tokens")}
                        className="inline-flex items-center gap-1 text-[12px] text-accent-text hover:underline"
                      >
                        Get a token <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {preferredVoice === "local" ? (
              <div className="mt-4 space-y-3 rounded-xl border border-hairline/35 bg-inset/60 p-4 text-[12.5px] leading-relaxed text-ink-secondary">
                <div className="text-[13px] font-medium text-ink">Install local Rumik (Windows CUDA)</div>
                {setup?.model.available ? (
                  <p className="text-success">Weights found at the bind path. Refresh if the badge still says they are missing.</p>
                ) : (
                  <p>
                    The installed app looks in this bind path. A download from running the source build may live under
                    {" "}
                    <code className="rounded bg-raised px-1 py-0.5 text-[11.5px] text-ink">%APPDATA%\@opennblm\desktop\models</code>
                    — newer builds also find that folder automatically.
                  </p>
                )}
                <ol className="list-decimal space-y-2 pl-4">
                  <li>
                    Install <span className="text-ink">NVIDIA drivers + CUDA-capable Python 3</span> with
                    {" "}
                    <code className="rounded bg-raised px-1 py-0.5 text-[11.5px] text-ink">torch</code>,
                    {" "}
                    <code className="rounded bg-raised px-1 py-0.5 text-[11.5px] text-ink">transformers</code>,
                    {" "}
                    <code className="rounded bg-raised px-1 py-0.5 text-[11.5px] text-ink">soundfile</code>,
                    {" "}
                    <code className="rounded bg-raised px-1 py-0.5 text-[11.5px] text-ink">accelerate</code>,
                    {" "}
                    <code className="rounded bg-raised px-1 py-0.5 text-[11.5px] text-ink">bitsandbytes</code>
                    .
                  </li>
                  <li>Copy the bind path below, then run the download command (or open a terminal from the button).</li>
                  <li>Press refresh here (or restart opennbLM). Mode should show <span className="text-ink">Local</span> + Ready.</li>
                </ol>

                <div>
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-secondary">Bind path</div>
                  <div className="flex items-start gap-2">
                    <code className="min-w-0 flex-1 break-all rounded-lg border border-hairline/40 bg-raised px-2.5 py-2 text-[11.5px] text-ink">
                      {displayBindPath}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copyText("path", displayBindPath)}
                      className="shrink-0 rounded-lg border border-hairline/40 bg-raised px-2.5 py-2 text-ink hover:bg-control/60"
                    >
                      {copied === "path" ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-ink-secondary/80">
                    {platform === "win32"
                      ? "%APPDATA% is your Windows user folder. It is different on every PC, so this path never includes a computer or account name."
                      : "~ is your home folder. It is different on every computer."}
                  </p>
                </div>

                <div>
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-secondary">Download command</div>
                  <div className="flex items-start gap-2">
                    <code className="min-w-0 flex-1 whitespace-pre-wrap break-all rounded-lg border border-hairline/40 bg-raised px-2.5 py-2 text-[11.5px] text-ink">
                      {downloadCommand}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copyText("command", downloadCommand)}
                      className="shrink-0 rounded-lg border border-hairline/40 bg-raised px-2.5 py-2 text-ink hover:bg-control/60"
                    >
                      {copied === "command" ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void window.opennbLM.engines.openInstallTerminal(downloadCommand)}
                    className="rounded-full border border-hairline/40 bg-raised px-3 py-1.5 text-[12.5px] font-medium text-ink hover:bg-control/60"
                  >
                    Copy command + open terminal
                  </button>
                  <button
                    type="button"
                    onClick={() => void window.opennbLM.shell?.openExternal?.("https://huggingface.co/rumik-ai/rumik-oss-1")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline/40 bg-raised px-3 py-1.5 text-[12.5px] font-medium text-accent-text hover:bg-control/60"
                  >
                    Model card <ExternalLink size={12} />
                  </button>
                </div>
                <p className="text-[11.5px] text-ink-secondary/80">
                  License: CC BY-NC 4.0 (research / non-commercial). Optional env:
                  {" "}
                  <code className="rounded bg-raised px-1 text-[11px] text-ink">RUMIK_MODEL_PATH</code>,
                  {" "}
                  <code className="rounded bg-raised px-1 text-[11px] text-ink">RUMIK_PYTHON</code>,
                  {" "}
                  <code className="rounded bg-raised px-1 text-[11px] text-ink">RUMIK_LOW_VRAM</code>.
                </p>
              </div>
              ) : null}
            </div>
          ) : null}

          {tab === "appearance" ? (
            <div className="space-y-4 px-5 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[15px] font-semibold text-ink">Appearance</div>
                  <div className="text-[12.5px] text-ink-secondary">Dark Graphite or light surfaces</div>
                </div>
                <button onClick={() => setIsDark(!isDark)} className="flex items-center gap-2 rounded-full border border-hairline/40 bg-raised px-3 py-2 text-[13px] text-ink">
                  {isDark ? <Moon size={15} /> : <Sun size={15} />}
                  {isDark ? "Dark" : "Light"}
                </button>
              </div>
              <div className="rounded-xl border border-hairline/35 px-4 py-3 text-[12.5px] leading-relaxed text-ink-secondary">
                <div className="text-[14px] font-medium text-ink">Privacy</div>
                <p className="mt-1.5">
                  Notebooks, sources, notes, chats, and learner memory stay in this app’s local data folder. Cloud is used only when you choose a cloud teaching brain or Remote (HTTPS) voice.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className={cn("rounded-xl border px-3 py-2", ok ? "border-success/25 bg-success/5" : "border-hairline/35 bg-inset/40")}>
      <div className="text-[12.5px] font-medium text-ink">{label}</div>
      <div className="mt-0.5 text-[12px] text-ink-secondary">{detail}</div>
    </div>
  );
}
