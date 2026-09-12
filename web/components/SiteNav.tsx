import Link from "next/link";
import { BrandMark } from "./BrandMark";

const REPO = "https://github.com/manasdutta04/opennbLM";
const RELEASES = "https://github.com/manasdutta04/opennbLM/releases/latest";

export function SiteNav() {
  return (
    <nav className="nav">
      <Link href="/" className="brand">
        <BrandMark className="brand-mark" />
        opennbLM
      </Link>
      <div className="nav-links">
        <Link href="/docs">docs</Link>
        <a href={REPO} target="_blank" rel="noreferrer">
          github
        </a>
        <a className="btn btn-primary" href={RELEASES}>
          download
        </a>
      </div>
    </nav>
  );
}
