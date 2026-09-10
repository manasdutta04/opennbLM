import { execFile, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function whichCli(names: string[]): Promise<string | null> {
  for (const name of names) {
    try {
      if (process.platform === "win32") {
        const { stdout } = await execFileAsync("where.exe", [name], { timeout: 4000, windowsHide: true });
        const candidates = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        // Prefer native Windows launchers; the extensionless npm shim is often a
        // shell script that `execFile` cannot run.
        const preferred =
          candidates.find((path) => /\.(cmd|exe|bat)$/i.test(path)) ?? candidates[0];
        if (preferred) return preferred;
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

/** Resolve argv so Windows `.cmd` / `.bat` shims run via `cmd.exe /c` without `shell: true`. */
export function cliSpawnArgs(cli: string, args: string[]): { command: string; args: string[] } {
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(cli)) {
    return { command: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", cli, ...args] };
  }
  return { command: cli, args };
}

export function spawnCli(
  cli: string,
  args: string[],
  options?: Parameters<typeof spawn>[2],
): ChildProcessWithoutNullStreams {
  const resolved = cliSpawnArgs(cli, args);
  return spawn(resolved.command, resolved.args, {
    windowsHide: true,
    ...options,
  }) as ChildProcessWithoutNullStreams;
}

export async function runCli(
  cli: string,
  args: string[],
  options?: { timeout?: number },
): Promise<{ ok: boolean; stdout: string; stderr: string; code: number | null }> {
  try {
    const resolved = cliSpawnArgs(cli, args);
    const { stdout, stderr } = await execFileAsync(resolved.command, resolved.args, {
      timeout: options?.timeout ?? 12_000,
      maxBuffer: 16 * 1024 * 1024,
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
