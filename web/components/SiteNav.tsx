import Link from "next/link";

const REPO = "https://github.com/manasdutta04/opennbLM";
const RELEASES = "https://github.com/manasdutta04/opennbLM/releases/latest";

export function SiteNav() {
  return (
    <nav className="nav">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden />
        opennbLM
      </Link>
      <div className="nav-links">
        <Link href="/docs">Docs</Link>
        <a href={REPO} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a className="btn btn-primary" href={RELEASES}>
          Download
        </a>
      </div>
    </nav>
  );
}
