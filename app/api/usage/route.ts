import { NextRequest, NextResponse } from "next/server";

// Simple in-memory store for MVP (resets on server restart)
// In production we'll move this to Supabase or Vercel KV
type UsageRecord = {
  freeUsed: number;           // total lifetime for free users
  paidDailyUsed: number;      // daily for paid users
  paidDate: string;           // YYYY-MM-DD
  isPaid: boolean;            // true if user has active paid plan
};

const usageStore = new Map<string, UsageRecord>();

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getUserId(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const browserId = req.headers.get("x-roastly-browser-id") || "no-id";
  return `${ip}:${browserId}`;
}

const FREE_LIMIT = 3;
const PAID_DAILY_LIMIT = 10;

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const today = getToday();

  const record = usageStore.get(userId) || {
    freeUsed: 0,
    paidDailyUsed: 0,
    paidDate: today,
    isPaid: false,
  };

  if (record.isPaid) {
    if (record.paidDate !== today) {
      record.paidDailyUsed = 0;
      record.paidDate = today;
    }
    const remaining = Math.max(0, PAID_DAILY_LIMIT - record.paidDailyUsed);
    return NextResponse.json({
      used: record.paidDailyUsed,
      remaining,
      limit: PAID_DAILY_LIMIT,
      isPaid: true,
    });
  } else {
    const remaining = Math.max(0, FREE_LIMIT - record.freeUsed);
    return NextResponse.json({
      used: record.freeUsed,
      remaining,
      limit: FREE_LIMIT,
      isPaid: false,
    });
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const today = getToday();

  let record = usageStore.get(userId);

  if (!record) {
    record = {
      freeUsed: 0,
      paidDailyUsed: 0,
      paidDate: today,
      isPaid: false,
    };
    usageStore.set(userId, record);
  }

  if (record.isPaid) {
    if (record.paidDate !== today) {
      record.paidDailyUsed = 0;
      record.paidDate = today;
    }

    if (record.paidDailyUsed >= PAID_DAILY_LIMIT) {
      return NextResponse.json(
        { error: "Daily limit reached", used: record.paidDailyUsed, remaining: 0, limit: PAID_DAILY_LIMIT, isPaid: true },
        { status: 429 }
      );
    }

    record.paidDailyUsed += 1;
    return NextResponse.json({
      used: record.paidDailyUsed,
      remaining: Math.max(0, PAID_DAILY_LIMIT - record.paidDailyUsed),
      limit: PAID_DAILY_LIMIT,
      isPaid: true,
    });
  } else {
    if (record.freeUsed >= FREE_LIMIT) {
      return NextResponse.json(
        { error: "Free limit reached (3 total)", used: record.freeUsed, remaining: 0, limit: FREE_LIMIT, isPaid: false },
        { status: 429 }
      );
    }

    record.freeUsed += 1;
    return NextResponse.json({
      used: record.freeUsed,
      remaining: Math.max(0, FREE_LIMIT - record.freeUsed),
      limit: FREE_LIMIT,
      isPaid: false,
    });
  }
}

// Helper to mark a user as paid (called after successful subscription checkout)
export function markUserAsPaid(userId: string) {
  const record = usageStore.get(userId) || {
    freeUsed: 0,
    paidDailyUsed: 0,
    paidDate: getToday(),
    isPaid: false,
  };
  record.isPaid = true;
  usageStore.set(userId, record);
}
