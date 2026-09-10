import { BrowserWindow, Menu, type MenuItemConstructorOptions } from "electron";

const MENUS: Record<string, MenuItemConstructorOptions[]> = {
  File: [
    { role: "close", label: "Close Window" },
    { type: "separator" },
    { role: "quit" },
  ],
  Edit: [
    { role: "undo" },
    { role: "redo" },
    { type: "separator" },
    { role: "cut" },
    { role: "copy" },
    { role: "paste" },
    { role: "selectAll" },
  ],
  View: [
    { role: "reload" },
    { role: "forceReload" },
    { type: "separator" },
    { role: "resetZoom" },
    { role: "zoomIn" },
    { role: "zoomOut" },
    { type: "separator" },
    { role: "togglefullscreen" },
  ],
  Window: [
    { role: "minimize" },
    { role: "zoom" },
    ...(process.platform === "darwin" ? [{ type: "separator" as const }, { role: "front" as const }] : []),
  ],
  Help: [
    {
      label: "About opennbLM",
      click: () => {
        /* noop — product about lives in Settings */
      },
    },
  ],
};

export function installAppMenu(): void {
  if (process.platform === "darwin") {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { role: "appMenu" },
        { label: "File", submenu: MENUS.File },
        { label: "Edit", submenu: MENUS.Edit },
        { label: "View", submenu: MENUS.View },
        { label: "Window", role: "windowMenu" },
        { label: "Help", submenu: MENUS.Help },
      ]),
    );
    return;
  }
  // Windows/Linux: keep accelerators available but hide the native bar — the
  // renderer title strip hosts the Mac-style menus via popupMenu.
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { label: "File", submenu: MENUS.File },
      { label: "Edit", submenu: MENUS.Edit },
      { label: "View", submenu: MENUS.View },
      { label: "Window", submenu: MENUS.Window },
      { label: "Help", submenu: MENUS.Help },
    ]),
  );
}

export function popupApplicationSubmenu(win: BrowserWindow | undefined, label: string, x: number, y: number): void {
  const items = MENUS[label];
  if (!items || !win) return;
  const menu = Menu.buildFromTemplate(items);
  menu.popup({ window: win, x, y });
}
