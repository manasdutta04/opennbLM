import { PageFrame } from "@/components/SiteShell";

export default function SlidesPage() {
  return (
    <PageFrame kicker="slides">
      <article className="doc">
        <h1 className="page-title">a deck you can step through</h1>
        <p className="lede">
          slides turn the selected sources into an ordered sequence: title, points, next slide. you move forward one beat at a time.
        </p>
        <h2>how to generate them</h2>
        <p>
          select sources, open studio, choose slides. the viewer is a deck, not a scroll of the whole script. reopen the artifact from the notebook when you need the same sequence again.
        </p>
        <h2>how to use them</h2>
        <p>
          useful when you want to teach the material back or walk someone else through it. keep the source selection tight if you want a short deck.
        </p>
      </article>
    </PageFrame>
  );
}
