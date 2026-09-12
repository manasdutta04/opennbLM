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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="currentColor">
            <path d="M67.328 67.331h60.669V128H67.328zm-67.325 0h60.669V128H.003zM67.328 0h60.669v60.669H67.328zM.003 0h60.669v60.669H.003z" />
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
