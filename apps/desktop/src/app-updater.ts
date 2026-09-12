import { app } from "electron";
import { createRequire } from "node:module";
import type { AppUpdateStatus } from "@opennblm/contracts";

const require = createRequire(import.meta.url);

type Updater = {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  allowPrerelease: boolean;
  checkForUpdates(): Promise<{ updateInfo?: { version?: string } }>;
  downloadUpdate(): Promise<unknown>;
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
  on(event: string, listener: (...args: never[]) => void): void;
};

function loadUpdater(): Updater | undefined {
  try {
    const loaded = require("electron-updater") as { autoUpdater: Updater };
    return loaded.autoUpdater;
  } catch {
    return undefined;
  }
}

const updater = loadUpdater();
const listeners = new Set<(status: AppUpdateStatus) => void>();

let status: AppUpdateStatus = {
  state: app.isPackaged ? "idle" : "unavailable",
  currentVersion: app.getVersion(),
  canInstall: false,
};

function emit(next: Partial<AppUpdateStatus>): AppUpdateStatus {
  const state = next.state ?? status.state;
  status = {
    ...status,
    ...next,
    state,
    currentVersion: app.getVersion(),
    canInstall: app.isPackaged && (state === "available" || state === "ready"),
  };
  listeners.forEach((listener) => listener(status));
  return status;
}

function wireUpdater(): void {
  if (!updater || !app.isPackaged) return;
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.allowPrerelease = false;
  updater.on("checking-for-update", () => {
    emit({ state: "checking", error: undefined });
  });
  updater.on("update-available", ((info: { version?: string }) => {
    emit({ state: "available", availableVersion: info?.version, error: undefined });
  }) as never);
  updater.on("update-not-available", () => {
    emit({ state: "current", error: undefined, availableVersion: undefined });
  });
  updater.on("download-progress", ((progress: { percent?: number }) => {
    emit({ state: "downloading", percent: Math.round(progress?.percent ?? 0) });
  }) as never);
  updater.on("update-downloaded", ((info: { version?: string }) => {
    emit({ state: "ready", availableVersion: info?.version, percent: 100, error: undefined });
  }) as never);
  updater.on("error", ((error: Error) => {
    emit({
      state: "error",
      error: error?.message?.trim() || "Could not check for an update.",
    });
  }) as never);
}

wireUpdater();

export function getAppUpdateStatus(): AppUpdateStatus {
  return { ...status };
}

export function onAppUpdateStatus(listener: (next: AppUpdateStatus) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function checkForAppUpdate(): Promise<AppUpdateStatus> {
  if (!app.isPackaged || !updater) {
    return emit({
      state: "unavailable",
      error: "Updates install from the Windows .exe, not from a source checkout.",
    });
  }
  try {
    emit({ state: "checking", error: undefined });
    const result = await updater.checkForUpdates();
    const version = result?.updateInfo?.version;
    if (version && version !== app.getVersion()) {
      return emit({ state: "available", availableVersion: version, error: undefined });
    }
    if (status.state === "checking") {
      return emit({ state: "current", availableVersion: undefined });
    }
    return getAppUpdateStatus();
  } catch (error) {
    return emit({
      state: "error",
      error: error instanceof Error ? error.message : "Could not check for an update.",
    });
  }
}

export async function installAppUpdate(): Promise<void> {
  if (!app.isPackaged || !updater) {
    emit({
      state: "unavailable",
      error: "Updates install from the Windows .exe, not from a source checkout.",
    });
    return;
  }
  if (status.state !== "available" && status.state !== "ready") {
    await checkForAppUpdate();
  }
  if (status.state === "current") return;
  if (status.state !== "available" && status.state !== "ready") {
    throw new Error(status.error || "No update is ready to install.");
  }
  if (status.state === "available") {
    emit({ state: "downloading", percent: 0, error: undefined });
    await updater.downloadUpdate();
  }
  emit({ state: "installing" });
  updater.quitAndInstall(true, true);
}

export function startPackagedUpdateCheck(): void {
  if (!app.isPackaged) return;
  void checkForAppUpdate();
}
