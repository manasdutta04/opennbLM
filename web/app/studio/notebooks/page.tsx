import { PageFrame } from "@/components/SiteShell";

export default function NotebooksPage() {
  return (
    <PageFrame kicker="notebooks">
      <article className="doc">
        <h1 className="page-title">one notebook per subject</h1>
        <p className="lede">
          a notebook is the unit of work: sources on one side, grounded chat in the middle, studio from the same selection.
        </p>
        <h2>create one</h2>
        <p>
          from home, create a notebook. you can rename it. after a guide is generated, the app may rename it from the topic. removing a notebook deletes that workspace on this machine.
        </p>
        <h2>sources</h2>
        <p>
          add pdfs, web or youtube urls, or pasted text. select which sources are in play before you ask a question. retrieval stays on the excerpts the desktop process indexed for that notebook.
        </p>
        <h2>chat and studio</h2>
        <p>
          chat uses the connected teaching brain and the selected sources. studio tools write artifacts back into the notebook so you can reopen a quiz or overview later. memory lists notebooks alongside teaching notes.
        </p>
        <p>
          while a notebook is open, memory, settings, and the theme control stay on home. the notebook has its own toolbar.
        </p>
      </article>
    </PageFrame>
  );
}
