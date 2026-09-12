import Link from "next/link";
import { BrandLockup, SiteShell } from "@/components/SiteShell";
import { LINKS } from "@/lib/links";

export default function HomePage() {
  return (
    <SiteShell video>
      <div className="footer-grid">
        <div className="brand">
          <BrandLockup />
          <p className="brand-blurb">A native, local-first companion for notebooks, Studio tools, and Rumik voice.</p>
        </div>

        <nav className="col" aria-label="Studio">
          <h2 className="col-title">Studio</h2>
          <ul className="link-list">
            <li><Link href="/studio/notebooks">Notebooks</Link></li>
            <li><Link href="/studio/audio-overview">Audio Overview</Link></li>
            <li><Link href="/studio/mind-map">Mind Map</Link></li>
            <li><Link href="/studio/infographic">Infographic</Link></li>
            <li><Link href="/studio/quiz">Quiz</Link></li>
            <li><Link href="/studio/flashcards">Flashcards</Link></li>
            <li><Link href="/studio/slides">Slides</Link></li>
          </ul>
        </nav>

        <nav className="col" aria-label="Setup">
          <h2 className="col-title">Setup</h2>
          <ul className="link-list">
            <li><Link href="/setup">Setup Guide</Link></li>
            <li><Link href="/brain">Teaching Brain</Link></li>
            <li><Link href="/voice">Voice Engine</Link></li>
            <li><Link href="/docs">Docs</Link></li>
            <li><Link href="/architecture">Architecture</Link></li>
          </ul>
        </nav>

        <nav className="col" aria-label="Source">
          <h2 className="col-title">Source</h2>
          <ul className="link-list">
            <li><Link href="/download">Windows Installer</Link></li>
            <li><a href={LINKS.releases} target="_blank" rel="noreferrer">Latest Release</a></li>
            <li><a href={LINKS.repo} target="_blank" rel="noreferrer">View Source</a></li>
            <li><a href={LINKS.issues} target="_blank" rel="noreferrer">Talk To Us</a></li>
          </ul>
        </nav>

        <div className="aside">
          <h2 className="col-title">Get The Build</h2>
          <p>Windows x64 installer from GitHub Releases. No account. No store listing.</p>
          <a className="download-row" href={LINKS.download}>
            <span>Download for Windows</span>
            <span className="download-go" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </span>
          </a>
        </div>
      </div>
    </SiteShell>
  );
}
