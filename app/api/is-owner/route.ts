import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const browserId = req.headers.get("x-roastly-browser-id") || "";
  const owner = process.env.OWNER_BROWSER_ID || "";

  const cleanBrowser = browserId.trim();
  const cleanOwner = owner.trim();

  const isOwner = !!cleanOwner && cleanBrowser === cleanOwner;

  return NextResponse.json({ isOwner });
}
