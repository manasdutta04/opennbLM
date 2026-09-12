import { PageFrame } from "@/components/SiteShell";

export default function AudioOverviewPage() {
  return (
    <PageFrame kicker="audio overview">
      <article className="doc">
        <h1 className="page-title">listen through the sources</h1>
        <p className="lede">
          audio overview writes a script from the selected sources, then rumik speaks it line by line and the app concatenates the wav files.
        </p>
        <h2>formats</h2>
        <ul>
          <li>
            <strong>deep dive</strong> — a longer pass through the material.
          </li>
          <li>
            <strong>brief</strong> — a short spoken summary.
          </li>
          <li>
            <strong>critique</strong> — a critical reading of what the sources claim.
          </li>
          <li>
            <strong>debate</strong> — ira as challenger, aisha as advocate, strict turn-taking, a real close.
          </li>
        </ul>
        <h2>voice</h2>
        <p>
          after a normal .exe install, settings → voice engine defaults to remote (https). switch to local there if you have cuda and want on-device speech. if a line fails mid-run, the app can keep a partial overview when enough sentences already exist. see{" "}
          <a href="/voice">voice engine</a>.
        </p>
      </article>
    </PageFrame>
  );
}
