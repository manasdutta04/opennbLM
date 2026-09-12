import { PageFrame } from "@/components/SiteShell";

export default function BrainPage() {
  return (
    <PageFrame kicker="teaching brain">
      <article className="doc">
        <h1 className="page-title">connect the model you already use</h1>
        <p className="lede">
          opennbLM does not ship a built-in llm. teaching, chat, and studio generation go through the engine you attach from a notebook.
        </p>

        <h2>how you connect</h2>
        <p>
          open a notebook or lesson and click the model chip. the picker lists engines the desktop process can see. you sign in or start the local server in that engine’s own tool — not by pasting a secret into settings.
        </p>

        <h2>supported engines</h2>
        <ul>
          <li>
            <strong>claude, codex, gemini, opencode</strong> — command-line tools. install them, complete their login if they ask, then choose a model in the picker.
          </li>
          <li>
            <strong>ollama</strong> — run models on this machine. start the server, then pick ollama.
          </li>
          <li>
            <strong>lm studio</strong> — openai-compatible local server. start it, then select it as the brain.
          </li>
        </ul>
        <p className="cue-sub">if you use ollama</p>
        <pre>
          <code>ollama serve</code>
        </pre>

        <h2>what the brain is used for</h2>
        <p>
          grounded questions in the notebook, titles after you generate a guide, and studio artifacts (audio overview scripts, mind maps, quizzes, slides, and the rest). if no brain is connected, those actions stay disabled and the home banner remains.
        </p>

        <div className="note">
          <strong>cloud vs local</strong>
          a cloud cli sends the selected source excerpts to that vendor. ollama and lm studio keep inference on your machine. pick the engine that matches how you want the text to travel.
        </div>
      </article>
    </PageFrame>
  );
}
