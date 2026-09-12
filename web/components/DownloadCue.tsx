"use client";

import { useState } from "react";
import { LINKS } from "@/lib/links";

export function DownloadCue({
  className,
  label = "download for windows",
}: {
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <a
        className={className}
        href={LINKS.download}
        onClick={() => setOpen(true)}
      >
        <span>{label}</span>
        <span className="download-go" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h15M13 6l6 6-6 6" />
          </svg>
        </span>
      </a>
      {open ? (
        <div className="cue-layer" role="dialog" aria-modal="true" aria-labelledby="cue-title">
          <div className="cue-card">
            <p id="cue-title" className="cue-title">
              after the installer finishes
            </p>
            <ol>
              <li>run the .exe, then open opennbLM from the start menu.</li>
              <li>create a notebook, click connect brain, and pick a model you already use.</li>
              <li>add a pdf or notes, then ask or open studio.</li>
            </ol>
            <p className="cue-sub">if it will not start</p>
            <ul>
              <li>windows may block an unsigned build: more info, then run anyway. chat stays empty until a teaching brain is connected.</li>
            </ul>
            <button type="button" className="cue-close" onClick={() => setOpen(false)}>
              close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
