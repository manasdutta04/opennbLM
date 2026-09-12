import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/cn";

export function HomeSetupBanner({
  brainReady,
  voiceReady,
  onOpenSettings,
  onCreateNotebook,
}: {
  brainReady: boolean;
  voiceReady: boolean;
  onOpenSettings: () => void;
  onCreateNotebook: () => void;
}) {
  // Required setup = teaching brain. Hide only after that finishes.
  if (brainReady) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-warning/35 bg-warning/5">
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <AlertCircle size={16} className="text-warning" />
            Setup incomplete — connect a teaching brain
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
            Follow Settings → Setup guide: connect a brain from any notebook’s model picker, then add sources. Voice is optional — choose Remote (HTTPS) or Local in Settings → Voice engine.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-[12px]">
            <Step ok={false} label="1 · Teaching brain (required)" />
            <Step ok={voiceReady} label="2 · Voice (optional)" />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onCreateNotebook}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[12.5px] font-medium text-black"
          >
            Create notebook <ArrowRight size={14} />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-full border border-hairline/40 px-3.5 py-2 text-[12.5px] text-ink hover:bg-raised"
          >
            Open setup guide
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1", ok ? "border-success/30 text-success" : "border-hairline/40 text-ink-secondary")}>
      {ok ? <CheckCircle2 size={13} /> : <span className="size-1.5 rounded-full bg-warning" />}
      {label}
    </span>
  );
}
