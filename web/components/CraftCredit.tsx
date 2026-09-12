"use client";

import { LINKS } from "@/lib/links";
import { Highlighter } from "@/components/ui/highlighter";

export function CraftCredit() {
  return (
    <p className="craft">
      A craft of{" "}
      <Highlighter action="underline" color="#FF9800">
        <a href={LINKS.site} target="_blank" rel="noreferrer">
          Manas Dutta
        </a>
      </Highlighter>{" "}
      with{" "}
      <Highlighter action="highlight" color="#87CEFA">
        <span className="craft-xiaa" tabIndex={0} data-tip="I live on Manas's computer :)">
          Xiaa
        </span>
      </Highlighter>
    </p>
  );
}
