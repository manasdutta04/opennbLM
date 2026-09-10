export const WIN_TITLEBAR_HEIGHT = 36;

/** Platform-native inset chrome so the renderer can host a Mac-style menu strip. */
export function windowChromeOptions(platform: NodeJS.Platform = process.platform) {
  if (platform === "darwin") {
    return {
      titleBarStyle: "hiddenInset" as const,
      trafficLightPosition: { x: 16, y: 16 },
    };
  }
  if (platform === "win32") {
    return {
      titleBarStyle: "hidden" as const,
      titleBarOverlay: {
        color: "#0f0f10",
        symbolColor: "#ececf1",
        height: WIN_TITLEBAR_HEIGHT,
      },
    };
  }
  return {};
}
