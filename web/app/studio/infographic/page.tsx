import { PageFrame } from "@/components/SiteShell";

export default function InfographicPage() {
  return (
    <PageFrame kicker="infographic">
      <article className="doc">
        <h1 className="page-title">one sheet from the sources</h1>
        <p className="lede">
          infographic is a poster layout: a title, short claims, and optional figures the brain was asked to keep from your selection.
        </p>
        <h2>how to generate one</h2>
        <p>
          select sources, open studio, choose infographic. the artifact opens in a wide modal so the poster can be read as a page, not a narrow column of chat.
        </p>
        <h2>what to expect</h2>
        <p>
          it will only be as grounded as the excerpts you selected and the teaching brain you connected. treat numbers as coming from that pass, and check them against the original pdf or notes if you need to cite them.
        </p>
      </article>
    </PageFrame>
  );
}
