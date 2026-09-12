import { useEffect, useState } from "react";
import { Cloud, HardDrive } from "lucide-react";
import type { SetupStatus } from "@opennblm/contracts";
import { cn } from "../lib/cn";

const STEPS = ["Welcome", "This PC", "Brain", "Voice", "Ready"] as const;

export function FirstRunSetup({
  brainReady,
  onCreateNotebook,
}: {
  brainReady: boolean;
  onCreateNotebook: () => void;
}) {
  const [status, setStatus] = useState<SetupStatus | undefined>();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    void window.opennbLM.setup.getStatus().then((next) => {
      setStatus(next);
      setOpen(next.firstRun);
    });
  }, []);

  if (!status || !open) return null;

  const preferred = status.rumik?.preferredMode ?? "remote";
  const cuda = Boolean(status.rumik?.cudaAvailable);
  const voiceOn = status.runtime.available && (status.rumik?.mode === "remote" || status.model.available);

  const finish = async (create: boolean) => {
    await window.opennbLM.setup.complete();
    setOpen(false);
    if (create) onCreateNotebook();
  };

  const setVoiceMode = async (mode: "local" | "remote") => {
    setSwitching(true);
    try {
      await window.opennbLM.rumik.setMode(mode);
      setStatus(await window.opennbLM.setup.getStatus());
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/55 p-5 backdrop-blur-[14px]">
      <div className="animate-pop-in flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-hairline/50 bg-panel shadow-2xl shadow-black/50">
        <div className="flex items-center gap-1.5 border-b border-hairline/30 px-6 py-3">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i <= step ? "bg-ink" : "bg-hairline/40",
              )}
              aria-label={label}
            />
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {step === 0 ? (
            <StepBody
              kicker="After install"
              title="Set up this copy of opennbLM"
              copy="Notebooks stay on this PC. Chat and Studio need a teaching brain you already use. Voice is optional."
            />
          ) : null}

          {step === 1 ? (
            <>
              <StepBody
                kicker="This PC"
                title="Local pieces are ready"
                copy="These checks run on your machine. Nothing here needs an account."
              />
              <div className="mt-5 space-y-2">
                <Widget ok title="Local storage" detail={`${status.system.freeMemoryMb.toLocaleString()} MB free · ${status.system.platform}`} />
                <Widget ok={status.audio.available} title="Audio output" detail={status.audio.detail} />
                <Widget
                  ok={cuda || status.rumik?.mode === "remote"}
                  title="Voice path"
                  detail={cuda ? "CUDA seen — Local voice is available." : "No CUDA — use Remote voice, or skip voice."}
                />
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <StepBody
                kicker="Required"
                title="Connect a teaching brain"
                copy="Open any notebook and use Connect brain. Install or sign in to Claude, Codex, Gemini, OpenCode, Ollama, or LM Studio, then pick a model. Settings does not take API keys."
              />
              <div className="mt-5">
                <Widget
                  ok={brainReady}
                  title="Teaching brain"
                  detail={brainReady ? "A model is connected." : "Not connected yet — you can finish setup and do this in the notebook."}
                />
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <StepBody
                kicker="Optional"
                title="Voice for Audio Overview"
                copy="Rumik reads Studio overviews only — not chat. Remote talks to the public Space over HTTPS. Local needs CUDA and weights on this PC."
              />
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={switching}
                  onClick={() => void setVoiceMode("remote")}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left disabled:opacity-60",
                    preferred === "remote" ? "border-hairline bg-raised" : "border-hairline/35 hover:border-hairline/55",
                  )}
                >
                  <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
                    <Cloud size={15} /> Remote
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-secondary">Works after install. No GPU.</p>
                </button>
                <button
                  type="button"
                  disabled={switching}
                  onClick={() => void setVoiceMode("local")}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left disabled:opacity-60",
                    preferred === "local" ? "border-hairline bg-raised" : "border-hairline/35 hover:border-hairline/55",
                  )}
                >
                  <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
                    <HardDrive size={15} /> Local
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-secondary">NVIDIA CUDA + rumik-oss-1 on this PC.</p>
                </button>
              </div>
              <div className="mt-3">
                <Widget ok={voiceOn} title="Voice engine" detail={voiceOn ? "Ready" : "You can skip this and add it later in Settings."} />
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <StepBody
              kicker="Ready"
              title="Create a notebook"
              copy="Add a PDF, link, or notes. Connect a brain if you have not yet. Then ask, or open Studio."
            />
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-hairline/30 px-6 py-4">
          {step === 0 ? (
            <button type="button" className="text-[13px] text-ink-secondary hover:text-ink" onClick={() => void finish(false)}>
              Skip for now
            </button>
          ) : (
            <button type="button" className="text-[13px] text-ink-secondary hover:text-ink" onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black"
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </button>
          ) : (
            <div className="flex gap-2">
              <button type="button" className="rounded-full px-3 py-2 text-[13px] text-ink-secondary hover:text-ink" onClick={() => void finish(false)}>
                Later
              </button>
              <button
                type="button"
                className="rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black"
                onClick={() => void finish(true)}
              >
                New notebook
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepBody({ kicker, title, copy }: { kicker: string; title: string; copy: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-ink-secondary">{kicker}</div>
      <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">{copy}</p>
    </div>
  );
}

function Widget({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-hairline/35 px-3 py-2.5">
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", ok ? "bg-success" : "bg-warning")} />
      <div className="min-w-0">
        <div className="text-[13px] text-ink">{title}</div>
        <div className="mt-0.5 text-[12px] leading-relaxed text-ink-secondary">{detail}</div>
      </div>
    </div>
  );
}
