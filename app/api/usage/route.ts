import { NextRequest, NextResponse } from "next/server";
import { getUserId, getUsage, setReferredBy, makeUserId } from "@/lib/usage";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);

  const referrer = req.headers.get("x-roastly-referrer");
  if (referrer) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const browserId = req.headers.get("x-roastly-browser-id") || "no-id";
    if (referrer !== browserId) {
      setReferredBy(makeUserId(ip, browserId), referrer);
    }
  }

  return NextResponse.json(getUsage(userId));
}
