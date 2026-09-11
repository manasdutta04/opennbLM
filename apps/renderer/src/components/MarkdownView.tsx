import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** Lightweight Markdown → React for Studio reports (no extra dependency). */
export function MarkdownView({ text, className }: { text: string; className?: string }) {
  const blocks = splitBlocks(text.replace(/\r\n/g, "\n").trim());
  return (
    <div className={cn("space-y-3 text-[14px] leading-relaxed text-ink", className)}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "p"; text: string }
  | { type: "code"; text: string };

function splitBlocks(src: string): Block[] {
  const lines = src.split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith("```")) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        buf.push(lines[i] ?? "");
        i += 1;
      }
      i += 1;
      out.push({ type: "code", text: buf.join("\n") });
      continue;
    }
    if (/^###\s+/.test(line)) {
      out.push({ type: "h3", text: line.replace(/^###\s+/, "") });
      i += 1;
      continue;
    }
    if (/^##\s+/.test(line)) {
      out.push({ type: "h2", text: line.replace(/^##\s+/, "") });
      i += 1;
      continue;
    }
    if (/^#\s+/.test(line)) {
      out.push({ type: "h1", text: line.replace(/^#\s+/, "") });
      i += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*[-*]\s+/, ""));
        i += 1;
      }
      out.push({ type: "ul", items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      out.push({ type: "ol", items });
      continue;
    }
    const buf: string[] = [line];
    i += 1;
    while (i < lines.length && (lines[i] ?? "").trim() && !/^(#{1,3}\s|```|\s*[-*]\s+|\s*\d+\.\s+)/.test(lines[i] ?? "")) {
      buf.push(lines[i] ?? "");
      i += 1;
    }
    out.push({ type: "p", text: buf.join(" ") });
  }
  return out;
}

function Inline({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\$[^$]+\$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key++} className="rounded bg-inset px-1 py-0.5 text-[12.5px] text-accent-text">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(
        <em key={key++} className="text-ink-secondary">
          {token.slice(1, -1)}
        </em>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function Block({ block }: { block: Block }) {
  if (block.type === "h1") return <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink"><Inline text={block.text} /></h2>;
  if (block.type === "h2") return <h3 className="text-[16px] font-semibold text-ink"><Inline text={block.text} /></h3>;
  if (block.type === "h3") return <h4 className="text-[14.5px] font-semibold text-ink"><Inline text={block.text} /></h4>;
  if (block.type === "ul") {
    return (
      <ul className="list-disc space-y-1 pl-5 text-ink-secondary">
        {block.items.map((item, i) => (
          <li key={i} className="text-ink">
            <Inline text={item} />
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === "ol") {
    return (
      <ol className="list-decimal space-y-1 pl-5 text-ink-secondary">
        {block.items.map((item, i) => (
          <li key={i} className="text-ink">
            <Inline text={item} />
          </li>
        ))}
      </ol>
    );
  }
  if (block.type === "code") {
    return (
      <pre className="overflow-x-auto rounded-xl border border-hairline/35 bg-inset p-3 text-[12.5px] text-ink-secondary">
        {block.text}
      </pre>
    );
  }
  return (
    <p className="text-ink-secondary">
      <Inline text={block.text} />
    </p>
  );
}
