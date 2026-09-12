import type { Metadata, Viewport } from "next";
import { LINKS } from "@/lib/links";
import "./globals.css";

const title = "opennbLM — windows study app";
const description =
  "study your own files in a notebook. ask a model you already use. studio can speak, map, or quiz that material.";

export const metadata: Metadata = {
  metadataBase: new URL(LINKS.home),
  title,
  description,
  applicationName: "opennbLM",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon.png" }] },
  alternates: { canonical: LINKS.home },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: LINKS.home,
    siteName: "opennbLM",
    title,
    description,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "opennbLM — study your own files in a notebook",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
    creator: "@manasdutta04",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Poppins:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
