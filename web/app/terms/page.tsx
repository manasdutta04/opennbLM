import { PageFrame } from "@/components/SiteShell";
import { LINKS } from "@/lib/links";

export default function TermsPage() {
  return (
    <PageFrame kicker="terms">
      <article className="doc">
        <h1 className="page-title">how this software is offered</h1>
        <p className="lede">
          opennbLM is an early windows desktop project. what you get is whatever the current github release actually contains.
        </p>
        <h2>your teaching brain</h2>
        <p>
          you attach claude, codex, gemini, opencode, ollama, or lm studio. those products have their own terms. opennbLM does not replace them.
        </p>
        <h2>rumik</h2>
        <p>
          rumik-oss-1 weights are cc by-nc 4.0 (research / non-commercial). remote (https) uses the public rumik-ai space and may hit quota. choose remote or local in settings → voice engine.
        </p>
        <h2>source</h2>
        <p>
          the code is on{" "}
          <a href={LINKS.repo} target="_blank" rel="noreferrer">
            github
          </a>
          . report defects on{" "}
          <a href={LINKS.issues} target="_blank" rel="noreferrer">
            issues
          </a>
          .
        </p>
      </article>
    </PageFrame>
  );
}
