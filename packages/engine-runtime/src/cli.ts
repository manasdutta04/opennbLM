import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function whichCli(names: string[]): Promise<string | null> {
  for (const name of names) {
    try {
      if (process.platform === "win32") {
        const { stdout } = await execFileAsync("where.exe", [name], { timeout: 4000, windowsHide: true });
        const first = stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
        if (first) return first;
      } else {
        const { stdout } = await execFileAsync("which", [name], { timeout: 4000 });
        const first = stdout.trim().split(/\n/)[0]?.trim();
        if (first) return first;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function runCli(
  cli: string,
  args: string[],
  options?: { timeout?: number },
): Promise<{ ok: boolean; stdout: string; stderr: string; code: number | null }> {
  try {
    const { stdout, stderr } = await execFileAsync(cli, args, {
      timeout: options?.timeout ?? 12_000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      env: process.env,
    });
    return { ok: true, stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), code: 0 };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; code?: number | null; message?: string };
    return {
      ok: false,
      stdout: String(err.stdout ?? ""),
      stderr: String(err.stderr ?? err.message ?? ""),
      code: typeof err.code === "number" ? err.code : null,
    };
  }
}
