import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roastly — Roast Anything with Grok AI",
  description: "Upload any screenshot, photo, text convo, meme — whatever. Get brutally roasted (or uplifted) by Grok. Share as beautiful cards. Free to try (3 roasts), then cheap packs that unlock 10 roasts/day + custom prompts.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "Roastly — Roast Anything with Grok AI",
    description: "Upload any screenshot, photo, text convo, meme — whatever. Get roasted by Grok. The most savage (and sometimes nicest) roasts on the internet. Free to try, then cheap packs.",
    images: [
      {
        url: "https://roastly-app.vercel.app/og.png",
      },
    ],
    siteName: "Roastly",
  },
  twitter: {
    card: "summary_large_image",
    title: "Roastly — Roast Anything with Grok AI",
    description: "Upload any screenshot or image. Get destroyed by Grok. Share the pain (or the love).",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
