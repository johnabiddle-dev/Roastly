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
  title: "Roastly — Roast anything, drop it in the chat",
  description: "Upload a photo. Get 5 Grok burns. Send the card.",
  applicationName: "Roastly",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "Roastly — Roast anything, drop it in the chat",
    description: "Upload a photo. Get 5 Grok burns. Send the card.",
    url: "https://roastly-app.vercel.app",
    images: [
      {
        url: "https://roastly-app.vercel.app/og.jpg",
        width: 1080,
        height: 1920,
        alt: "Roastly roast card",
      },
    ],
    siteName: "Roastly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Roastly — Roast anything, drop it in the chat",
    description: "Upload a photo. Get 5 Grok burns. Send the card.",
    images: ["https://roastly-app.vercel.app/og.jpg"],
  },
  appleWebApp: {
    capable: true,
    title: "Roastly",
    statusBarStyle: "black-translucent",
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
