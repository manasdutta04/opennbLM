import { PageFrame } from "@/components/SiteShell";

export default function InfographicPage() {
  return (
    <PageFrame kicker="Infographic">
      <div className="split">
        <div className="copy-col">
          <h1 className="page-title">A poster, not a chat transcript.</h1>
          <p className="lede">
            Infographic lays the ask as a single sheet: a headline, a few figures, and the claims the brain was told to keep.
          </p>
        </div>
        <div className="poster" aria-hidden="true">
          <strong>From your sources</strong>
          <div className="poster-stats">
            <b>3</b>
            <b>12</b>
            <b>1</b>
          </div>
          <div className="poster-rules">
            <i />
            <i />
            <i className="short" />
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
