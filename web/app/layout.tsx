import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

// Three faces, matching max-nudelman.github.io. Each has a distinct job: serif
// for display, Inter for reading, Plex Mono for anything numeric. See DESIGN.md.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const DESCRIPTION: string =
  "How many settled bets it takes to tell a sharp bettor from a lucky one, and what acting on it costs. Real market prices, simulated accounts, twelve figures.";

// This page ships to two URLs on one domain, so one of them has to be declared
// canonical or search engines treat the pair as duplicated content. The
// portfolio copy wins, because that is the one linked from the case study and
// listed in the sitemap.
const CANONICAL: string = "https://max-nudelman.github.io/demos/stake-factor/";

export const metadata: Metadata = {
  metadataBase: new URL("https://max-nudelman.github.io"),
  title: "Stake Factor",
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: "Stake Factor",
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "Max Nudelman",
    type: "article",
    images: [{ url: "/assets/img/cards/stake-factor.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Stake Factor", description: DESCRIPTION },
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} ${plexMono.variable}`}
    >
      <body className="bg-background font-sans text-foreground">{children}</body>
    </html>
  );
}
