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
  description: "Upload screenshots, photos, texts, X posts, memes, pets — anything. Get elite brutal/funny roasts from Grok. Beautiful shareable cards in seconds. Free 3 roasts, then cheap packs.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "Roastly — Roast Anything with Grok AI",
    description: "Roast literally anything with Grok AI — screenshots, photos, convos, X posts, pets, food. Get viral cards instantly. Free to start.",
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
    description: "Upload anything. Grok roasts it. Download the beautiful card and share. The best roasting app.",
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
