import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_PRICES } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const { priceId, browserId, source } = await request.json();

    if (!priceId) {
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 });
    }

    const validPriceIds = Object.values(STRIPE_PRICES);
    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://roastly-app.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/roast`,
      metadata: {
        priceId,
        browserId: typeof browserId === "string" ? browserId : "",
        source: typeof source === "string" ? source : "",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Stripe Checkout Error:", error);
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
