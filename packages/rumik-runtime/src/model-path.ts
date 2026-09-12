import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Official weights: config plus at least one shard. An empty bind folder is not enough. */
export function directoryHasRumikWeights(dir: string | undefined): boolean {
  if (!dir || !existsSync(join(dir, "config.json"))) return false;
  try {
    return readdirSync(dir).some((name) => name.endsWith(".safetensors"));
  } catch {
    return false;
  }
}

function huggingfaceSnapshotDirs(): string[] {
  const hub = process.env.HUGGINGFACE_HUB_CACHE
    || join(homedir(), ".cache", "huggingface", "hub", "models--rumik-ai--rumik-oss-1", "snapshots");
  if (!existsSync(hub)) return [];
  try {
    return readdirSync(hub).map((name) => join(hub, name)).filter((dir) => directoryHasRumikWeights(dir));
  } catch {
    return [];
  }
}

/** Prefer an explicit/env path, then any candidate that already has weights. */
export function resolveRumikModelPath(candidates: Array<string | undefined>, envPath?: string): string | undefined {
  const ordered = [envPath, ...candidates, ...huggingfaceSnapshotDirs()].filter((dir): dir is string => Boolean(dir));
  for (const dir of ordered) {
    if (directoryHasRumikWeights(dir)) return dir;
  }
  return candidates.find((dir): dir is string => Boolean(dir));
}
