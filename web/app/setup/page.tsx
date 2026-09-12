import { PageFrame } from "@/components/SiteShell";
import { LINKS } from "@/lib/links";

export default function SetupPage() {
  return (
    <PageFrame kicker="Setup Guide">
      <ol className="rail">
        <li>
          <span>01</span>
          <div>
            <h2>Install</h2>
            <p>Run the Windows x64 NSIS installer and open opennbLM.</p>
            <a className="text-link" href={LINKS.download}>Download v0.1.0 →</a>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <h2>Connect a brain</h2>
            <p>From a notebook, use Connect brain. No API keys are pasted into Settings.</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <h2>Add sources</h2>
            <p>PDFs, links, or pasted text. Select them, then ask or open Studio.</p>
          </div>
        </li>
      </ol>
    </PageFrame>
  );
}
