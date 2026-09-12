import { PageFrame } from "@/components/SiteShell";

export default function MindMapPage() {
  return (
    <PageFrame kicker="Mind Map">
      <div className="split">
        <div className="copy-col">
          <h1 className="page-title">A map that keeps its branches apart.</h1>
          <p className="lede">
            Studio builds a graph from the notebook. Leaves get width so they do not sit on top of each other. You zoom; you do not fight the layout.
          </p>
        </div>
        <svg className="map-svg" viewBox="0 0 420 220" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M210 110L110 48M210 110L110 172M210 110L310 48M210 110L310 172M110 48L48 24M110 48L48 72M310 48L372 24M310 48L372 72" />
          </g>
          <g fill="var(--cream)" stroke="currentColor" strokeWidth="1.2">
            <rect x="168" y="92" width="84" height="36" rx="8" />
            <rect x="70" y="32" width="80" height="32" rx="8" />
            <rect x="70" y="156" width="80" height="32" rx="8" />
            <rect x="270" y="32" width="80" height="32" rx="8" />
            <rect x="270" y="156" width="80" height="32" rx="8" />
            <rect x="12" y="10" width="64" height="26" rx="7" />
            <rect x="12" y="58" width="64" height="26" rx="7" />
            <rect x="344" y="10" width="64" height="26" rx="7" />
            <rect x="344" y="58" width="64" height="26" rx="7" />
          </g>
        </svg>
      </div>
    </PageFrame>
  );
}
