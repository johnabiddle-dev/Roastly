export type UsageStatus = {
  used: number;
  remaining: number;
  limit: number;
  freeRemaining: number;
  credits: number;
  isPaid: boolean;
  hasCustomPrompts: boolean;
  bonusRoasts?: number;
  referredBy?: string;
};
