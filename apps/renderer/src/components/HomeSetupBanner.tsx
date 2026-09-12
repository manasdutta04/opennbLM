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
  if (brainReady) return null;

  return (
    <div className="mb-8 grid gap-2 sm:grid-cols-3">
      <Widget
        ok
        title="Notebooks"
        detail="Local. Create one, then add sources."
        action="New notebook"
        onAction={onCreateNotebook}
      />
      <Widget
        ok={false}
        title="Teaching brain"
        detail="Required. Connect from the notebook model picker."
        action="Open a notebook"
        onAction={onCreateNotebook}
      />
      <Widget
        ok={voiceReady}
        title="Voice"
        detail={voiceReady ? "Ready for Audio Overview." : "Optional. Remote or Local in Settings."}
        action="Voice settings"
        onAction={onOpenSettings}
      />
    </div>
  );
}

function Widget({
  ok,
  title,
  detail,
  action,
  onAction,
}: {
  ok: boolean;
  title: string;
  detail: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl border border-hairline/35 bg-card px-4 py-3.5">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", ok ? "bg-success" : "bg-warning")} />
        <div className="text-[13px] font-medium text-ink [word-break:keep-all]">{title}</div>
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-secondary">{detail}</p>
      <button type="button" className="mt-3 text-[12.5px] text-ink-secondary hover:text-ink" onClick={onAction}>
        {action}
      </button>
    </div>
  );
}
