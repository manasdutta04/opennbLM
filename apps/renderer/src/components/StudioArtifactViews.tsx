import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
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

const NODE_W = { 0: 220, 1: 180, 2: 168 } as const;
const NODE_H = { 0: 56, 1: 52, 2: 68 } as const;
const H_GAP = 32;
const V_GAP = 92;

function MindNode({ data }: NodeProps<MindFlowNode>) {
  const level = data.level ?? 0;
  const width = NODE_W[level as 0 | 1 | 2] ?? NODE_W[2];
  return (
    <div
      style={{ width, minHeight: NODE_H[level as 0 | 1 | 2] ?? NODE_H[2] }}
      className={cn(
        "box-border flex items-center justify-center rounded-xl border px-2.5 py-2 text-center",
        level === 0
          ? "border-[#4c8bf5]/55 bg-[#4c8bf5]/18 text-[13px] font-semibold text-ink"
          : level === 1
            ? "border-hairline/55 bg-card text-[12px] font-medium text-ink"
            : "border-hairline/45 bg-[#16161c] text-[11px] leading-snug text-ink-secondary",
      )}
    >
      <Handle type="target" position={Position.Top} className="!pointer-events-none !h-px !w-px !border-0 !bg-transparent !opacity-0" />
      <div className="line-clamp-3 w-full leading-snug">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="!pointer-events-none !h-px !w-px !border-0 !bg-transparent !opacity-0" />
    </div>
  );
}

const nodeTypes = { mind: MindNode } satisfies NodeTypes;

type Tree = { id: string; label: string; level: number; children: Tree[] };

function toTree(data: MindMapData): Tree {
  return {
    id: "root",
    label: data.root,
    level: 0,
    children: (data.children || []).map((child, i) => ({
      id: `l1-${i}`,
      label: child.label,
      level: 1,
      children: (child.children || []).map((g, gi) => ({
        id: `l2-${i}-${gi}`,
        label: g.label,
        level: 2,
        children: [],
      })),
    })),
  };
}

function subtreeWidth(node: Tree): number {
  const self = NODE_W[node.level as 0 | 1 | 2] ?? NODE_W[2];
  if (!node.children.length) return self;
  const kids = node.children.reduce((sum, child, index) => sum + subtreeWidth(child) + (index > 0 ? H_GAP : 0), 0);
  return Math.max(self, kids);
}

function placeTree(node: Tree, left: number, y: number, nodes: MindFlowNode[], edges: Edge[], parentId?: string): void {
  const width = subtreeWidth(node);
  const nodeW = NODE_W[node.level as 0 | 1 | 2] ?? NODE_W[2];
  const x = left + (width - nodeW) / 2;
  nodes.push({
    id: node.id,
    type: "mind",
    position: { x, y },
    data: { label: node.label, level: node.level },
    style: { width: nodeW, height: NODE_H[node.level as 0 | 1 | 2] ?? NODE_H[2] },
    draggable: true,
    selectable: true,
  });
  if (parentId) {
    edges.push({
      id: `e-${parentId}-${node.id}`,
      source: parentId,
      target: node.id,
      type: "smoothstep",
      style: {
        stroke: node.level === 1 ? "#6ea0f0" : "rgba(148,163,184,0.55)",
        strokeWidth: node.level === 1 ? 1.6 : 1.2,
      },
    });
  }
  if (!node.children.length) return;
  const kidsWidth = node.children.reduce((sum, child, index) => sum + subtreeWidth(child) + (index > 0 ? H_GAP : 0), 0);
  let cursor = left + (width - kidsWidth) / 2;
  const childY = y + (NODE_H[node.level as 0 | 1 | 2] ?? NODE_H[2]) + V_GAP;
  for (const child of node.children) {
    const w = subtreeWidth(child);
    placeTree(child, cursor, childY, nodes, edges, node.id);
    cursor += w + H_GAP;
  }
}

function buildMindFlow(data: MindMapData): { nodes: MindFlowNode[]; edges: Edge[] } {
  const nodes: MindFlowNode[] = [];
  const edges: Edge[] = [];
  placeTree(toTree(data), 0, 0, nodes, edges);
  return { nodes, edges };
}

export function MindMapView({ data }: { data: MindMapData }) {
  const { nodes, edges } = useMemo(() => buildMindFlow(data), [data]);
  return (
    <div className="mindmap-flow mt-4 h-[min(620px,72vh)] overflow-hidden rounded-2xl border border-hairline/40 bg-[#0e0e12]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.22}
        maxZoom={1.35}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnScroll
        zoomOnScroll
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background gap={20} size={1} color="rgba(148,163,184,0.12)" />
        <Controls showInteractive={false} className="mindmap-controls !shadow-none" />
      </ReactFlow>
    </div>
  );
}

const scriptSafe = "[overflow-wrap:break-word] [word-break:normal] [line-break:auto]";

function padIndex(n: number) {
  return String(n).padStart(2, "0");
}

export function InfographicView({ data }: { data: InfographicData }) {
  const sections = data.sections || [];
  const stats = data.stats || [];
  return (
    <article className={cn("mt-4 overflow-hidden rounded-2xl border border-hairline/45 bg-card", scriptSafe)}>
      <header className="border-b border-hairline/30 px-6 py-6">
        <h3 className="max-w-[40rem] text-[26px] font-semibold leading-snug text-ink">{data.headline}</h3>
        {data.subtitle ? (
          <p className="mt-3 max-w-[38rem] text-[14.5px] leading-[1.65] text-ink-secondary">{data.subtitle}</p>
        ) : null}
      </header>

      {stats.length ? (
        <div className="grid border-b border-hairline/30 sm:grid-cols-3">
          {stats.slice(0, 3).map((stat, i) => (
            <div
              key={`${stat.label}-${i}`}
              className={cn("px-6 py-5", i > 0 && "sm:border-l sm:border-hairline/30")}
            >
              <div className="text-[28px] font-semibold leading-none text-ink">{stat.value}</div>
              <div className="mt-2 text-[13px] leading-snug text-ink">{stat.label}</div>
              {stat.hint ? <div className="mt-1 text-[12px] leading-relaxed text-ink-secondary">{stat.hint}</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2">
        {sections.map((sec, i) => (
          <section
            key={`${sec.title}-${i}`}
            className={cn(
              "border-hairline/30 px-6 py-5",
              i > 0 && "border-t sm:border-t-0",
              i >= 2 && "sm:border-t",
              i % 2 === 1 && "sm:border-l",
            )}
          >
            <div className="text-[11px] text-ink-secondary">{padIndex(i + 1)}</div>
            <h4 className="mt-1 text-[15px] font-semibold leading-snug text-ink">{sec.title}</h4>
            <ul className="mt-3 space-y-2 text-[13px] leading-[1.6] text-ink-secondary">
              {(sec.points || []).slice(0, 5).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
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
    <div className={cn("mt-4", scriptSafe)}>
      <div className="mb-3 flex items-center justify-between text-[12.5px] text-ink-secondary">
        <span>
          {padIndex(index + 1)} / {padIndex(cards.length)}
        </span>
        <button type="button" className="inline-flex items-center gap-1 hover:text-ink" onClick={() => go(0)}>
          <RotateCcw size={12} /> Start over
        </button>
      </div>
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        className="flex min-h-[260px] w-full flex-col justify-between rounded-2xl border border-hairline/45 bg-card px-7 py-6 text-left transition hover:border-hairline/70"
      >
        <div className="text-[12px] text-ink-secondary">{flipped ? "Answer" : "Prompt"}</div>
        <div className="py-6 text-[18px] font-medium leading-[1.55] text-ink">{flipped ? card.back : card.front}</div>
        <div className="text-[12px] text-ink-secondary">Click to flip</div>
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

  const letters = ["A", "B", "C", "D", "E", "F"];

  return (
    <div className={cn("mt-4 space-y-4", scriptSafe)}>
      {questions.map((q, i) => {
        const picked = answers[i];
        return (
          <div key={i} className="border-b border-hairline/30 pb-4 last:border-b-0">
            <div className="text-[11px] text-ink-secondary">{padIndex(i + 1)}</div>
            <div className="mt-1 text-[15px] font-medium leading-snug text-ink">{q.prompt}</div>
            <div className="mt-3 space-y-1.5">
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
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                      correct
                        ? "border-success/45 bg-success/8 text-ink"
                        : wrong
                          ? "border-danger/40 bg-danger/8 text-ink"
                          : selected
                            ? "border-hairline bg-raised text-ink"
                            : "border-hairline/30 text-ink-secondary hover:border-hairline/55 hover:text-ink",
                    )}
                  >
                    <span className="mt-0.5 w-5 shrink-0 text-[12px] text-ink-secondary">{letters[ci] ?? ci + 1}</span>
                    <span className="text-[13.5px] leading-[1.55]">{choice}</span>
                  </button>
                );
              })}
            </div>
            {submitted && q.explanation ? <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary">{q.explanation}</p> : null}
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
    <div className={cn("mt-4", scriptSafe)}>
      <div className="flex aspect-[16/9] min-h-[280px] flex-col rounded-2xl border border-hairline/45 bg-card px-8 py-7">
        <div className="text-[12px] text-ink-secondary">
          {padIndex(index + 1)} / {padIndex(slides.length)}
        </div>
        <h3 className="mt-4 max-w-[36rem] text-[26px] font-semibold leading-snug text-ink">{slide.title}</h3>
        <div className="mt-4 h-px w-12 bg-hairline" />
        <ul className="mt-5 space-y-3 text-[15px] leading-[1.6] text-ink-secondary">
          {(slide.bullets || []).map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <div className="mt-auto pt-6">
          <div className="h-px bg-hairline/40">
            <div className="h-px bg-ink/50" style={{ width: `${((index + 1) / slides.length) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={index === 0}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-hairline/40 py-2 text-[12.5px] disabled:opacity-40"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft size={14} /> Previous
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

export function DataTableView({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className={cn("mt-4 overflow-x-auto rounded-2xl border border-hairline/45", scriptSafe)}>
      <table className="w-full min-w-[28rem] border-collapse text-[13px]">
        <thead>
          <tr>
            {(columns || []).map((c) => (
              <th key={c} className="border-b border-hairline/40 bg-card px-4 py-3 text-left font-medium leading-snug text-ink">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((row, i) => (
            <tr key={i} className="odd:bg-inset/35">
              {row.map((cell, j) => (
                <td key={j} className="border-b border-hairline/20 px-4 py-3 leading-[1.55] text-ink-secondary">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
