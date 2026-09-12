import { PageFrame } from "@/components/SiteShell";

export default function VoicePage() {
  return (
    <PageFrame kicker="voice engine">
      <article className="doc">
        <h1 className="page-title">choose remote or local</h1>
        <p className="lede">
          after you install the windows .exe, open settings → voice engine. you do not clone this repository or start a rumik server.
        </p>

        <h2>remote (https) — default after the .exe</h2>
        <p>
          the installed app already knows the public rumik-ai space address and calls it over https. that space is a hosted model, not something you run. audio overview sends text from your notebook and writes the wav files into your user-data folder.
        </p>
        <p>
          a hugging face token is <strong>not required</strong> to start. anonymous use works until the public space hits its daily zerogpu quota. if that happens, paste your own token in settings → voice engine. the token stays on that computer. you still do not clone the repo.
        </p>
        <div className="note">
          <strong>you do not start a local https server</strong>
          “remote” means the desktop app calls hugging face. it does not mean you host rumik yourself.
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
          the public space uses zerogpu and a daily anonymous quota. if the quota is exhausted, settings shows the error from that host. paste a hugging face token there, wait for quota to reset, or switch to local on an nvidia gpu. chat and the other studio tools still work.
        </p>

        <h2>what you hear</h2>
        <p>
          speakers are ira, aisha, siya, and zoya. pace is steady. accent follows the language of the line. the ui does not offer tone, accent, or pace pickers. debate uses a challenger and an advocate on alternating turns.
        </p>
      </article>
    </PageFrame>
  );
}
