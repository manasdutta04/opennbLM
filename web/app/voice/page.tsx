import { PageFrame } from "@/components/SiteShell";

export default function VoicePage() {
  return (
    <PageFrame kicker="Voice Engine">
      <div className="voice-split">
        <article>
          <span className="info-index">Remote</span>
          <h2>No install</h2>
          <p>Audio Overview can use the public Rumik fallback over HTTPS. Quota is best-effort.</p>
        </article>
        <div className="voice-rule" aria-hidden="true" />
        <article>
          <span className="info-index">Local</span>
          <h2>CUDA on device</h2>
          <p>Settings → Voice engine has the bind path and download command for rumik-oss-1.</p>
        </article>
        <div className="voice-rule" aria-hidden="true" />
        <article>
          <span className="info-index">Delivery</span>
          <h2>Steady pace</h2>
          <p>Accent follows language. Tone stays excited or professional. No pickers in the UI.</p>
        </article>
      </div>
    </PageFrame>
  );
}
