import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import type { AppUpdateStatus } from "@opennblm/contracts";
import { cn } from "../lib/cn";

export function AppUpdateCard({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<AppUpdateStatus | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void window.opennbLM.updates.getStatus().then((next) => {
      if (!cancelled) setStatus(next);
    });
    const stop = window.opennbLM.updates.onStateChange(setStatus);
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  if (!status) return null;
  if (compact && status.state !== "available" && status.state !== "ready" && status.state !== "downloading" && status.state !== "installing") {
    return null;
  }

  const actionLabel =
    status.state === "downloading" || status.state === "installing"
      ? status.state === "installing"
        ? "Installing…"
        : `Downloading ${status.percent ?? 0}%`
      : status.state === "available" || status.state === "ready"
        ? "Update"
        : "Check for update";

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (status.canInstall || status.state === "available" || status.state === "ready") {
        await window.opennbLM.updates.install();
      } else {
        await window.opennbLM.updates.check();
      }
    } finally {
      setBusy(false);
    }
  };

  const detail =
    status.state === "available" || status.state === "ready"
      ? `Version ${status.availableVersion} is available. Update installs it and restarts opennbLM.`
      : status.state === "downloading"
        ? "Downloading the Windows installer…"
        : status.state === "installing"
          ? "Installing. opennbLM will restart when it finishes."
          : status.state === "current"
            ? "This install is up to date."
            : status.state === "unavailable"
              ? status.error || "Updates are available in the packaged Windows app."
              : status.state === "error"
                ? status.error || "Could not reach GitHub Releases."
                : status.state === "checking"
                  ? "Checking GitHub Releases…"
                  : "Check GitHub Releases for a newer Windows build.";

  return (
    <div className={cn("rounded-2xl border px-4 py-3.5", compact ? "mb-6 border-hairline/35 bg-card" : "border-hairline/35 bg-inset/50")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13.5px] font-medium text-ink">App update</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
            You’re on v{status.currentVersion}. {detail}
          </p>
        </div>
        <button
          type="button"
          disabled={busy || status.state === "downloading" || status.state === "installing" || status.state === "unavailable"}
          onClick={() => void run()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-medium text-black hover:brightness-95 disabled:opacity-40"
        >
          {status.canInstall || status.state === "available" || status.state === "ready" ? <Download size={14} /> : <RefreshCw size={14} />}
          {actionLabel}
        </button>
      </div>
      {status.state === "downloading" ? (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-raised">
          <div className="h-full bg-white transition-[width]" style={{ width: `${status.percent ?? 0}%` }} />
        </div>
      ) : null}
    </div>
  );
}
