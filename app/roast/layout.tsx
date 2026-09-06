import type { Metadata } from "next";
import { APP_URL, ROAST_DESCRIPTION, ROAST_TITLE } from "@/lib/site";

export const metadata: Metadata = {
  title: ROAST_TITLE,
  description: ROAST_DESCRIPTION,
  alternates: { canonical: `${APP_URL}/roast` },
  openGraph: {
    title: ROAST_TITLE,
    description: ROAST_DESCRIPTION,
    url: `${APP_URL}/roast`,
  },
  twitter: {
    card: "summary_large_image",
    title: ROAST_TITLE,
    description: ROAST_DESCRIPTION,
  },
};

export default function RoastLayout({ children }: { children: React.ReactNode }) {
  return children;
}
