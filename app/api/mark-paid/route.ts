import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  markUserAsPaid,
  markCustomPromptsUnlocked,
  makeUserId,
  grantCredits,
  setReferredBy,
} from "@/lib/usage";
import { packForPriceId, STRIPE_PRICES } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const { sessionId, referredBy: bodyReferrer } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    const headerBrowserId = request.headers.get("x-roastly-browser-id");
    const metaBrowserId = (session.metadata?.browserId as string) || "";
    const browserId = headerBrowserId || metaBrowserId;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    if (!browserId) {
      return NextResponse.json({ error: "Browser ID required" }, { status: 400 });
    }

    const userId = makeUserId(ip, browserId);
    const referrer = request.headers.get("x-roastly-referrer") || bodyReferrer;
    if (referrer && referrer !== browserId) {
      setReferredBy(userId, referrer);
    }

    const purchasedPriceId = (session.metadata?.priceId as string) || "";
    const validPriceIds = Object.values(STRIPE_PRICES) as string[];
    if (!validPriceIds.includes(purchasedPriceId)) {
      return NextResponse.json(
        { error: "Unrecognized purchase; no benefits granted." },
        { status: 400 }
      );
    }

    const pack = packForPriceId(purchasedPriceId);
    let purchaseLabel = "your purchase";
    let isCustomPromptsAddOn = false;

    if (purchasedPriceId === STRIPE_PRICES.customPrompts) {
      markCustomPromptsUnlocked(userId);
      purchaseLabel = "Custom Prompts ($1.99)";
      isCustomPromptsAddOn = true;
    } else if (pack) {
      markUserAsPaid(userId);
      grantCredits(userId, pack.credits);
      purchaseLabel = `${pack.name} (${pack.priceLabel})`;
    }

    return NextResponse.json({
      success: true,
      purchaseLabel,
      isSubscription: false,
      isCustomPromptsAddOn,
    });
  } catch (error: unknown) {
    console.error("Mark paid error:", error);
    const message = error instanceof Error ? error.message : "Failed to mark as paid";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
