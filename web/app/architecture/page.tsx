import { PageFrame } from "@/components/SiteShell";

export default function ArchitecturePage() {
  return (
    <PageFrame kicker="Architecture">
      <div className="arch">
        <div className="arch-row">
          <div className="arch-node">
            <strong>Renderer</strong>
            <span>React UI only</span>
          </div>
          <i className="arch-line" />
          <div className="arch-node">
            <strong>Preload</strong>
            <span>Typed bridge</span>
          </div>
          <i className="arch-line" />
          <div className="arch-node">
            <strong>Desktop</strong>
            <span>Main · IPC · life</span>
          </div>
        </div>
        <p className="arch-note">Dependencies flow inward. The renderer never sees Node, SQLite, or Rumik processes.</p>
        <ul className="arch-packages">
          <li>contracts</li>
          <li>engine-runtime</li>
          <li>memory</li>
          <li>teaching-engine</li>
          <li>rumik-runtime</li>
          <li>local-services</li>
        </ul>
      </div>
    </PageFrame>
  );
}
