import { PageFrame } from "@/components/SiteShell";
import { LINKS } from "@/lib/links";

export default function TermsPage() {
  return (
    <PageFrame kicker="Terms">
      <div className="info-grid info-grid-2">
        <article className="info-card">
          <h2>What you get</h2>
          <p>opennbLM is an early Windows desktop companion. Features match what is in the current GitHub release, not a future roadmap.</p>
        </article>
        <article className="info-card">
          <h2>Your models</h2>
          <p>You bring the teaching brain. Their terms apply when you use Claude, Codex, Gemini, OpenCode, Ollama, or LM Studio.</p>
        </article>
        <article className="info-card">
          <h2>Rumik voice</h2>
          <p>Rumik-OSS-1 is offered under CC BY-NC 4.0 for research and non-commercial use. Local install steps are in Settings.</p>
        </article>
        <article className="info-card">
          <h2>Source</h2>
          <p>
            The project is open on GitHub. Questions and defects go to{" "}
            <a href={LINKS.issues} target="_blank" rel="noreferrer">
              issues
            </a>
            .
          </p>
        </article>
      </div>
    </PageFrame>
  );
}
