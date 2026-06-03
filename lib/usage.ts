// Simple in-memory store for MVP (resets on server restart / across serverless instances)
// In production we'll move this to Supabase or Vercel KV for reliable paid tracking
import { NextRequest } from "next/server";

export type UsageRecord = {
  freeUsed: number;           // total lifetime for free users
  paidDailyUsed: number;      // daily for paid users
  paidDate: string;           // YYYY-MM-DD
  isPaid: boolean;            // true if user has active paid plan (any pack or unlimited)
  hasCustomPrompts: boolean;  // true if user paid the $1.99 add-on to unlock custom prompts
};

export const usageStore = new Map<string, UsageRecord>();

export function getToday() {
  return new Date().toISOString().split("T")[0];
}

export const FREE_LIMIT = 3;
export const PAID_DAILY_LIMIT = 10;

export function getUserId(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const browserId = req.headers.get("x-roastly-browser-id") || "no-id";
  return makeUserId(ip, browserId);
}

export function makeUserId(ip: string, browserId: string): string {
  return `${ip || "unknown"}:${browserId || "no-id"}`;
}

export function getUsage(userId: string) {
  const today = getToday();
  let record = usageStore.get(userId);
  if (!record) {
    record = {
      freeUsed: 0,
      paidDailyUsed: 0,
      paidDate: today,
      isPaid: false,
      hasCustomPrompts: false,
    };
    usageStore.set(userId, record);
  }

  if (record.isPaid) {
    if (record.paidDate !== today) {
      record.paidDailyUsed = 0;
      record.paidDate = today;
    }
    const remaining = Math.max(0, PAID_DAILY_LIMIT - record.paidDailyUsed);
    return {
      used: record.paidDailyUsed,
      remaining,
      limit: PAID_DAILY_LIMIT,
      isPaid: true,
      hasCustomPrompts: !!record.hasCustomPrompts,
    };
  } else {
    const remaining = Math.max(0, FREE_LIMIT - record.freeUsed);
    return {
      used: record.freeUsed,
      remaining,
      limit: FREE_LIMIT,
      isPaid: false,
      hasCustomPrompts: !!record.hasCustomPrompts,
    };
  }
}

export function consumeOneRoast(userId: string): {
  allowed: boolean;
  error?: string;
  used?: number;
  remaining?: number;
  limit?: number;
  isPaid?: boolean;
  hasCustomPrompts?: boolean;
} {
  const today = getToday();
  let record = usageStore.get(userId);
  if (!record) {
    record = {
      freeUsed: 0,
      paidDailyUsed: 0,
      paidDate: today,
      isPaid: false,
      hasCustomPrompts: false,
    };
    usageStore.set(userId, record);
  }

  if (record.isPaid) {
    if (record.paidDate !== today) {
      record.paidDailyUsed = 0;
      record.paidDate = today;
    }

    if (record.paidDailyUsed >= PAID_DAILY_LIMIT) {
      return {
        allowed: false,
        error: "Daily limit reached",
        used: record.paidDailyUsed,
        remaining: 0,
        limit: PAID_DAILY_LIMIT,
        isPaid: true,
        hasCustomPrompts: !!record.hasCustomPrompts,
      };
    }

    record.paidDailyUsed += 1;
    return {
      allowed: true,
      used: record.paidDailyUsed,
      remaining: Math.max(0, PAID_DAILY_LIMIT - record.paidDailyUsed),
      limit: PAID_DAILY_LIMIT,
      isPaid: true,
      hasCustomPrompts: !!record.hasCustomPrompts,
    };
  } else {
    if (record.freeUsed >= FREE_LIMIT) {
      return {
        allowed: false,
        error: "Free limit reached (3 total)",
        used: record.freeUsed,
        remaining: 0,
        limit: FREE_LIMIT,
        isPaid: false,
        hasCustomPrompts: !!record.hasCustomPrompts,
      };
    }

    record.freeUsed += 1;
    return {
      allowed: true,
      used: record.freeUsed,
      remaining: Math.max(0, FREE_LIMIT - record.freeUsed),
      limit: FREE_LIMIT,
      isPaid: false,
      hasCustomPrompts: !!record.hasCustomPrompts,
    };
  }
}

export function markUserAsPaid(userId: string) {
  const record = usageStore.get(userId) || {
    freeUsed: 0,
    paidDailyUsed: 0,
    paidDate: getToday(),
    isPaid: false,
    hasCustomPrompts: false,
  };
  record.isPaid = true;
  usageStore.set(userId, record);
}

export function markCustomPromptsUnlocked(userId: string) {
  const record = usageStore.get(userId) || {
    freeUsed: 0,
    paidDailyUsed: 0,
    paidDate: getToday(),
    isPaid: false,
    hasCustomPrompts: false,
  };
  record.hasCustomPrompts = true;
  usageStore.set(userId, record);
}
