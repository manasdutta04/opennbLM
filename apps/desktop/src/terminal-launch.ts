import { spawn, type SpawnOptions } from "node:child_process";

/** Resolve only after the launcher really spawns or reports an error. */
function launch(executable: string, args: string[], options?: SpawnOptions): Promise<boolean> {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(executable, args, { ...options, stdio: "ignore", detached: true });
    } catch {
      resolve(false);
      return;
    }

    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (ok) child.unref();
      resolve(ok);
    };
    child.once("spawn", () => finish(true));
    child.once("error", () => finish(false));
  });
}

/** Open a blank terminal. Installer text is deliberately not accepted here,
 * so renderer-controlled input can never become a process argument. */
export async function openBlankTerminal(platform: NodeJS.Platform = process.platform): Promise<boolean> {
  if (platform === "darwin") {
    return launch("osascript", ["-e", 'tell application "Terminal" to activate']);
  }
  if (platform === "win32") {
    return launch("powershell.exe", ["-NoExit"], { windowsHide: false });
  }
  if (platform === "linux") {
    for (const terminal of ["x-terminal-emulator", "gnome-terminal", "konsole", "xterm"]) {
      if (await launch(terminal, [])) return true;
    }
  }
  return false;
}
