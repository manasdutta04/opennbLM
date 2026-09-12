import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

const RELEASES = "https://github.com/manasdutta04/opennbLM/releases/latest";
const REPO = "https://github.com/manasdutta04/opennbLM";

export default function HomePage() {
  return (
    <main>
      <div className="wrap">
        <SiteNav />

        <section className="hero">
          <h1>Learn from your sources. Locally.</h1>
          <p>
            opennbLM is a native, local-first learning companion for Windows. Add PDFs and notes, ask grounded
            questions, generate Studio study tools, and hear Audio Overviews with Rumik voice.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={RELEASES}>
              Download for Windows
            </a>
            <Link className="btn btn-ghost" href="/docs">
              Read the docs
            </Link>
          </div>
        </section>

        <section className="section">
          <h2>What you get</h2>
          <p className="lead">Built for focused study sessions — not another chat dashboard.</p>
          <div className="grid">
            <article className="card">
              <h3>Notebooks</h3>
              <p>Keep sources, chat, and Studio outputs together in a private local workspace.</p>
            </article>
            <article className="card">
              <h3>Studio tools</h3>
              <p>Audio Overview, Mind Map, Infographic, Quiz, Flashcards, Slides, Reports, and tables.</p>
            </article>
            <article className="card">
              <h3>Your teaching brain</h3>
              <p>Connect Claude, Codex, Gemini, OpenCode, Ollama, or LM Studio — you bring the model.</p>
            </article>
            <article className="card">
              <h3>Rumik voice</h3>
              <p>Expressive Audio Overviews with optional local CUDA install or remote fallback.</p>
            </article>
          </div>
        </section>

        <section className="section">
          <h2>Download</h2>
          <p className="lead">
            Grab the latest Windows installer from GitHub Releases. CI publishes a new Windows build when a version
            tag is pushed (and can refresh a continuous pre-release from main).
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={RELEASES}>
              Latest Windows release
            </a>
            <a className="btn btn-ghost" href={REPO} target="_blank" rel="noreferrer">
              View source
            </a>
          </div>
        </section>

        <footer className="footer">
          <span>opennbLM · local-first learning</span>
          <span>
            <Link href="/docs">Docs</Link>
            {" · "}
            <a href={REPO}>GitHub</a>
          </span>
        </footer>
      </div>
    </main>
  );
}
