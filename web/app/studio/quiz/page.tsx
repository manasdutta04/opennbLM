import { PageFrame } from "@/components/SiteShell";

export default function QuizPage() {
  return (
    <PageFrame kicker="Quiz">
      <div className="split">
        <div className="copy-col">
          <h1 className="page-title">Check the reading. Then prove it.</h1>
          <p className="lede">
            Quiz is generated from the sources you selected. It is for checking understanding, not for inventing a second lesson.
          </p>
        </div>
        <ol className="quiz-sheet">
          <li>
            <span>01</span>
            <p>What claim does the source actually make?</p>
          </li>
          <li>
            <span>02</span>
            <p>Which detail would change the conclusion?</p>
          </li>
          <li>
            <span>03</span>
            <p>Say it back without the original wording.</p>
          </li>
        </ol>
      </div>
    </PageFrame>
  );
}
