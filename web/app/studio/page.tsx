import Link from "next/link";
import { PageFrame } from "@/components/SiteShell";

const tools = [
  { href: "/studio/notebooks", title: "Notebooks", body: "Sources, chat, and Studio in one workspace." },
  { href: "/studio/audio-overview", title: "Audio Overview", body: "A spoken pass over what you selected." },
  { href: "/studio/mind-map", title: "Mind Map", body: "Branches laid out so topics do not collide." },
  { href: "/studio/infographic", title: "Infographic", body: "A poster of the facts you asked to keep." },
  { href: "/studio/quiz", title: "Quiz", body: "Prove the reading back, from the sources." },
  { href: "/studio/flashcards", title: "Flashcards", body: "Short fronts and backs for recall." },
  { href: "/studio/slides", title: "Slides", body: "A deck you step through, not a dump of chat." },
];

export default function StudioIndexPage() {
  return (
    <PageFrame kicker="Studio">
      <div className="info-grid info-grid-4">
        {tools.map((tool, index) => (
          <Link className="info-card" href={tool.href} key={tool.href}>
            <span className="info-index">{String(index + 1).padStart(2, "0")}</span>
            <h2>{tool.title}</h2>
            <p>{tool.body}</p>
          </Link>
        ))}
      </div>
    </PageFrame>
  );
}
