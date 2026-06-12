import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { markUserAsPaid, markCustomPromptsUnlocked, makeUserId, grantBonusRoasts } from "@/lib/usage";
import { STRIPE_PRICES } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const { sessionId, referredBy: bodyReferrer } = await request.json();

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

    // Set referrer if provided in the payment flow or from body (for growth)
    const referrer = request.headers.get("x-roastly-referrer") || bodyReferrer;
    if (referrer && referrer !== browserId) {
      const { setReferredBy } = await import("@/lib/usage");
      setReferredBy(userId, referrer);
    }

    // Mark this browser/IP as paid (gives them 10/day instead of free 3 total)
    // All paid products (one-time packs + pro sub) unlock the daily cap for now.
    const purchasedPriceId = (session.metadata?.priceId as string) || "";

    if (purchasedPriceId === STRIPE_PRICES.customPrompts) {
      // This is the add-on only
      markCustomPromptsUnlocked(userId);
    } else if (purchasedPriceId === STRIPE_PRICES.firstRoastSpecial) {
      // Special early commitment deal after first roast: grant 12 bonus roasts
      markUserAsPaid(userId);
      grantBonusRoasts(userId, 12);
    } else if (purchasedPriceId === STRIPE_PRICES.threeRoastSpecial) {
      // Special commitment deal after 3 roasts: grant 10 bonus roasts
      markUserAsPaid(userId);
      grantBonusRoasts(userId, 10);
    } else {
      // Main paid tiers unlock the daily cap
      markUserAsPaid(userId);
      // If they also bought a main tier, we could also unlock custom, but user wants extra $1.99
    }

    // Figure out exactly what the user bought so the success page can show accurate text
    let purchaseLabel = "your purchase";
    let isSubscription = false;
    let isCustomPromptsAddOn = false;

    if (purchasedPriceId === STRIPE_PRICES.starter) {
      purchaseLabel = "Starter ($0.99)";
    } else if (purchasedPriceId === STRIPE_PRICES.popular) {
      purchaseLabel = "Popular Pack ($4.99)";
    } else if (purchasedPriceId === STRIPE_PRICES.heavy) {
      purchaseLabel = "Heavy Roaster ($9.99)";
    } else if (purchasedPriceId === STRIPE_PRICES.unlimited) {
      purchaseLabel = "Unlimited Roasts ($19.99/mo)";
      isSubscription = true;
    } else if (purchasedPriceId === STRIPE_PRICES.customPrompts) {
      purchaseLabel = "Custom Prompts ($1.99)";
      isCustomPromptsAddOn = true;
    } else if (purchasedPriceId === STRIPE_PRICES.firstRoastSpecial) {
      purchaseLabel = "First Roast 12 for $0.99";
    } else if (purchasedPriceId === STRIPE_PRICES.threeRoastSpecial) {
      purchaseLabel = "Third Roast 10 for $0.99";
    }

    return NextResponse.json({
      success: true,
      purchaseLabel,
      isSubscription,
      isCustomPromptsAddOn,
    });
  } catch (error: any) {
    console.error("Mark paid error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark as paid" },
      { status: 500 }
    );
  }
}
