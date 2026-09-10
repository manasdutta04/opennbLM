import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "../lib/cn";

export function OverflowMenu({
  items,
  align = "right",
  className,
  triggerClassName,
}: {
  items: Array<{ label: string; danger?: boolean; onClick: () => void }>;
  align?: "left" | "right";
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={cn(
          "flex size-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-raised hover:text-ink",
          triggerClassName,
        )}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-40 mt-1 min-w-[168px] overflow-hidden rounded-xl border border-hairline/50 bg-panel py-1 shadow-2xl shadow-black/40 animate-pop-in",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={cn(
                "flex w-full px-3 py-2 text-left text-[13px] hover:bg-raised",
                item.danger ? "text-danger" : "text-ink",
              )}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function OverflowMenuPortalLabel({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
