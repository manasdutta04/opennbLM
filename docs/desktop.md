# Desktop Runtime

Electron main owns application lifecycle and creates the browser window with `contextIsolation: true`, `nodeIntegration: false`, and sandboxing enabled. Renderer communication uses the preload bridge only.

## Filesystem separation

- Application binaries: Electron's install directory / app bundle, treated as immutable.
- User data: Electron `app.getPath("userData")`, including SQLite, provider preferences, generated audio, and setup completion state.
- Logs: Electron `app.getPath("logs")`.
- Credentials: OS-backed Electron `safeStorage`, separate from SQLite and renderer state.
- Packaged resources: `process.resourcesPath`, with optional Rumik assets under `resources/rumik`.

The application never writes mutable databases into its installation directory or macOS bundle.

## First run

The main process exposes sanitized setup diagnostics through preload. It checks the bundled-or-development Rumik runtime, model presence/revision, basic audio availability, free memory, GPU feature status, platform, and architecture. The first-run sheet can complete setup even when Rumik is unavailable. Text lessons remain usable and show an actionable “Voice engine unavailable” diagnostic.

## Packaging

Packaging uses electron-builder with ASAR application files and a separate `resources/rumik` extra-resource boundary. The repository contains only a README for that boundary; Python environments, model weights, CUDA-linked components, and generated wheels must be supplied by a licensed release job and are ignored from Git.

Commands:

- `pnpm package:win` — build Windows x64 NSIS installer.
- `pnpm package:mac` — build macOS Apple Silicon DMG.
- `pnpm package:mac:intel` — optional macOS Intel DMG.
- `pnpm package:dir` — produce an unpacked directory for smoke testing.

The Windows installer is per-user by default, supports clean uninstall without deleting user data, and keeps application data outside the install directory. Local packaging disables executable signing/editing so it can be validated without certificates; production release builds must override this with the organization’s signing configuration. macOS uses a DMG target, hardened runtime, and the project entitlements file. Signing, notarization, and target-native installer execution must be completed in release environments with the appropriate certificates.
