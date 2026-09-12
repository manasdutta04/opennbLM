import Link from "next/link";
import { PageFrame } from "@/components/SiteShell";
import { LINKS } from "@/lib/links";

export default function DocsPage() {
  return (
    <PageFrame kicker="docs">
      <article className="doc">
        <h1 className="page-title">how to use opennbLM</h1>
        <p className="lede">
          these pages describe the windows app as it ships today. start with the installer, then a teaching brain, then a notebook.
        </p>
        <nav className="toc" aria-label="documentation">
          <Link href="/setup">setup guide</Link>
          <Link href="/brain">teaching brain</Link>
          <Link href="/voice">voice engine</Link>
          <Link href="/architecture">architecture</Link>
          <Link href="/studio">studio tools</Link>
          <Link href="/download">download</Link>
          <Link href="/privacy">privacy</Link>
          <Link href="/terms">terms</Link>
        </nav>

        <h2>what the app is</h2>
        <p>
          opennbLM is a desktop study workspace. you keep sources in a notebook, ask questions against the pages you selected, and generate studio outputs from the same material. the teaching model is not bundled. you connect claude, codex, gemini, opencode, ollama, or lm studio from the notebook picker.
        </p>

        <h2>first hour</h2>
        <ol>
          <li>install the windows x64 build from github releases and open the app.</li>
          <li>create a notebook. use connect brain and pick a model you can already run or sign in to.</li>
          <li>add a pdf, a link, or pasted text. select those sources before you ask a question or open studio.</li>
          <li>if you want spoken audio overviews, open settings → voice engine and choose remote (https) or local (this pc).</li>
        </ol>

        <h2>where things live</h2>
        <p>
          notebooks, chats, notes, and generated audio stay in the app data folder on this computer. the marketing site does not host your files. cloud calls happen only when you choose a cloud teaching brain, or when voice engine is set to remote.
        </p>

        <h2>source and issues</h2>
        <p>
          engineering notes are also in the repository <code>docs/</code> folder. bugs and questions go to{" "}
          <a href={LINKS.issues} target="_blank" rel="noreferrer">
            github issues
          </a>
          .
        </p>
      </article>
    </PageFrame>
  );
}
