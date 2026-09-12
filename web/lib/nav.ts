import { LINKS } from "@/lib/links";

export type ExploreLink = {
  href: string;
  label: string;
  external?: boolean;
};

export type ExploreGroup = {
  id: string;
  title: string;
  links: ExploreLink[];
};

export const EXPLORE: ExploreGroup[] = [
  {
    id: "studio",
    title: "studio",
    links: [
      { href: "/studio/notebooks", label: "notebooks" },
      { href: "/studio/audio-overview", label: "audio overview" },
      { href: "/studio/mind-map", label: "mind map" },
      { href: "/studio/infographic", label: "infographic" },
      { href: "/studio/quiz", label: "quiz" },
      { href: "/studio/flashcards", label: "flashcards" },
      { href: "/studio/slides", label: "slides" },
    ],
  },
  {
    id: "setup",
    title: "setup",
    links: [
      { href: "/setup", label: "setup guide" },
      { href: "/brain", label: "teaching brain" },
      { href: "/voice", label: "voice engine" },
      { href: "/docs", label: "docs" },
      { href: "/architecture", label: "architecture" },
    ],
  },
  {
    id: "source",
    title: "source",
    links: [
      { href: "/download", label: "windows installer" },
      { href: LINKS.releases, label: "latest release", external: true },
      { href: LINKS.repo, label: "view source", external: true },
      { href: LINKS.issues, label: "talk to us", external: true },
    ],
  },
];
