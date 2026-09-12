import { PageFrame } from "@/components/SiteShell";

export default function VoicePage() {
  return (
    <PageFrame kicker="voice engine">
      <article className="doc">
        <h1 className="page-title">choose remote or local</h1>
        <p className="lede">
          after you install the windows build, open settings → voice engine and pick one option. remote talks to the public rumik space over https. local runs rumik on this pc.
        </p>

        <h2>remote (https)</h2>
        <p>
          this is the default after a normal .exe install. no clone, no gpu, no weights. audio overview calls the public rumik-ai space and writes wav files into your user-data folder. settings shows the built-in endpoint when remote is selected.
        </p>
        <div className="note">
          <strong>you do not paste a url</strong>
          the space address is built in. developers can still override it with <code>RUMIK_REMOTE_URL</code> if they need to.
        </div>

        <h2>local (this pc)</h2>
        <p>
          choose local only if you want on-device inference. you need nvidia drivers, a cuda-capable python 3 with torch, transformers, soundfile, accelerate, and bitsandbytes, then the official <code>rumik-ai/rumik-oss-1</code> weights.
        </p>
        <ol>
          <li>open settings → voice engine and select local (this pc).</li>
          <li>copy the bind path and run the download command (or use copy command + open terminal).</li>
          <li>refresh status or restart the app. mode should read local when cuda and weights are both present.</li>
        </ol>
        <p>
          license for those weights is cc by-nc 4.0 (research / non-commercial). the model card is on hugging face.
        </p>

        <h2>when remote voice fails</h2>
        <p>
          the public space uses zerogpu and a daily anonymous quota. if the quota is exhausted, settings shows the error from that host. chat and the other studio tools still work. wait for quota to reset, or switch to local on an nvidia gpu.
        </p>

        <h2>what you hear</h2>
        <p>
          speakers are ira, aisha, siya, and zoya. pace is steady. accent follows the language of the line. the ui does not offer tone, accent, or pace pickers. debate uses a challenger and an advocate on alternating turns.
        </p>
      </article>
    </PageFrame>
  );
}
