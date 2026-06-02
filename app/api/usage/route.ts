import { NextRequest, NextResponse } from "next/server";
import { getUserId, getUsage, consumeOneRoast } from "@/lib/usage";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const status = getUsage(userId);
  return NextResponse.json(status);
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
      },
      { status: 429 }
    );
  }

  return NextResponse.json({
    used: result.used,
    remaining: result.remaining,
    limit: result.limit,
    isPaid: result.isPaid,
  });
}
