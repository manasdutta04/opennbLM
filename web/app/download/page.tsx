import { PageFrame } from "@/components/SiteShell";
import { LINKS } from "@/lib/links";

export default function DownloadPage() {
  return (
    <PageFrame kicker="Download">
      <div className="split">
        <div className="copy-col">
          <h1 className="page-title">Windows, from GitHub.</h1>
          <p className="lede">x64 NSIS installer. No store. A tag publishes a versioned build; main refreshes the latest-windows prerelease.</p>
          <a className="download-row" href={LINKS.download}>
            <span>opennbLM-0.1.0-win-x64.exe</span>
            <span className="download-go" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </span>
          </a>
        </div>
        <ol className="rail compact">
          <li>
            <span>01</span>
            <div>
              <h2>Run the installer</h2>
              <p>Then launch opennbLM from the Start menu.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h2>Connect a brain</h2>
              <p>The home banner stays until that is done. Voice is optional.</p>
            </div>
          </li>
        </ol>
      </div>
    </PageFrame>
  );
}
