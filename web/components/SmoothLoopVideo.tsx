"use client";

import { useEffect, useRef, useState } from "react";

export const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260901_122529_931c22c8-8d2d-47c0-ad51-b97f56a91e42.mp4";
export const POSTER_SRC =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/4f690bd1-881a-4192-82f2-d714d34c8fb9.png";

const FADE_SECONDS = 0.4;
const FADE_MS = FADE_SECONDS * 1000;

export function SmoothLoopVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fading = useRef(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let raf = 0;
    let fadeTimer = 0;

    const seekStart = () =>
      new Promise<void>((resolve) => {
        const done = () => {
          el.removeEventListener("seeked", done);
          resolve();
        };
        el.addEventListener("seeked", done);
        el.currentTime = 0;
      });

    const restart = async () => {
      el.pause();
      await seekStart();
      try {
        await el.play();
      } catch {
        // Autoplay can be blocked after a tab hide; the next gesture will resume.
      }
      setHidden(false);
      requestAnimationFrame(() => {
        fading.current = false;
      });
    };

    const beginFade = () => {
      if (fading.current) return;
      fading.current = true;
      setHidden(true);
      window.clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => {
        void restart();
      }, FADE_MS + 40);
    };

    const tick = () => {
      const duration = el.duration;
      if (
        Number.isFinite(duration)
        && duration > FADE_SECONDS * 2
        && duration - el.currentTime <= FADE_SECONDS
      ) {
        beginFade();
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    el.addEventListener("ended", beginFade);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fadeTimer);
      el.removeEventListener("ended", beginFade);
    };
  }, []);

  return (
    <div className="footer-media" aria-hidden="true">
      <img className="footer-poster" src={POSTER_SRC} alt="" />
      <video
        ref={videoRef}
        className={`footer-bg ${hidden ? "is-hidden" : "is-front"}`}
        autoPlay
        muted
        playsInline
        preload="auto"
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>
    </div>
  );
}
