import { PageFrame } from "@/components/SiteShell";
import { DownloadCue } from "@/components/DownloadCue";
import { LINKS } from "@/lib/links";

export default function DownloadPage() {
  return (
    <PageFrame kicker="download">
      <article className="doc">
        <h1 className="page-title">windows installer</h1>
        <p className="lede">
          this page always offers the latest windows x64 installer from github releases.
        </p>
        <p>
          <DownloadCue className="download-row" />
        </p>
        <h2>after install</h2>
        <ol>
          <li>launch opennbLM.</li>
          <li>create a notebook and connect a teaching brain from the model picker.</li>
          <li>add sources, then use chat or studio. voice uses the public rumik space until you bind local weights.</li>
        </ol>
        <h2>if it crashes or never opens</h2>
        <ul>
          <li>windows may warn on an unsigned build. choose more info, then run anyway.</li>
          <li>start the app again from the start menu.</li>
          <li>if chat will not run, connect a teaching brain first.</li>
          <li>
            if you need a local ollama brain, keep this running in a terminal: <code>ollama serve</code>
          </li>
        </ul>
        <p>
          older versioned builds are on{" "}
          <a href={LINKS.releases} target="_blank" rel="noreferrer">
            github releases
          </a>
          .
        </p>
      </article>
    </PageFrame>
  );
}
