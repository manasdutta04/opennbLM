import Link from "next/link";
import { PageFrame } from "@/components/SiteShell";

const items = [
  { href: "/setup", title: "Setup Guide", body: "Install, connect, add sources." },
  { href: "/brain", title: "Teaching Brain", body: "CLIs and local servers." },
  { href: "/voice", title: "Voice Engine", body: "Remote fallback or local Rumik." },
  { href: "/architecture", title: "Architecture", body: "Main, preload, packages." },
  { href: "/studio", title: "Studio", body: "Every study tool, one page each." },
  { href: "/privacy", title: "Privacy", body: "What stays on the machine." },
  { href: "/terms", title: "Terms", body: "How the app is offered." },
  { href: "/download", title: "Download", body: "Windows x64 installer." },
];

export default function DocsPage() {
  return (
    <PageFrame kicker="Docs">
      <div className="info-grid info-grid-4">
        {items.map((item) => (
          <Link className="info-card" href={item.href} key={item.href}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </Link>
        ))}
      </div>
    </PageFrame>
  );
}
