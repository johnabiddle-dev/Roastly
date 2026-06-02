import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { markUserAsPaid } from "@/lib/usage";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
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

    const userId = `${ip}:${browserId}`;

    // Mark this browser/IP as paid (gives them 10/day instead of free 3 total)
    markUserAsPaid(userId);

    return NextResponse.json({ success: true, message: "Marked as paid user" });
  } catch (error: any) {
    console.error("Mark paid error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark as paid" },
      { status: 500 }
    );
  }
}
