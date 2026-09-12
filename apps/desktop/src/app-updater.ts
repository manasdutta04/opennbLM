import { app, shell } from "electron";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import type { AppUpdateStatus } from "@opennblm/contracts";

const RELEASES_API = "https://api.github.com/repos/manasdutta04/opennbLM/releases/latest";

let pendingUrl: string | undefined;
let pendingFile: string | undefined;
const listeners = new Set<(status: AppUpdateStatus) => void>();

let status: AppUpdateStatus = {
  state: "idle",
  currentVersion: app.getVersion(),
  canInstall: false,
};

function parseVersion(value: string): [number, number, number] {
  const match = String(value).trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [0, 0, 0];
}

export function isNewerVersion(remote: string, current: string): boolean {
  const left = parseVersion(remote);
  const right = parseVersion(current);
  return (
    left[0] > right[0]
    || (left[0] === right[0] && left[1] > right[1])
    || (left[0] === right[0] && left[1] === right[1] && left[2] > right[2])
  );
}

function emit(next: Partial<AppUpdateStatus>): AppUpdateStatus {
  const state = next.state ?? status.state;
  status = {
    ...status,
    ...next,
    state,
    currentVersion: app.getVersion(),
    canInstall: state === "available" || state === "ready",
  };
  listeners.forEach((listener) => listener(status));
  return status;
}

export function getAppUpdateStatus(): AppUpdateStatus {
  return { ...status };
}

export function onAppUpdateStatus(listener: (next: AppUpdateStatus) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function fetchLatestInstaller(): Promise<{ version: string; url: string; name: string }> {
  const response = await fetch(RELEASES_API, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "opennbLM",
    },
  });
  if (!response.ok) throw new Error(`GitHub Releases returned ${response.status}. Try again in a minute.`);
  const body = (await response.json()) as {
    tag_name?: string;
    assets?: Array<{ name?: string; browser_download_url?: string }>;
  };
  const version = String(body.tag_name || "").replace(/^v/i, "");
  const asset = (body.assets || []).find((item) => /opennbLM-win-x64\.exe$/i.test(item.name || ""))
    || (body.assets || []).find((item) => /\.exe$/i.test(item.name || "") && !/uninstall/i.test(item.name || ""));
  if (!version || !asset?.browser_download_url) {
    throw new Error("The latest GitHub Release does not include a Windows installer.");
  }
  return { version, url: asset.browser_download_url, name: asset.name || "opennbLM-win-x64.exe" };
}

export async function checkForAppUpdate(): Promise<AppUpdateStatus> {
  try {
    emit({ state: "checking", error: undefined });
    const latest = await fetchLatestInstaller();
    pendingUrl = latest.url;
    if (isNewerVersion(latest.version, app.getVersion())) {
      return emit({ state: "available", availableVersion: latest.version, error: undefined });
    }
    pendingUrl = undefined;
    return emit({ state: "current", availableVersion: undefined, error: undefined });
  } catch (error) {
    return emit({
      state: "error",
      error: error instanceof Error ? error.message : "Could not check GitHub Releases.",
    });
  }
}

async function downloadInstaller(url: string): Promise<string> {
  const dest = join(app.getPath("temp"), "opennbLM-update.exe");
  const response = await fetch(url, { headers: { "User-Agent": "opennbLM" } });
  if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}).`);
  const total = Number(response.headers.get("content-length") || 0);
  let received = 0;
  const nodeStream = Readable.fromWeb(response.body as import("node:stream/web").ReadableStream);
  nodeStream.on("data", (chunk: Buffer) => {
    received += chunk.length;
    emit({
      state: "downloading",
      percent: total > 0 ? Math.min(99, Math.round((received / total) * 100)) : undefined,
    });
  });
  await pipeline(nodeStream, createWriteStream(dest));
  pendingFile = dest;
  emit({ state: "ready", percent: 100 });
  return dest;
}

function launchInstaller(file: string): void {
  const child = spawn(file, ["/S"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.once("error", () => {
    void shell.openPath(file);
  });
  child.unref();
}

export async function installAppUpdate(): Promise<void> {
  if (status.state !== "available" && status.state !== "ready") {
    await checkForAppUpdate();
  }
  if (status.state === "current") return;
  if (status.state !== "available" && status.state !== "ready") {
    throw new Error(status.error || "No update is ready to install.");
  }
  if (status.state === "available") {
    if (!pendingUrl) await checkForAppUpdate();
    if (!pendingUrl) throw new Error("No installer URL from GitHub Releases.");
    emit({ state: "downloading", percent: 0, error: undefined });
    await downloadInstaller(pendingUrl);
  }
  if (!pendingFile) throw new Error("The update finished downloading but the installer is missing.");
  emit({ state: "installing" });
  launchInstaller(pendingFile);
  app.quit();
}

export function startPackagedUpdateCheck(): void {
  void checkForAppUpdate();
}
