import { PageFrame } from "@/components/SiteShell";

export default function NotebooksPage() {
  return (
    <PageFrame kicker="Notebooks">
      <div className="split">
        <div className="copy-col">
          <h1 className="page-title">One room for a subject.</h1>
          <p className="lede">
            A notebook holds sources, grounded chat, and Studio outputs together. Nothing is a separate “project” in the cloud.
          </p>
        </div>
        <div className="workspace-sketch" aria-hidden="true">
          <div className="pane">
            <span>Sources</span>
            <i />
            <i />
            <i className="short" />
          </div>
          <div className="pane pane-main">
            <span>Chat</span>
            <b />
            <b className="right" />
            <b />
          </div>
          <div className="pane">
            <span>Studio</span>
            <i />
            <i className="short" />
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
