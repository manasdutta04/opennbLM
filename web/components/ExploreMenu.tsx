"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { EXPLORE } from "@/lib/nav";

export function ExploreMenu() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      toggleRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className={open ? "explore-toggle is-open" : "explore-toggle"}
        aria-expanded={open}
        aria-controls="explore-sheet"
        onClick={() => setOpen(true)}
      >
        <span className="sr-only">studio, setup, and source</span>
        <span className="explore-icon" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>

      {open ? (
        <div
          className="explore-layer"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="explore-sheet"
            id="explore-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="explore-head">
              <p id={titleId} className="explore-title">
                explore
              </p>
              <button
                ref={closeRef}
                type="button"
                className="explore-close"
                onClick={() => setOpen(false)}
              >
                close
              </button>
            </header>

            <div className="explore-cols">
              {EXPLORE.map((group) => (
                <nav key={group.id} className="col" aria-label={group.title}>
                  <h2 className="col-title">{group.title}</h2>
                  <ul className="link-list">
                    {group.links.map((link) => (
                      <li key={link.href}>
                        {link.external ? (
                          <a href={link.href} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
                            {link.label}
                          </a>
                        ) : (
                          <Link href={link.href} onClick={() => setOpen(false)}>
                            {link.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
