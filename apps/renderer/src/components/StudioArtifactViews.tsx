import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "../lib/cn";

type MindChild = { label: string; children?: MindChild[] };
type MindMapData = { root: string; children?: MindChild[] };
type MindNodeData = { label: string; level: number };
type MindFlowNode = Node<MindNodeData, "mind">;

type InfographicData = {
  headline: string;
  subtitle?: string;
  stats?: Array<{ label: string; value: string; hint?: string }>;
  sections?: Array<{ title: string; points?: string[]; accent?: string }>;
};

type Flashcard = { front: string; back: string };
type QuizQuestion = { prompt: string; choices: string[]; answerIndex: number; explanation?: string };
type Slide = { title: string; bullets?: string[] };

const ACCENTS = ["#4c8bf5", "#e6c35c", "#7ad0c8", "#f0a0c0", "#e8a06a", "#b8a0ff"] as const;

function MindNode({ data }: NodeProps<MindFlowNode>) {
  const level = data.level ?? 0;
  return (
    <div
      className={cn(
        "max-w-[220px] rounded-2xl border px-3 py-2 text-center shadow-sm",
        level === 0
          ? "border-[#4c8bf5]/45 bg-[#4c8bf5]/15 text-[14px] font-semibold text-ink"
          : level === 1
            ? "border-hairline/50 bg-card text-[12.5px] font-medium text-ink"
            : "border-hairline/35 bg-inset text-[11.5px] text-ink-secondary",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#4c8bf5] !w-2 !h-2 !border-0" />
      <div className="leading-snug">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#4c8bf5] !w-2 !h-2 !border-0" />
    </div>
  );
}

const nodeTypes = { mind: MindNode } satisfies NodeTypes;

function buildMindFlow(data: MindMapData): { nodes: MindFlowNode[]; edges: Edge[] } {
  const nodes: MindFlowNode[] = [];
  const edges: Edge[] = [];
  const rootId = "root";
  nodes.push({
    id: rootId,
    type: "mind",
    position: { x: 0, y: 0 },
    data: { label: data.root, level: 0 },
  });

  const level1 = data.children || [];
  const l1Gap = 260;
  const l1Width = Math.max(level1.length - 1, 0) * l1Gap;
  level1.forEach((child, i) => {
    const id = `l1-${i}`;
    const x = -l1Width / 2 + i * l1Gap;
    nodes.push({
      id,
      type: "mind",
      position: { x, y: 140 },
      data: { label: child.label, level: 1 },
    });
    edges.push({
      id: `e-${rootId}-${id}`,
      source: rootId,
      target: id,
      type: "smoothstep",
      style: { stroke: "#4c8bf5", strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#4c8bf5", width: 16, height: 16 },
    });

    const grands = child.children || [];
    const gGap = 170;
    const gWidth = Math.max(grands.length - 1, 0) * gGap;
    grands.forEach((g, gi) => {
      const gid = `l2-${i}-${gi}`;
      nodes.push({
        id: gid,
        type: "mind",
        position: { x: x - gWidth / 2 + gi * gGap, y: 280 },
        data: { label: g.label, level: 2 },
      });
      edges.push({
        id: `e-${id}-${gid}`,
        source: id,
        target: gid,
        type: "smoothstep",
        style: { stroke: "rgba(148,163,184,0.7)", strokeWidth: 1.2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(148,163,184,0.9)", width: 14, height: 14 },
      });
    });
  });

  return { nodes, edges };
}

export function MindMapView({ data }: { data: MindMapData }) {
  const { nodes, edges } = useMemo(() => buildMindFlow(data), [data]);
  return (
    <div className="mt-4 h-[min(520px,60vh)] overflow-hidden rounded-2xl border border-hairline/40 bg-inset">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.35}
        maxZoom={1.4}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
      >
        <Background gap={18} size={1} color="rgba(148,163,184,0.18)" />
        <Controls showInteractive={false} className="!bg-card !border-hairline/40 !shadow-none" />
        <MiniMap
          className="!bg-card !border-hairline/40"
          nodeColor={() => "#4c8bf5"}
          maskColor="rgba(0,0,0,0.35)"
        />
      </ReactFlow>
    </div>
  );
}

export function InfographicView({ data }: { data: InfographicData }) {
  const sections = data.sections || [];
  const stats = data.stats || [];
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-hairline/40 bg-gradient-to-br from-[#152033] via-card to-[#1a2438]">
      <div className="relative overflow-hidden px-5 pb-4 pt-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#4c8bf5]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-8 h-28 w-28 rounded-full bg-[#7ad0c8]/15 blur-3xl" />
        <div className="relative">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7ab0e8]">Infographic</div>
          <h3 className="mt-1 max-w-[36rem] text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">
            {data.headline}
          </h3>
          {data.subtitle ? <p className="mt-2 max-w-[34rem] text-[13px] leading-relaxed text-ink-secondary">{data.subtitle}</p> : null}
        </div>
      </div>

      {stats.length ? (
        <div className="grid gap-2 border-y border-hairline/30 bg-black/15 px-4 py-3 sm:grid-cols-3">
          {stats.slice(0, 3).map((stat, i) => (
            <div key={`${stat.label}-${i}`} className="rounded-xl border border-hairline/30 bg-card/70 px-3 py-2.5">
              <div className="text-[18px] font-semibold text-ink" style={{ color: ACCENTS[i % ACCENTS.length] }}>
                {stat.value}
              </div>
              <div className="text-[12px] font-medium text-ink">{stat.label}</div>
              {stat.hint ? <div className="mt-0.5 text-[11px] text-ink-secondary">{stat.hint}</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {sections.map((sec, i) => {
          const accent = ACCENTS[i % ACCENTS.length]!;
          return (
            <div
              key={`${sec.title}-${i}`}
              className="relative overflow-hidden rounded-2xl border border-hairline/35 bg-card/80 p-3.5"
              style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-black"
                  style={{ background: accent }}
                >
                  {i + 1}
                </span>
                <div className="text-[13.5px] font-semibold text-ink">{sec.title}</div>
              </div>
              <ul className="space-y-1.5 pl-1 text-[12.5px] leading-relaxed text-ink-secondary">
                {(sec.points || []).slice(0, 5).map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FlashcardsView({ cards }: { cards: Flashcard[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];
  if (!card) return <p className="mt-4 text-[13px] text-ink-secondary">No cards.</p>;

  const go = (next: number) => {
    setIndex((next + cards.length) % cards.length);
    setFlipped(false);
  };

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between text-[12px] text-ink-secondary">
        <span>
          Card {index + 1} / {cards.length}
        </span>
        <button type="button" className="inline-flex items-center gap-1 hover:text-ink" onClick={() => go(0)}>
          <RotateCcw size={12} /> Reset
        </button>
      </div>
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        className="flex min-h-[180px] w-full flex-col items-center justify-center rounded-2xl border border-hairline/40 bg-card px-5 py-6 text-center transition hover:border-[#4c8bf5]/40"
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-secondary">
          {flipped ? "Answer" : "Prompt"} · click to flip
        </div>
        <div className="mt-3 text-[15px] font-medium leading-relaxed text-ink">{flipped ? card.back : card.front}</div>
      </button>
      <div className="mt-3 flex gap-2">
        <button type="button" className="flex-1 rounded-full border border-hairline/40 py-2 text-[12.5px]" onClick={() => go(index - 1)}>
          Previous
        </button>
        <button type="button" className="flex-1 rounded-full bg-white py-2 text-[12.5px] font-medium text-black" onClick={() => go(index + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

export function QuizView({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const score = useMemo(() => {
    let n = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.answerIndex) n += 1;
    });
    return n;
  }, [answers, questions]);

  if (!questions.length) return <p className="mt-4 text-[13px] text-ink-secondary">No questions.</p>;

  return (
    <div className="mt-4 space-y-3">
      {questions.map((q, i) => {
        const picked = answers[i];
        return (
          <div key={i} className="rounded-2xl border border-hairline/35 bg-card p-3.5 text-[13px]">
            <div className="font-medium text-ink">
              {i + 1}. {q.prompt}
            </div>
            <div className="mt-2 space-y-1.5">
              {(q.choices || []).map((choice, ci) => {
                const selected = picked === ci;
                const correct = submitted && ci === q.answerIndex;
                const wrong = submitted && selected && ci !== q.answerIndex;
                return (
                  <button
                    key={ci}
                    type="button"
                    disabled={submitted}
                    onClick={() => setAnswers((cur) => ({ ...cur, [i]: ci }))}
                    className={cn(
                      "block w-full rounded-xl border px-3 py-2 text-left transition",
                      correct
                        ? "border-success/50 bg-success/10 text-success"
                        : wrong
                          ? "border-danger/40 bg-danger/10 text-danger"
                          : selected
                            ? "border-[#4c8bf5]/50 bg-[#4c8bf5]/10 text-ink"
                            : "border-hairline/35 text-ink-secondary hover:border-hairline/60 hover:text-ink",
                    )}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
            {submitted && q.explanation ? <p className="mt-2 text-[12px] text-ink-secondary">{q.explanation}</p> : null}
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-3 pt-1">
        {submitted ? (
          <div className="text-[13px] text-ink">
            Score: <span className="font-semibold">{score}</span> / {questions.length}
          </div>
        ) : (
          <div className="text-[12px] text-ink-secondary">Pick an answer for each question.</div>
        )}
        <button
          type="button"
          className="rounded-full bg-white px-4 py-1.5 text-[12.5px] font-medium text-black"
          onClick={() => {
            if (submitted) {
              setAnswers({});
              setSubmitted(false);
            } else {
              setSubmitted(true);
            }
          }}
        >
          {submitted ? "Try again" : "Check answers"}
        </button>
      </div>
    </div>
  );
}

export function SlideDeckView({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const onKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setIndex((i) => Math.min(slides.length - 1, i + 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    },
    [slides.length],
  );
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  if (!slide) return <p className="mt-4 text-[13px] text-ink-secondary">No slides.</p>;

  return (
    <div className="mt-4">
      <div className="flex min-h-[240px] flex-col justify-center rounded-2xl border border-hairline/40 bg-gradient-to-br from-card to-inset px-6 py-8">
        <div className="text-[11px] uppercase tracking-[0.12em] text-ink-secondary">
          Slide {index + 1} / {slides.length}
        </div>
        <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink">{slide.title}</h3>
        <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-ink-secondary">
          {(slide.bullets || []).map((b) => (
            <li key={b} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4c8bf5]" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={index === 0}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-hairline/40 py-2 text-[12.5px] disabled:opacity-40"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          type="button"
          disabled={index >= slides.length - 1}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-white py-2 text-[12.5px] font-medium text-black disabled:opacity-40"
          onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
