import { PageFrame } from "@/components/SiteShell";

export default function SlidesPage() {
  return (
    <PageFrame kicker="Slides">
      <div className="split">
        <div className="copy-col">
          <h1 className="page-title">A sequence you can stand in front of.</h1>
          <p className="lede">
            Slides are a deck, not a scroll. Step through the argument the brain extracted from the selected sources.
          </p>
        </div>
        <div className="deck" aria-hidden="true">
          <div className="slide s3">03</div>
          <div className="slide s2">02</div>
          <div className="slide s1">
            <em>01</em>
            <b />
            <b className="short" />
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
