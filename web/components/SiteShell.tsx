import Link from "next/link";
import { LINKS } from "@/lib/links";
import { SmoothLoopVideo } from "./SmoothLoopVideo";

export function BrandLockup({ href }: { href?: string }) {
  const name = <p className="brand-name">opennbLM</p>;
  if (href) {
    return (
      <Link href={href} className="brand-lockup" aria-label="opennbLM home">
        {name}
      </Link>
    );
  }
  return <div className="brand-lockup">{name}</div>;
}

export function SiteFooterBar() {
  return (
    <div className="footer-bottom">
      <div className="socials">
        <a href={LINKS.repo} aria-label="GitHub" target="_blank" rel="noreferrer">
          <GitHubIcon />
        </a>
        <a href={LINKS.twitter} aria-label="Twitter" target="_blank" rel="noreferrer">
          <TwitterIcon />
        </a>
      </div>
      <nav className="legal" aria-label="Legal">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/docs">Docs</Link>
      </nav>
    </div>
  );
}

export function PageFrame({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <SiteShell>
      <div className="page-head">
        <BrandLockup href="/" />
        <p className="page-kicker">{kicker}</p>
      </div>
      <div className="page-body">{children}</div>
    </SiteShell>
  );
}

export function SiteShell({
  children,
  video = false,
}: {
  children: React.ReactNode;
  video?: boolean;
}) {
  return (
    <footer className={video ? "site-footer" : "site-footer site-footer-plain"}>
      {video ? <SmoothLoopVideo /> : null}
      <div className="footer-inner">
        {children}
        <SiteFooterBar />
      </div>
    </footer>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.2A9.8 9.8 0 0 0 2.2 12.1c0 4.37 2.84 8.08 6.77 9.39.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.76.6-3.34-1.33-3.34-1.33-.45-1.16-1.1-1.47-1.1-1.47-.9-.62.07-.61.07-.61 1 .07 1.52 1.03 1.52 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.2-.25-4.52-1.11-4.52-4.93 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.83-2.32 4.68-4.53 4.93.36.31.68.92.68 1.86 0 1.34-.01 2.42-.01 2.75 0 .26.18.59.69.48A9.81 9.81 0 0 0 21.8 12 9.8 9.8 0 0 0 12 2.2Z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.3 4h2.7l-5.85 6.68L21 20h-4.55l-3.56-4.66L8.7 20H6l6.25-7.14L4.4 4h4.62l3.22 4.22L17.3 4Zm-.94 14.4h1.5L8.55 5.52H7.02l9.34 12.88Z" />
    </svg>
  );
}
