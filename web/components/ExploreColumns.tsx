import Link from "next/link";
import { EXPLORE } from "@/lib/nav";

export function ExploreColumns() {
  return (
    <>
      {EXPLORE.map((group) => (
        <nav key={group.id} className="col explore-desktop" aria-label={group.title}>
          <h2 className="col-title">{group.title}</h2>
          <ul className="link-list">
            {group.links.map((link) => (
              <li key={link.href}>
                {link.external ? (
                  <a href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ) : (
                  <Link href={link.href}>{link.label}</Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </>
  );
}
