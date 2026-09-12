import type { CSSProperties } from "react";
import { PageFrame } from "@/components/SiteShell";

export default function AudioOverviewPage() {
  return (
    <PageFrame kicker="Audio Overview">
      <div className="split">
        <div className="copy-col">
          <h1 className="page-title">Hear the sources, not a leftover summary.</h1>
          <p className="lede">
            Audio Overview turns selected material into a spoken pass. Debate is two seats: a challenger and an advocate, taking turns.
          </p>
        </div>
        <div className="wave-stage" aria-hidden="true">
          <div className="lane">
            <em>Ira</em>
            <div className="bars">
              {Array.from({ length: 18 }, (_, i) => (
                <span key={i} style={{ "--h": `${28 + ((i * 17) % 52)}%` } as CSSProperties} />
              ))}
            </div>
          </div>
          <div className="lane">
            <em>Aisha</em>
            <div className="bars">
              {Array.from({ length: 18 }, (_, i) => (
                <span key={i} style={{ "--h": `${22 + ((i * 13) % 58)}%` } as CSSProperties} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
