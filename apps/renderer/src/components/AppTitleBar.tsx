import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { cn } from "../lib/cn";

const MENUS = ["File", "Edit", "View", "Window", "Help"] as const;

/**
 * Windows title strip: brand + menus on one row with the caption buttons.
 * Uses Electron titlebar-area env() so min/max/close stay clear. macOS uses
 * the system menu bar instead.
 */
export function AppTitleBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    void window.opennbLM.shell?.getPlatform().then((platform) => {
      setShow(platform === "win32");
    });
  }, []);

  if (!show) return null;

  const openMenu = (label: string, event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    void window.opennbLM.shell?.popupMenu?.(label, Math.round(rect.left), Math.round(rect.bottom));
  };

  return (
    <div
      className="flex shrink-0 items-center gap-3 border-b border-hairline/30 bg-app text-ink"
      style={
        {
          WebkitAppRegion: "drag",
          height: "env(titlebar-area-height, 36px)",
          marginLeft: "env(titlebar-area-x, 0px)",
          width: "env(titlebar-area-width, 100%)",
          paddingLeft: 12,
          paddingRight: 8,
        } as React.CSSProperties
      }
    >
      <div className="flex shrink-0 items-center gap-2">
        <img src="./icon.svg" alt="" width={18} height={18} className="shrink-0 rounded-full" draggable={false} />
        <span className="shrink-0 text-[13.5px] font-semibold tracking-[0.02em] text-ink">opennbLM</span>
      </div>
      <nav
        className="flex min-w-0 items-center gap-0.5"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        aria-label="Application"
      >
        {MENUS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={(event) => openMenu(label, event)}
            className={cn("rounded-md px-2 py-1 text-[12.5px] text-ink-secondary hover:bg-raised/80 hover:text-ink")}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
