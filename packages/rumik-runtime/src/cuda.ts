import { spawnSync } from "node:child_process";

/** True when an NVIDIA CUDA device is visible to the host. */
export function detectCudaAvailable(pythonPath = "python"): boolean {
  if (process.env.RUMIK_FORCE_REMOTE === "1") return false;
  if (process.env.RUMIK_FORCE_LOCAL === "1") return true;

  // Fast path: nvidia-smi without loading torch.
  try {
    const probe = spawnSync("nvidia-smi", ["-L"], {
      stdio: "ignore",
      timeout: 4000,
      windowsHide: true,
    });
    if (probe.status === 0) return true;
  } catch {
    /* try python next */
  }

  try {
    const probe = spawnSync(
      pythonPath,
      ["-c", "import torch; raise SystemExit(0 if torch.cuda.is_available() else 1)"],
      { stdio: "ignore", timeout: 12_000, windowsHide: true },
    );
    return probe.status === 0;
  } catch {
    return false;
  }
}
