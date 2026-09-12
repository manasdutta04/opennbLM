import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

export default function DocsPage() {
  return (
    <main>
      <div className="wrap">
        <SiteNav />

        <section className="section" style={{ borderTop: "none", paddingTop: "2rem" }}>
          <h2>Docs</h2>
          <p className="lead">
            Start here after installing the Windows build. Full engineering notes live in the repository{" "}
            <code>docs/</code> folder.
          </p>

          <div className="docs">
            <DocCard
              title="1. Install the desktop app"
              body="Download the latest Windows NSIS installer from GitHub Releases, run it, and launch opennbLM."
              href="https://github.com/manasdutta04/opennbLM/releases/latest"
              cta="Open releases"
            />
            <DocCard
              title="2. Connect a teaching brain"
              body="Open a notebook → Connect brain → install/sign in to Claude, Codex, Gemini, OpenCode, or use Ollama / LM Studio. This unlocks grounded chat and Studio."
            />
            <DocCard
              title="3. Optional Rumik voice"
              body="Audio Overview can use remote fallback immediately. For unlimited local voice, open Settings → Voice engine and follow the CUDA + model bind steps."
            />
            <DocCard
              title="Architecture & Rumik"
              body="Read rumik.md and architecture.md in the repo for packaging boundaries, local vs remote voice, and engine rules."
              href="https://github.com/manasdutta04/opennbLM/tree/main/docs"
              cta="Browse docs/"
            />
          </div>
        </section>

        <footer className="footer">
          <Link href="/">← Back home</Link>
          <a href="https://github.com/manasdutta04/opennbLM">GitHub</a>
        </footer>
      </div>
    </main>
  );
}

function DocCard({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  const inner = (
    <>
      <div>
        <strong>{title}</strong>
        <p style={{ margin: "0.45rem 0 0", color: "var(--muted)", lineHeight: 1.5 }}>{body}</p>
      </div>
      {cta ? <span>{cta} →</span> : null}
    </>
  );
  if (href) {
    return (
      <a className="doc-link" href={href} target="_blank" rel="noreferrer">
        {inner}
      </a>
    );
  }
  return <div className="doc-link">{inner}</div>;
}
