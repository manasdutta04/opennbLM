import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import type { InstanceInfo, ModelOption, ModelSelection } from "@opennblm/contracts";
import { cn } from "../lib/cn";
import { EngineSetup, needsCli, needsSignIn } from "./EngineSetup";
import { ProviderMark } from "./ProviderIcons";

const COMPACT_MODEL_COUNT = 5;

function modelLabel(instance: InstanceInfo | undefined, model: string): string {
  return instance?.models.options.find((option) => option.id === model)?.label ?? model;
}

function engineStatus(instance: InstanceInfo): string {
  if (needsCli(instance)) return "Not installed";
  if (needsSignIn(instance)) return "Sign-in required";
  return instance.snapshot.version ?? "Ready";
}

function suggestedModels(instance: InstanceInfo, current?: string): ModelOption[] {
  const wanted = new Set([
    ...instance.models.options.slice(0, COMPACT_MODEL_COUNT).map((option) => option.id),
    current,
    instance.models.default,
  ]);
  return instance.models.options.filter((option) => wanted.has(option.id));
}

export function ModelPicker({
  instances,
  selection,
  onSelect,
  onRefresh,
  className,
}: {
  instances: InstanceInfo[];
  selection: ModelSelection | null;
  onSelect: (selection: ModelSelection) => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [railId, setRailId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const active = instances.find((instance) => instance.instanceId === selection?.instanceId);
  const activeReady = Boolean(active && selection?.model && !needsCli(active) && !needsSignIn(active));
  const railInstance =
    instances.find((instance) => instance.instanceId === (railId ?? selection?.instanceId)) ?? instances[0];
  const blocked = railInstance ? needsCli(railInstance) || needsSignIn(railInstance) : false;
  const currentModel = selection?.instanceId === railInstance?.instanceId ? selection.model : undefined;
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = railInstance?.models.options.filter(
    (option) =>
      option.label.toLowerCase().includes(normalizedQuery) ||
      option.id.toLowerCase().includes(normalizedQuery) ||
      option.provider?.toLowerCase().includes(normalizedQuery),
  ) ?? [];
  const compact = railInstance ? suggestedModels(railInstance, currentModel) : [];
  const shown = normalizedQuery ? filtered : showAll ? railInstance?.models.options ?? [] : compact;

  useEffect(() => {
    if (open) void onRefresh();
  }, [open, onRefresh]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (query) setQuery("");
      else setOpen(false);
    };
    window.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, query]);

  const resetList = () => {
    setQuery("");
    setShowAll(false);
  };

  const railButton = (instance: InstanceInfo) => {
    const selected = instance.instanceId === railInstance?.instanceId;
    const attention = needsCli(instance) || needsSignIn(instance);
    return (
      <button
        type="button"
        key={instance.instanceId}
        onClick={() => {
          setRailId(instance.instanceId);
          resetList();
        }}
        aria-label={instance.displayName}
        aria-pressed={selected}
        title={`${instance.displayName} · ${engineStatus(instance)}`}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-lg",
          selected ? "bg-control ring-1 ring-hairline/50" : "hover:bg-control/60",
        )}
      >
        <ProviderMark driverKind={instance.driverKind} size={18} />
        {attention && <span className="absolute bottom-0.5 right-0.5 size-1.5 rounded-full bg-warning ring-2 ring-panel" />}
      </button>
    );
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setRailId(selection?.instanceId ?? instances[0]?.instanceId ?? null);
          resetList();
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 rounded-full border border-hairline/40 bg-control/60 py-1 pl-2 pr-2.5 text-[13px] text-ink hover:bg-raised-hover"
        title={activeReady && active && selection ? `${active.displayName} · ${modelLabel(active, selection.model)}` : "Choose model"}
      >
        {activeReady && active && <ProviderMark driverKind={active.driverKind} size={14} />}
        <span className="max-w-[160px] truncate">
          {activeReady && selection ? modelLabel(active, selection.model) : "Connect brain"}
        </span>
        <ChevronDown size={14} className={cn("text-ink-secondary transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose model"
          className="absolute right-0 top-full z-40 mt-2 flex max-h-[min(480px,calc(100dvh-7rem))] w-[380px] overflow-hidden rounded-2xl border border-hairline/50 bg-card shadow-2xl shadow-black/50 animate-pop-in"
        >
          <div className="flex w-14 shrink-0 flex-col gap-1 overflow-y-auto border-r border-hairline/40 bg-panel p-2">
            {instances.some((instance) => instance.rail === "cloud") && (
              <div className="px-0 pb-0.5 pt-0.5 text-center text-[9px] font-medium uppercase tracking-wide text-ink-secondary">Cloud</div>
            )}
            {instances.filter((instance) => instance.rail === "cloud").map(railButton)}
            {instances.some((instance) => instance.rail === "local") && (
              <div className="px-0 pb-0.5 pt-2 text-center text-[9px] font-medium uppercase tracking-wide text-ink-secondary">Local</div>
            )}
            {instances.filter((instance) => instance.rail === "local").map(railButton)}
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {railInstance ? (
              <>
                <div className="shrink-0 px-4 pb-2 pt-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <ProviderMark driverKind={railInstance.driverKind} size={16} />
                      <div className="truncate text-[14px] font-semibold text-ink">{railInstance.displayName}</div>
                    </div>
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                      blocked ? "bg-warning/10 text-warning" : "bg-success/10 text-success",
                    )}>
                      {engineStatus(railInstance)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-ink-secondary">
                    {blocked ? "Finish setup to unlock models for this lesson." : "Choose a model for this lesson."}
                  </div>
                </div>

                {blocked ? (
                  <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1">
                    <EngineSetup instance={railInstance} />
                    <p className="mt-2 text-center text-[11.5px] text-ink-secondary/70">Models appear here after setup.</p>
                  </div>
                ) : (
                  <>
                    {railInstance.models.options.length > COMPACT_MODEL_COUNT && (
                      <div className="shrink-0 px-2 pb-2">
                        <div className="flex items-center gap-2 rounded-lg border border-hairline/40 bg-inset px-2.5 py-1.5 focus-within:border-accent/60">
                          <Search size={13} className="shrink-0 text-ink-secondary" />
                          <input
                            value={query}
                            onChange={(event) => {
                              setQuery(event.target.value);
                              if (event.target.value) setShowAll(true);
                            }}
                            placeholder="Search models"
                            aria-label="Search models"
                            className="w-full bg-transparent text-[12.5px] text-ink placeholder:text-ink-secondary focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                    <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                      <div className="px-2 pb-1 pt-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-secondary">
                        {normalizedQuery ? `${filtered.length} results` : showAll ? `All models · ${railInstance.models.options.length}` : "Suggested"}
                      </div>
                      {shown.map((option) => {
                        const selected = selection?.instanceId === railInstance.instanceId && selection.model === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={async () => {
                              await onSelect({ instanceId: railInstance.instanceId, model: option.id });
                              setOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink hover:bg-control/60",
                              selected && "bg-control",
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate">{option.label}</span>
                              {option.provider && <span className="shrink-0 rounded bg-inset px-1.5 py-px text-[10px] text-ink-secondary">{option.provider}</span>}
                              {option.id === railInstance.models.default && <span className="shrink-0 rounded bg-inset px-1.5 py-px text-[10px] text-ink-secondary">Default</span>}
                              {option.loaded && <span className="shrink-0 rounded bg-accent/10 px-1.5 py-px text-[10px] text-accent">Loaded</span>}
                            </span>
                            {selected && <Check size={14} className="shrink-0 text-accent" />}
                          </button>
                        );
                      })}
                      {shown.length === 0 && (
                        <div className="px-2 py-5 text-center text-[12.5px] text-ink-secondary">
                          {normalizedQuery ? `Nothing matches “${query.trim()}”` : "No models discovered"}
                        </div>
                      )}
                      {!normalizedQuery && !showAll && railInstance.models.options.length > compact.length && (
                        <button
                          type="button"
                          onClick={() => setShowAll(true)}
                          className="mt-1 flex w-full items-center justify-between rounded-lg border-t border-hairline/40 px-2.5 py-2 text-[12.5px] font-medium text-ink-secondary hover:bg-control/60 hover:text-ink"
                        >
                          Show all {railInstance.models.options.length} models <ChevronDown size={13} />
                        </button>
                      )}
                      {!normalizedQuery && showAll && railInstance.models.options.length > COMPACT_MODEL_COUNT && (
                        <button
                          type="button"
                          onClick={() => setShowAll(false)}
                          className="mt-1 w-full rounded-lg px-2.5 py-2 text-[12px] text-ink-secondary hover:bg-control/60 hover:text-ink"
                        >
                          Show suggested only
                        </button>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="px-4 py-5 text-[13px] text-ink-secondary">No model providers are available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
