import { PageFrame } from "@/components/SiteShell";

export default function FlashcardsPage() {
  return (
    <PageFrame kicker="flashcards">
      <article className="doc">
        <h1 className="page-title">prompt on the front, answer on the back</h1>
        <p className="lede">
          flashcards are short pairs generated from the selected sources. flip through them in the notebook; they stay with that workspace.
        </p>
        <h2>how to generate them</h2>
        <p>
          select sources, open studio, choose flashcards. cards are meant to be brief — a term, a claim, or a definition — not a paragraph of lecture.
        </p>
        <h2>how to use them</h2>
        <p>
          use them for recall after you have already read or heard the material. if a card is vague, regenerate with a tighter source selection.
        </p>
      </article>
    </PageFrame>
  );
}
