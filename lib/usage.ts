// Simple in-memory store for MVP (resets on server restart / across serverless instances)
// In production we'll move this to Supabase or Vercel KV for reliable paid tracking
import { NextRequest } from "next/server";

export type UsageRecord = {
  freeUsed: number;           // total lifetime for free users
  paidDailyUsed: number;      // daily for paid users
  paidDate: string;           // YYYY-MM-DD
  isPaid: boolean;            // true if user has active paid plan (any pack or unlimited)
  hasCustomPrompts: boolean;  // true if user paid the $1.99 add-on to unlock custom prompts
  referredBy?: string;        // browserId of the person who referred this user
  bonusRoasts: number;        // extra roasts earned via referrals etc.
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
      bonusRoasts: 0,
    };
    usageStore.set(userId, record);
  }

  if (record.isPaid) {
    if (record.paidDate !== today) {
      record.paidDailyUsed = 0;
      record.paidDate = today;
    }
    const bonus = record.bonusRoasts || 0;
    const effectiveLimit = PAID_DAILY_LIMIT + bonus;
    const remaining = Math.max(0, effectiveLimit - record.paidDailyUsed);
    return {
      used: record.paidDailyUsed,
      remaining,
      limit: effectiveLimit,
      isPaid: true,
      hasCustomPrompts: !!record.hasCustomPrompts,
      bonusRoasts: bonus,
      referredBy: record.referredBy,
    };
  } else {
    const bonus = record.bonusRoasts || 0;
    const effectiveLimit = FREE_LIMIT + bonus;
    const remaining = Math.max(0, effectiveLimit - record.freeUsed);
    return {
      used: record.freeUsed,
      remaining,
      limit: effectiveLimit,
      isPaid: false,
      hasCustomPrompts: !!record.hasCustomPrompts,
      bonusRoasts: bonus,
      referredBy: record.referredBy,
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
  bonusRoasts?: number;
  referredBy?: string;
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
      bonusRoasts: 0,
    };
    usageStore.set(userId, record);
  }

  if (record.isPaid) {
    if (record.paidDate !== today) {
      record.paidDailyUsed = 0;
      record.paidDate = today;
    }

    const bonus = record.bonusRoasts || 0;
    const effectiveLimit = PAID_DAILY_LIMIT + bonus;
    if (record.paidDailyUsed >= effectiveLimit) {
      return {
        allowed: false,
        error: "Daily limit reached",
        used: record.paidDailyUsed,
        remaining: 0,
        limit: effectiveLimit,
        isPaid: true,
        hasCustomPrompts: !!record.hasCustomPrompts,
      };
    }

    record.paidDailyUsed += 1;
    const paidBonus = record.bonusRoasts || 0;
    const paidEffectiveLimit = PAID_DAILY_LIMIT + paidBonus;
    return {
      allowed: true,
      used: record.paidDailyUsed,
      remaining: Math.max(0, paidEffectiveLimit - record.paidDailyUsed),
      limit: paidEffectiveLimit,
      isPaid: true,
      hasCustomPrompts: !!record.hasCustomPrompts,
    };
  } else {
    const bonus = record.bonusRoasts || 0;
    const effectiveLimit = FREE_LIMIT + bonus;
    if (record.freeUsed >= effectiveLimit) {
      return {
        allowed: false,
        error: "Free limit reached (3 total)",
        used: record.freeUsed,
        remaining: 0,
        limit: effectiveLimit,
        isPaid: false,
        hasCustomPrompts: !!record.hasCustomPrompts,
      };
    }

    record.freeUsed += 1;
    const freeBonus = record.bonusRoasts || 0;
    const freeEffectiveLimit = FREE_LIMIT + freeBonus;
    return {
      allowed: true,
      used: record.freeUsed,
      remaining: Math.max(0, freeEffectiveLimit - record.freeUsed),
      limit: freeEffectiveLimit,
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
    bonusRoasts: 0,
  };
  record.isPaid = true;
  usageStore.set(userId, record);

  // If this payer was referred, give the referrer bonus roasts
  creditReferrerOnPayment(userId, 5);
}

export function markCustomPromptsUnlocked(userId: string) {
  const record = usageStore.get(userId) || {
    freeUsed: 0,
    paidDailyUsed: 0,
    paidDate: getToday(),
    isPaid: false,
    hasCustomPrompts: false,
    bonusRoasts: 0,
  };
  record.hasCustomPrompts = true;
  usageStore.set(userId, record);

  // Credit referrer if applicable
  creditReferrerOnPayment(userId, 5);
}

export function grantBonusRoasts(userId: string, amount: number) {
  let record = usageStore.get(userId);
  if (!record) {
    record = {
      freeUsed: 0,
      paidDailyUsed: 0,
      paidDate: getToday(),
      isPaid: false,
      hasCustomPrompts: false,
      bonusRoasts: 0,
    };
    usageStore.set(userId, record);
  }
  record.bonusRoasts = (record.bonusRoasts || 0) + Math.max(0, amount);
}

export function setReferredBy(userId: string, referrerId: string) {
  let record = usageStore.get(userId);
  if (!record) {
    record = {
      freeUsed: 0,
      paidDailyUsed: 0,
      paidDate: getToday(),
      isPaid: false,
      hasCustomPrompts: false,
      bonusRoasts: 0,
    };
    usageStore.set(userId, record);
  }
  if (!record.referredBy) {
    record.referredBy = referrerId;
  }
}

function creditReferrerOnPayment(payerUserId: string, amount = 5) {
  const payerRecord = usageStore.get(payerUserId);
  if (payerRecord && payerRecord.referredBy) {
    grantBonusRoasts(payerRecord.referredBy, amount);
  }
}
