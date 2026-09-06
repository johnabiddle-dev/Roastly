export const APP_URL = "https://roastly-app.vercel.app";
export const SITE_NAME = "Roastly";

export const DEFAULT_TITLE = "Roastly — Roast anything. Send the card. 3 free roasts.";
export const DEFAULT_DESCRIPTION =
  "Roast anything with AI roast cards. Upload a photo or screenshot, get 5 Grok burns, and send the card in iMessage or group chat. Try 3 free roasts, then one-time packs at $1, $4.99, and $19.99. No subscription.";

export const SHARE_TITLE = "Someone sent you a Roastly card — try 3 free roasts";
export const SHARE_DESCRIPTION =
  "A friend sent a Roastly roast card. Try 3 free roasts, then one-time packs at $1, $4.99, and $19.99. No subscription. If you buy, the person who shared gets +5 credits.";

export const ROAST_TITLE = "Roast anything — 3 free roast cards, then $1 / $4.99 / $19.99";
export const ROAST_DESCRIPTION =
  "Upload a selfie, screenshot, or group chat. Get 5 roast cards from Grok. Send one in iMessage. Try 3 free roasts, then one-time packs. No subscription.";

export const PACK_OFFERS = [
  { name: "3 free roasts", price: "0", priceLabel: "Free" },
  { name: "10 roast pack", price: "1.00", priceLabel: "$1" },
  { name: "50 roast pack", price: "4.99", priceLabel: "$4.99" },
  { name: "500 roast pack", price: "19.99", priceLabel: "$19.99" },
] as const;

export const FAQ = [
  {
    question: "What is Roastly?",
    answer:
      "Roastly is a web app that turns any photo, selfie, screenshot, or group chat into a shareable roast card. Grok writes 5 burns. You pick one and send the card in iMessage or a group chat so friends can roast back.",
  },
  {
    question: "How do roast cards work?",
    answer:
      "Upload something roastable. Roastly generates 5 roast options and a card with the photo plus the burn. Send that card to iMessage or a group chat. People who open it can try 3 free roasts themselves, then buy a one-time pack.",
  },
  {
    question: "Is there a subscription?",
    answer:
      "No. Roastly is not a subscription. You get 3 free roasts, then optional one-time packs at $1, $4.99, and $19.99. Credits stay on this device. If a friend buys after using your invite link, you get +5 credits.",
  },
] as const;

export function sharePath(ref?: string | null): string {
  return ref ? `/share?ref=${encodeURIComponent(ref)}` : "/share";
}

export function shareUrl(ref?: string | null): string {
  return `${APP_URL}${sharePath(ref)}`;
}

export function roastPath(ref?: string | null): string {
  return ref ? `/roast?ref=${encodeURIComponent(ref)}` : "/roast";
}

export function roastUrl(ref?: string | null): string {
  return `${APP_URL}${roastPath(ref)}`;
}

export const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  url: APP_URL,
  applicationCategory: "EntertainmentApplication",
  operatingSystem: "Web",
  description: DEFAULT_DESCRIPTION,
  offers: PACK_OFFERS.map((offer) => ({
    "@type": "Offer",
    name: offer.name,
    price: offer.price,
    priceCurrency: "USD",
    url: APP_URL,
  })),
};

export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};
