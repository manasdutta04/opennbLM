import { PageFrame } from "@/components/SiteShell";

export default function PrivacyPage() {
  return (
    <PageFrame kicker="privacy">
      <article className="doc">
        <h1 className="page-title">what stays on your machine</h1>
        <p className="lede">
          the desktop app stores notebooks, sources, chats, notes, and generated audio in its local data folder. this website is static and does not receive those files.
        </p>
        <h2>no mailing list</h2>
        <p>
          we do not collect an email address on these pages. download sends you to github. talk to us opens github issues.
        </p>
        <h2>when something leaves the machine</h2>
        <ul>
          <li>you connect a cloud teaching brain (claude, codex, gemini, opencode). that vendor’s terms apply to the excerpts you send.</li>
          <li>if you choose remote voice, audio overview sends speech requests to the public rumik-ai space. local voice stays on this pc.</li>
        </ul>
        <h2>learner memory</h2>
        <p>
          teaching notes are local. you can forget a note or clear learner memory in the app. clearing notes does not delete conversations.
        </p>
      </article>
    </PageFrame>
  );
}
