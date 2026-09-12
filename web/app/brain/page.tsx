import { PageFrame } from "@/components/SiteShell";

const engines = [
  { name: "Claude", kind: "CLI" },
  { name: "Codex", kind: "CLI" },
  { name: "Gemini", kind: "CLI" },
  { name: "OpenCode", kind: "CLI" },
  { name: "Ollama", kind: "Local" },
  { name: "LM Studio", kind: "Local" },
];

export default function BrainPage() {
  return (
    <PageFrame kicker="Teaching Brain">
      <div className="split">
        <div className="copy-col">
          <h1 className="page-title">You bring the model.</h1>
          <p className="lede">
            Engines connect from the notebook picker. Secrets stay in each CLI or local server. Chat and Studio wait until one brain is ready.
          </p>
        </div>
        <ul className="engine-grid">
          {engines.map((engine) => (
            <li key={engine.name}>
              <strong>{engine.name}</strong>
              <em>{engine.kind}</em>
            </li>
          ))}
        </ul>
      </div>
    </PageFrame>
  );
}
