import Link from "next/link";
import { CraftCredit } from "@/components/CraftCredit";
import { BrandLockup, SiteShell } from "@/components/SiteShell";
import { DownloadCue } from "@/components/DownloadCue";
import { LINKS } from "@/lib/links";

export default function HomePage() {
  return (
    <SiteShell video>
      <div className="footer-grid">
        <div className="brand">
          <BrandLockup />
          <p className="brand-blurb">study your own files in a notebook. ask a model you already use. studio can speak, map, or quiz that material.</p>
          <CraftCredit />
        </div>

        <nav className="col" aria-label="studio">
          <h2 className="col-title">studio</h2>
          <ul className="link-list">
            <li><Link href="/studio/notebooks">notebooks</Link></li>
            <li><Link href="/studio/audio-overview">audio overview</Link></li>
            <li><Link href="/studio/mind-map">mind map</Link></li>
            <li><Link href="/studio/infographic">infographic</Link></li>
            <li><Link href="/studio/quiz">quiz</Link></li>
            <li><Link href="/studio/flashcards">flashcards</Link></li>
            <li><Link href="/studio/slides">slides</Link></li>
          </ul>
        </nav>

        <nav className="col" aria-label="setup">
          <h2 className="col-title">setup</h2>
          <ul className="link-list">
            <li><Link href="/setup">setup guide</Link></li>
            <li><Link href="/brain">teaching brain</Link></li>
            <li><Link href="/voice">voice engine</Link></li>
            <li><Link href="/docs">docs</Link></li>
            <li><Link href="/architecture">architecture</Link></li>
          </ul>
        </nav>

        <nav className="col" aria-label="source">
          <h2 className="col-title">source</h2>
          <ul className="link-list">
            <li><Link href="/download">windows installer</Link></li>
            <li><a href={LINKS.releases} target="_blank" rel="noreferrer">latest release</a></li>
            <li><a href={LINKS.repo} target="_blank" rel="noreferrer">view source</a></li>
            <li><a href={LINKS.issues} target="_blank" rel="noreferrer">talk to us</a></li>
          </ul>
        </nav>

        <div className="aside">
          <h2 className="col-title">get the build</h2>
          <p>windows x64 installer. after install, setup widgets walk through this pc, a teaching brain, and optional voice.</p>
          <DownloadCue className="download-row" />
        </div>
      </div>
    </SiteShell>
  );
}
