# Desktop Runtime

Electron main owns application lifecycle and creates the browser window with `contextIsolation: true`, `nodeIntegration: false`, and sandboxing enabled. Renderer communication uses the preload bridge only.

The application uses Electron's `userData` path for future local data. Database access will remain in local services rather than the renderer.

Packaging is configured for a Windows x64 NSIS installer first, plus macOS DMG targets. Architectures are selected at build time with electron-builder (`--win --x64`, `--mac --arm64`, or `--mac --x64`). Native packaging has not yet been validated on target environments.
