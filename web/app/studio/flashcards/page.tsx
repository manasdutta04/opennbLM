import { PageFrame } from "@/components/SiteShell";

export default function FlashcardsPage() {
  return (
    <PageFrame kicker="Flashcards">
      <div className="split">
        <div className="copy-col">
          <h1 className="page-title">Front. Back. Nothing else.</h1>
          <p className="lede">
            Cards stay short. One prompt, one answer, drawn from the notebook so recall stays tied to what you added.
          </p>
        </div>
        <div className="cards-fan" aria-hidden="true">
          <div className="flash back-card">Answer</div>
          <div className="flash front-card">Prompt</div>
        </div>
      </div>
    </PageFrame>
  );
}
