import { NextRequest, NextResponse } from "next/server";
import { getUserId, getUsage, consumeOneRoast, setReferredBy, makeUserId } from "@/lib/usage";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);

  // Handle referral if sent (for growth - getting more users via shares)
  const referrer = req.headers.get("x-roastly-referrer");
  if (referrer) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const browserId = req.headers.get("x-roastly-browser-id") || "no-id";
    const payerUserId = makeUserId(ip, browserId);  // the current user
    if (referrer && referrer !== browserId) {
      setReferredBy(payerUserId, referrer);
    }
  }

  const status = getUsage(userId);

  const receivedBrowserId = req.headers.get("x-roastly-browser-id") || "no-id";
  const ownerEnv = process.env.OWNER_BROWSER_ID || '';

  return NextResponse.json({
    ...status,
    debug: {
      receivedBrowserId,
      ownerEnv,
      matchesOwner: receivedBrowserId === ownerEnv && !!ownerEnv,
    }
  });
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const result = consumeOneRoast(userId);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: result.error,
        used: result.used,
        remaining: result.remaining,
        limit: result.limit,
        isPaid: result.isPaid,
        hasCustomPrompts: result.hasCustomPrompts,
        bonusRoasts: result.bonusRoasts,
        referredBy: result.referredBy,
      },
      { status: 429 }
    );
  }

  return NextResponse.json({
    used: result.used,
    remaining: result.remaining,
    limit: result.limit,
    isPaid: result.isPaid,
    hasCustomPrompts: result.hasCustomPrompts,
    bonusRoasts: result.bonusRoasts,
    referredBy: result.referredBy,
  });
}
