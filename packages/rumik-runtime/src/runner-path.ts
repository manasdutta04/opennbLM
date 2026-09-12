import { existsSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export function asUnpackedAsarPath(path: string): string {
  return path.replace(`${sep}app.asar${sep}`, `${sep}app.asar.unpacked${sep}`);
}

function isOutsideAsar(path: string): boolean {
  return !path.includes(`${sep}app.asar${sep}`);
}

/** Python cannot read files inside an Electron ASAR. Prefer an unpacked or extraResources copy. */
export function resolveRumikRunnerPath(explicit?: string): string | undefined {
  const fromModule = resolve(join(dirname(fileURLToPath(import.meta.url)), "../runtime/rumik_runner.py"));
  const resourcesPath = "resourcesPath" in process ? String(process.resourcesPath || "") : "";
  const fromResources = resourcesPath ? join(resourcesPath, "rumik", "rumik_runner.py") : "";
  const candidates = [explicit, fromResources, fromModule].filter((path): path is string => Boolean(path));

  for (const candidate of candidates) {
    for (const path of [asUnpackedAsarPath(candidate), candidate]) {
      if (existsSync(path) && isOutsideAsar(path)) return path;
    }
  }
  return candidates.find((path) => existsSync(path));
}
