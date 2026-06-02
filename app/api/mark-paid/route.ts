import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { markUserAsPaid, makeUserId } from "@/lib/usage";
import { STRIPE_PRICES } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // Verify the session with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // Get the browser ID from header (same as usage tracking)
    const browserId = request.headers.get("x-roastly-browser-id");
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    if (!browserId) {
      return NextResponse.json({ error: "Browser ID required" }, { status: 400 });
    }

    const userId = makeUserId(ip, browserId);

    // Mark this browser/IP as paid (gives them 10/day instead of free 3 total)
    // All paid products (one-time packs + pro sub) unlock the daily cap for now.
    markUserAsPaid(userId);

    // Figure out exactly what the user bought so the success page can show accurate text
    const purchasedPriceId = (session.metadata?.priceId as string) || "";
    let purchaseLabel = "your purchase";
    let isSubscription = false;

    if (purchasedPriceId === STRIPE_PRICES.starter) {
      purchaseLabel = "Starter ($0.99)";
    } else if (purchasedPriceId === STRIPE_PRICES.popular) {
      purchaseLabel = "Popular Pack ($4.99)";
    } else if (purchasedPriceId === STRIPE_PRICES.heavy) {
      purchaseLabel = "Heavy Roaster ($9.99)";
    } else if (purchasedPriceId === STRIPE_PRICES.unlimited) {
      purchaseLabel = "Unlimited Roasts ($19.99/mo)";
      isSubscription = true;
    }

    return NextResponse.json({
      success: true,
      purchaseLabel,
      isSubscription,
    });
  } catch (error: any) {
    console.error("Mark paid error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark as paid" },
      { status: 500 }
    );
  }
}
