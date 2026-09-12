import Link from "next/link";
import { PageFrame } from "@/components/SiteShell";

const tools = [
  { href: "/studio/notebooks", title: "notebooks", body: "the workspace: sources, chat, and outputs in one place." },
  { href: "/studio/audio-overview", title: "audio overview", body: "a spoken pass over the sources you selected." },
  { href: "/studio/mind-map", title: "mind map", body: "a graph of topics with space for the leaves." },
  { href: "/studio/infographic", title: "infographic", body: "one poster of the facts you asked to keep." },
  { href: "/studio/quiz", title: "quiz", body: "questions from those sources, to check yourself." },
  { href: "/studio/flashcards", title: "flashcards", body: "short front and back cards for recall." },
  { href: "/studio/slides", title: "slides", body: "a deck you step through, not a long chat." },
];

export default function StudioIndexPage() {
  return (
    <PageFrame kicker="studio">
      <article className="doc">
        <h1 className="page-title">studio tools</h1>
        <p className="lede">
          each tool runs from a notebook, on the sources you have selected, through the teaching brain you connected. open a page below for how that tool behaves today.
        </p>
        <div className="info-grid info-grid-2">
          {tools.map((tool) => (
            <Link className="info-card" href={tool.href} key={tool.href}>
              <h2>{tool.title}</h2>
              <p>{tool.body}</p>
            </Link>
          ))}
        </div>
      </article>
    </PageFrame>
  );
}
