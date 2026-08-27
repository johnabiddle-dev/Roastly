export type CreditPackKey = "pack10" | "pack50" | "pack100" | "pack250" | "pack500";

export type CreditPack = {
  key: CreditPackKey;
  credits: number;
  priceCents: number;
  priceLabel: string;
  name: string;
  blurb: string;
  perRoastLabel: string;
  popular?: boolean;
  bestValue?: boolean;
};

function perRoastLabel(priceCents: number, credits: number): string {
  const cents = priceCents / credits;
  if (cents < 1) return `${(10 * cents).toFixed(1)}¢`.replace(".0¢", "¢");
  if (cents < 10) return `${cents.toFixed(1)}¢`.replace(".0¢", "¢");
  return `${Math.round(cents)}¢`;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    key: "pack10",
    credits: 10,
    priceCents: 100,
    priceLabel: "$1.00",
    name: "10 Roasts",
    blurb: "Try a pack — roast a few friends",
    perRoastLabel: perRoastLabel(100, 10),
  },
  {
    key: "pack50",
    credits: 50,
    priceCents: 499,
    priceLabel: "$4.99",
    name: "50 Roasts",
    blurb: "Best for group chats & weekends",
    perRoastLabel: perRoastLabel(499, 50),
    popular: true,
  },
  {
    key: "pack100",
    credits: 100,
    priceCents: 899,
    priceLabel: "$8.99",
    name: "100 Roasts",
    blurb: "Serious roasting volume",
    perRoastLabel: perRoastLabel(899, 100),
  },
  {
    key: "pack250",
    credits: 250,
    priceCents: 1499,
    priceLabel: "$14.99",
    name: "250 Roasts",
    blurb: "Party-size pack",
    perRoastLabel: perRoastLabel(1499, 250),
  },
  {
    key: "pack500",
    credits: 500,
    priceCents: 1999,
    priceLabel: "$19.99",
    name: "500 Roasts",
    blurb: "Maximum chaos — lowest ¢ per roast",
    perRoastLabel: perRoastLabel(1999, 500),
    bestValue: true,
  },
];

export const STRIPE_PRICES = {
  pack10: "price_1TwKRZC5AToDgG5NvzzbjBrS",
  pack50: "price_1TwKRaC5AToDgG5NyxcuCxk4",
  pack100: "price_1TwKRaC5AToDgG5NrkEalWv0",
  pack250: "price_1TwKRbC5AToDgG5NujdUYk4z",
  pack500: "price_1TwKRcC5AToDgG5Nv721VjyN",
  customPrompts: "price_1TeFlxC5AToDgG5NrrGP1pcE",
} as const;

export type StripePriceKey = keyof typeof STRIPE_PRICES;

export function packForPriceId(priceId: string): CreditPack | null {
  const entry = (Object.entries(STRIPE_PRICES) as [StripePriceKey, string][]).find(([, id]) => id === priceId);
  if (!entry) return null;
  const [key] = entry;
  if (key === "customPrompts") return null;
  return CREDIT_PACKS.find((pack) => pack.key === key) ?? null;
}
