import { PageFrame } from "@/components/SiteShell";

export default function ArchitecturePage() {
  return (
    <PageFrame kicker="architecture">
      <article className="doc">
        <h1 className="page-title">how the desktop app is put together</h1>
        <p className="lede">
          opennbLM is an electron app. ui, privileges, and voice stay in separate processes so the renderer never talks to node, sqlite, or rumik directly.
        </p>

        <div className="arch" style={{ flex: "none", marginBottom: "1.5rem" }}>
          <div className="arch-row">
            <div className="arch-node">
              <strong>renderer</strong>
              <span>react only</span>
            </div>
            <i className="arch-line" />
            <div className="arch-node">
              <strong>preload</strong>
              <span>typed ipc</span>
            </div>
            <i className="arch-line" />
            <div className="arch-node">
              <strong>desktop</strong>
              <span>main process</span>
            </div>
          </div>
        </div>

        <h2>boundaries</h2>
        <ul>
          <li>
            <strong>desktop</strong> owns windows, lifecycle, filesystem paths, and ipc handlers. it starts and stops local services and rumik.
          </li>
          <li>
            <strong>preload</strong> is the only bridge. it exposes a narrow, typed api on <code>window.opennbLM</code>.
          </li>
          <li>
            <strong>renderer</strong> is react. it must not import node or electron apis.
          </li>
          <li>
            <strong>packages/</strong> hold contracts, memory, providers, teaching, notebooks, and rumik. dependencies point inward through interfaces.
          </li>
        </ul>

        <h2>data</h2>
        <p>
          conversations and learner notes live in sqlite via <code>sql.js</code> (wasm), stored under the platform user-data path. the renderer never opens the database. credentials for cloud clis stay with those tools; the app does not keep a settings page of pasted api keys for the current engines.
        </p>

        <h2>teaching and voice</h2>
        <p>
          the teaching engine sits between the selected brain and what you read or hear. it asks for a structured plan, renders lesson text, and leaves wav synthesis to rumik. rumik is either local cuda inference or the built-in public space fallback. the renderer only receives sanitized status and audio paths.
        </p>

        <h2>packaging</h2>
        <p>
          windows ci builds an nsis installer. app code goes in an asar. optional rumik resources can live under extra resources. mutable state — the database, audio, preferences — stays in user data, not in the install directory.
        </p>

        <h2>workspace packages</h2>
        <ul className="arch-packages">
          <li>contracts</li>
          <li>engine-runtime</li>
          <li>llm-providers</li>
          <li>memory</li>
          <li>local-services</li>
          <li>notebook-runtime</li>
          <li>teaching-engine</li>
          <li>rumik-runtime</li>
        </ul>
      </article>
    </PageFrame>
  );
}
