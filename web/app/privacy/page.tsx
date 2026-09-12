import { PageFrame } from "@/components/SiteShell";

export default function PrivacyPage() {
  return (
    <PageFrame kicker="Privacy">
      <div className="info-grid info-grid-2">
        <article className="info-card">
          <h2>Local by default</h2>
          <p>Notebooks, sources, notes, chats, and learner memory stay in this app’s local data folder on your machine.</p>
        </article>
        <article className="info-card">
          <h2>No account</h2>
          <p>This site and the desktop app do not collect an email list. We do not ask for a phone number or location.</p>
        </article>
        <article className="info-card">
          <h2>When the cloud is used</h2>
          <p>Only if you connect a cloud teaching brain, or if Audio Overview uses the Rumik remote fallback.</p>
        </article>
        <article className="info-card">
          <h2>This website</h2>
          <p>The marketing pages are static. Download sends you to GitHub Releases. Talk to us opens GitHub Issues.</p>
        </article>
      </div>
    </PageFrame>
  );
}
