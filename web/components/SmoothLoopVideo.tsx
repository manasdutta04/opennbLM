"use client";

import { useEffect, useRef, useState } from "react";

export const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260901_122529_931c22c8-8d2d-47c0-ad51-b97f56a91e42.mp4";
export const POSTER_SRC =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/4f690bd1-881a-4192-82f2-d714d34c8fb9.png";

const FADE_SECONDS = 1.05;

export function SmoothLoopVideo() {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);
  const swapping = useRef(false);
  const [front, setFront] = useState<"a" | "b">("a");

  useEffect(() => {
    const frontEl = front === "a" ? aRef.current : bRef.current;
    const backEl = front === "a" ? bRef.current : aRef.current;
    if (!frontEl || !backEl) return;

    swapping.current = false;

    const swap = () => {
      if (swapping.current) return;
      swapping.current = true;
      backEl.currentTime = 0;
      void backEl.play();
      setFront((current) => (current === "a" ? "b" : "a"));
    };

    const onTime = () => {
      const duration = frontEl.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      if (duration - frontEl.currentTime <= FADE_SECONDS) swap();
    };

    frontEl.addEventListener("timeupdate", onTime);
    frontEl.addEventListener("ended", swap);
    return () => {
      frontEl.removeEventListener("timeupdate", onTime);
      frontEl.removeEventListener("ended", swap);
    };
  }, [front]);

  return (
    <div className="footer-media" aria-hidden="true">
      <video
        ref={aRef}
        className={`footer-bg ${front === "a" ? "is-front" : "is-back"}`}
        autoPlay
        muted
        playsInline
        preload="auto"
        poster={POSTER_SRC}
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>
      <video
        ref={bRef}
        className={`footer-bg ${front === "b" ? "is-front" : "is-back"}`}
        muted
        playsInline
        preload="auto"
        poster={POSTER_SRC}
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>
    </div>
  );
}
