import { CraftCredit } from "@/components/CraftCredit";
import { ExploreColumns } from "@/components/ExploreColumns";
import { BrandLockup, SiteShell } from "@/components/SiteShell";
import { DownloadCue } from "@/components/DownloadCue";

export default function HomePage() {
  return (
    <SiteShell video>
      <div className="footer-grid">
        <div className="brand">
          <BrandLockup />
          <p className="brand-blurb">study your own files in a notebook. ask a model you already use. studio can speak, map, or quiz that material.</p>
          <CraftCredit />
        </div>

        <ExploreColumns />

        <div className="aside">
          <h2 className="col-title">get the build</h2>
          <p>windows x64 installer. after install, setup widgets walk through this pc, a teaching brain, and optional voice.</p>
          <DownloadCue className="download-row" />
        </div>
      </div>
    </SiteShell>
  );
}
