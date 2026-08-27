import { NextRequest, NextResponse } from "next/server";
import { constantTimeEqual } from "@/lib/usage";

export async function POST(req: NextRequest) {
  const owner = (process.env.OWNER_BROWSER_ID || "").trim();
  const browserId = (req.headers.get("x-roastly-browser-id") || "").trim();
  if (!owner || !constantTimeEqual(browserId, owner)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await req.json();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
