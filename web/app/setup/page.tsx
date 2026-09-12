import { PageFrame } from "@/components/SiteShell";
import { LINKS } from "@/lib/links";

export default function SetupPage() {
  return (
    <PageFrame kicker="setup guide">
      <article className="doc">
        <h1 className="page-title">install and get a notebook working</h1>
        <p className="lede">
          you do not clone the repository to use the product. download the installer, then connect a teaching brain inside the app.
        </p>

        <h2>1. install on windows</h2>
        <p>
          get the current x64 nsis installer from{" "}
          <a href={LINKS.releases} target="_blank" rel="noreferrer">
            github releases
          </a>
          . run it, then launch opennbLM from the start menu or the desktop shortcut.
        </p>
        <p>
          the first launch opens setup widgets: this pc, connect a teaching brain, then optional rumik voice. you can skip and come back. home still shows those widgets until a brain is connected. chat and studio stay locked until that happens.
        </p>

        <h2>2. connect a teaching brain</h2>
        <p>
          open or create a notebook. use the model chip (connect brain). install or sign in to the engine you want — claude code, codex, gemini cli, opencode, or a local ollama / lm studio server — then pick a model. settings does not take api keys.
        </p>

        <h2>3. add sources</h2>
        <p>
          add pdfs, links, or pasted text to the notebook. select the sources you want in context. then ask a question or open a studio tool. answers and artifacts are meant to stay on that selection.
        </p>

        <h2>4. voice, if you want it</h2>
        <p>
          the .exe already calls the public rumik space. you do not clone this repo. a hugging face token is optional in settings if anonymous quota runs out. or choose local for cuda on this pc. see{" "}
          <a href="/voice">voice engine</a>.
        </p>
      </article>
    </PageFrame>
  );
}
