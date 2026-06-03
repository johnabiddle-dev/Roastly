import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roastly — Get Brutally Roasted by AI",
  description: "Upload a photo. Get destroyed by Grok AI. Share the pain with your friends. Free to try (3 roasts), then buy packs that unlock 10 roasts per day.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "Roastly — Brutal AI Roasts",
    description: "Upload a photo. Get destroyed by Grok. The most savage roasts on the internet. Free to try, then cheap packs.",
    images: [
      {
        url: "https://roastly-app.vercel.app/og.png",
      },
    ],
    siteName: "Roastly",
  },
  twitter: {
    card: "summary_large_image",
    title: "Roastly — Brutal AI Roasts",
    description: "Upload a photo. Get destroyed by Grok. Share the pain.",
  },
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
      <body className="min-h-full flex flex-col">{children}<Analytics /><SpeedInsights /></body>
    </html>
  );
}
