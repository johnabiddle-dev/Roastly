import type { Metadata } from "next";
import ShareLanding from "@/components/ShareLanding";
import JsonLd from "@/components/JsonLd";
import {
  APP_URL,
  SHARE_DESCRIPTION,
  SHARE_TITLE,
  faqJsonLd,
  softwareApplicationJsonLd,
} from "@/lib/site";

export const metadata: Metadata = {
  title: SHARE_TITLE,
  description: SHARE_DESCRIPTION,
  alternates: { canonical: `${APP_URL}/share` },
  openGraph: {
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    url: `${APP_URL}/share`,
    siteName: "Roastly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
  },
};

type Props = {
  searchParams: Promise<{ ref?: string }>;
};

export default async function SharePage({ searchParams }: Props) {
  const { ref } = await searchParams;
  return (
    <>
      <JsonLd data={softwareApplicationJsonLd} />
      <JsonLd data={faqJsonLd} />
      <ShareLanding referrer={ref} />
    </>
  );
}
