import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { getPublicEnv } from "@/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Makes relative canonical / Open Graph URLs absolute (per-site metadata uses /site/[slug]).
  metadataBase: new URL(getPublicEnv().NEXT_PUBLIC_APP_URL),
  title: "Loriyum",
  description:
    "Owner-in-the-loop AI website builder: a site whose chatbot only answers from facts you approved.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Marketing + dashboard are dark-only for now; published sites get per-template themes (Phase 2+).
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
