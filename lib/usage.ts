import { NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { getFreeLimit } from "@/lib/promo";
import { USAGE_VERSION } from "@/lib/constants";
import type { UsageStatus } from "@/lib/types";

export type { UsageStatus };

export function constantTimeEqual(a: string, b: string): boolean {
  const ah = createHash("sha256").update(a).digest();
  const bh = createHash("sha256").update(b).digest();
  return timingSafeEqual(ah, bh);
}

export type UsageRecord = {
  freeUsed: number;
  credits: number;
  isPaid: boolean;
  hasCustomPrompts: boolean;
  referredBy?: string;
  version?: string;
};

export const usageStore = new Map<string, UsageRecord>();

const OWNER_BROWSER_ID = process.env.OWNER_BROWSER_ID || "";

function isOwner(browserId: string): boolean {
  const cleanBrowser = (browserId || "").trim();
  const cleanOwner = OWNER_BROWSER_ID.trim();
  return !!cleanOwner && constantTimeEqual(cleanBrowser, cleanOwner);
}

function getOrCreateRecord(userId: string): UsageRecord {
  let record = usageStore.get(userId);
  if (!record) {
    record = {
      freeUsed: 0,
      credits: 0,
      isPaid: false,
      hasCustomPrompts: false,
      version: USAGE_VERSION,
    };
    usageStore.set(userId, record);
  } else if (record.version !== USAGE_VERSION) {
    record.freeUsed = 0;
    record.version = USAGE_VERSION;
    if (typeof record.credits !== "number") record.credits = 0;
  }
  return record;
}

export function getUserId(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const browserId = req.headers.get("x-roastly-browser-id") || "no-id";
  return makeUserId(ip, browserId);
}

export function makeUserId(ip: string, browserId: string): string {
  return `${ip || "unknown"}:${browserId || "no-id"}`;
}

function ownerStatus(): UsageStatus {
  return {
    used: 0,
    remaining: 1000000,
    limit: 1000000,
    freeRemaining: 1000000,
    credits: 1000000,
    isPaid: true,
    hasCustomPrompts: true,
    bonusRoasts: 0,
  };
}

function toStatus(record: UsageRecord): UsageStatus {
  const freeLimit = getFreeLimit();
  const freeRemaining = Math.max(0, freeLimit - record.freeUsed);
  const credits = Math.max(0, record.credits || 0);
  return {
    used: record.freeUsed,
    remaining: freeRemaining + credits,
    limit: freeLimit,
    freeRemaining,
    credits,
    isPaid: !!record.isPaid || credits > 0,
    hasCustomPrompts: !!record.hasCustomPrompts,
    bonusRoasts: 0,
    referredBy: record.referredBy,
  };
}

export function getUsage(userId: string): UsageStatus {
  const browserId = browserIdFromUserId(userId);
  if (isOwner(browserId)) return ownerStatus();
  const record = getOrCreateRecord(userId);
  const orphan = usageStore.get(browserId);
  if (orphan && orphan !== record && (orphan.credits || 0) > 0) {
    record.credits = Math.max(0, record.credits || 0) + orphan.credits;
    record.isPaid = record.isPaid || orphan.isPaid;
    orphan.credits = 0;
  }
  return toStatus(record);
}

export function consumeOneRoast(userId: string): UsageStatus & { allowed: boolean; error?: string } {
  const browserId = userId.split(":")[1] || "";
  if (isOwner(browserId)) {
    return { allowed: true, ...ownerStatus() };
  }

  const record = getOrCreateRecord(userId);
  const freeLimit = getFreeLimit();
  const freeRemaining = Math.max(0, freeLimit - record.freeUsed);
  const credits = Math.max(0, record.credits || 0);

  if (freeRemaining <= 0 && credits <= 0) {
    return {
      allowed: false,
      error: record.isPaid || credits > 0 ? "You're out of roast credits" : "Free limit reached (3 total)",
      ...toStatus(record),
      remaining: 0,
      freeRemaining: 0,
      credits: 0,
    };
  }

  if (freeRemaining > 0) {
    record.freeUsed += 1;
  } else {
    record.credits = credits - 1;
  }

  return { allowed: true, ...toStatus(record) };
}

export function grantCredits(userId: string, amount: number) {
  const record = getOrCreateRecord(userId);
  record.credits = Math.max(0, record.credits || 0) + Math.max(0, amount);
  record.isPaid = true;
}

export function markUserAsPaid(userId: string) {
  const record = getOrCreateRecord(userId);
  record.isPaid = true;
  creditReferrerOnPayment(userId, 5);
}

export function markCustomPromptsUnlocked(userId: string) {
  const record = getOrCreateRecord(userId);
  record.hasCustomPrompts = true;
  creditReferrerOnPayment(userId, 5);
}

export function grantBonusRoasts(userId: string, amount: number) {
  grantCredits(userId, amount);
}

export function setReferredBy(userId: string, referrerId: string) {
  const record = getOrCreateRecord(userId);
  if (!record.referredBy) {
    record.referredBy = referrerId;
  }
}

function browserIdFromUserId(userId: string): string {
  const parts = userId.split(":");
  return parts.length > 1 ? parts.slice(1).join(":") : userId;
}

function creditReferrerOnPayment(payerUserId: string, amount = 5) {
  const payerRecord = usageStore.get(payerUserId);
  const referrerBrowserId = payerRecord?.referredBy;
  if (!referrerBrowserId) return;

  let credited = false;
  for (const [key, record] of usageStore) {
    if (key === referrerBrowserId || browserIdFromUserId(key) === referrerBrowserId) {
      record.credits = Math.max(0, record.credits || 0) + amount;
      record.isPaid = true;
      credited = true;
    }
  }
  if (!credited) grantCredits(referrerBrowserId, amount);
}
