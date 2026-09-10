import { useState } from "react";
import { Check, Copy, Download, ExternalLink, LogIn, TerminalSquare } from "lucide-react";
import type { EngineInstall, InstanceInfo } from "@opennblm/contracts";
import { cn } from "../lib/cn";

type Platform = "darwin" | "win32" | "linux";

function hostPlatform(): Platform {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Mac")) return "darwin";
  if (userAgent.includes("Win")) return "win32";
  return "linux";
}

export function installCommandFor(install: EngineInstall | undefined): string | null {
  return install?.command?.[hostPlatform()] ?? null;
}

export function needsSignIn(instance: InstanceInfo | undefined): boolean {
  return instance?.snapshot.state === "available" && instance.snapshot.authenticated === false;
}

export function needsCli(instance: InstanceInfo | undefined): boolean {
  return instance?.snapshot.state !== "available";
}

function CommandRow({ command, actionLabel }: { command: string; actionLabel: string }) {
  const [status, setStatus] = useState<"copied" | "opened" | null>(null);

  const settle = (next: "copied" | "opened") => {
    setStatus(next);
    window.setTimeout(() => setStatus(null), 2200);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      settle("copied");
    } catch {
      // The command remains selectable if clipboard access is unavailable.
    }
  };

  const openTerminal = async () => {
    const opened = await window.opennbLM.engines.openInstallTerminal(command);
    settle(opened ? "opened" : "copied");
  };

  return (
    <div className="mt-3">
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-hairline/50 bg-app px-2.5 py-2">
        <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink-secondary" title={command}>
          {command}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label="Copy command"
          title="Copy command"
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] font-medium text-ink-secondary hover:bg-control hover:text-ink"
        >
          {status === "copied" ? <Check size={12} className="text-success" /> : <Copy size={12} />}
          {status === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => void openTerminal()}
        className="mt-2 flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-3 py-2 text-[12.5px] font-semibold text-white hover:brightness-110"
      >
        {status === "opened" ? <Check size={14} /> : <TerminalSquare size={14} />}
        {status === "opened" ? "Terminal opened" : actionLabel}
      </button>
      <p aria-live="polite" className="mt-1.5 text-center text-[11px] text-ink-secondary/70">
        {status === "opened" ? "Paste the command and press Enter." : "The command is copied when Terminal opens."}
      </p>
    </div>
  );
}

export function EngineSetup({
  instance,
  className,
}: {
  instance: InstanceInfo;
  className?: string;
}) {
  const install = instance.install;
  const signInOnly = needsSignIn(instance);
  const command = signInOnly ? install?.signInCommand : installCommandFor(install);
  const title = signInOnly ? `Sign in to ${instance.displayName}` : `Install ${instance.displayName}`;
  const description = signInOnly
    ? "Finish account sign-in in Terminal. Reopen this menu afterward and we’ll check again."
    : `Install the command-line app once. Models will appear here as soon as it’s ready${install?.signInCommand ? "; sign-in may follow" : ""}.`;

  if (!install) {
    return (
      <div className={cn("rounded-xl border border-hairline/40 bg-control/30 p-3", className)}>
        <div className="text-[13px] font-semibold text-ink">{instance.displayName} isn’t ready</div>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">
          {instance.snapshot.reason ?? "This engine is not available on this machine."}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-hairline/40 bg-control/30 p-3", className)}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-inset text-ink-secondary">
          {signInOnly ? <LogIn size={14} /> : <Download size={14} />}
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-ink">{title}</div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-secondary">{description}</p>
        </div>
      </div>
      {command ? (
        <CommandRow command={command} actionLabel={signInOnly ? "Open sign-in in Terminal" : "Open install in Terminal"} />
      ) : (
        <p className="mt-3 rounded-lg bg-inset px-2.5 py-2 text-[12px] leading-relaxed text-ink-secondary">
          There isn’t a one-line installer for this platform. Use the setup guide below.
        </p>
      )}
      {!signInOnly && install.needsNode && (
        <p className="mt-2 text-[11px] leading-relaxed text-ink-secondary/70">
          Requires Node.js and <code className="font-mono">npm</code>.
        </p>
      )}
      {install.docsUrl && (
        <a
          href={install.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:underline"
        >
          <ExternalLink size={12} /> View setup guide
        </a>
      )}
    </div>
  );
}
