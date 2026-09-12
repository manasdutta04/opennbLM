import { PageFrame } from "@/components/SiteShell";

export default function MindMapPage() {
  return (
    <PageFrame kicker="mind map">
      <article className="doc">
        <h1 className="page-title">see how the topic branches</h1>
        <p className="lede">
          studio asks the teaching brain for a tree of ideas, then the notebook draws it as a graph you can pan and zoom.
        </p>
        <h2>how to generate one</h2>
        <p>
          select sources in a notebook, open studio, choose mind map. the layout gives leaves enough width that they do not sit on top of each other. connection handles stay hidden. zoom controls are on the canvas.
        </p>
        <h2>what it is for</h2>
        <p>
          use it to see structure — headings, subtopics, and how they relate — not as a second chat log. you can reopen the saved artifact from the notebook.
        </p>
      </article>
    </PageFrame>
  );
}
