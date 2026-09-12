import { PageFrame } from "@/components/SiteShell";

export default function QuizPage() {
  return (
    <PageFrame kicker="quiz">
      <article className="doc">
        <h1 className="page-title">check what you just read</h1>
        <p className="lede">
          quiz builds questions from the selected sources so you can answer them in the notebook, then see what you missed.
        </p>
        <h2>how to generate one</h2>
        <p>
          select sources, open studio, choose quiz. the artifact is interactive: work through items in the modal. json from the brain is cleaned before it is saved, so a fenced code block should not break the viewer.
        </p>
        <h2>how to use it</h2>
        <p>
          run it after a reading pass or an audio overview. it is not a second lesson generator. if a question looks ungrounded, look at which sources were selected when you created it.
        </p>
      </article>
    </PageFrame>
  );
}
