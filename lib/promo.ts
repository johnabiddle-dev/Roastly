/** July 4 2026 promo: 5 free roasts through July 6. */
export function isJuly4PromoActive(): boolean {
  return new Date().toISOString().split("T")[0] < "2026-07-07";
}

export function getFreeLimit(): number {
  return isJuly4PromoActive() ? 5 : 3;
}

export function getJuly4PromoBanner(): string {
  return isJuly4PromoActive()
    ? `🎆 July 4th celebration — ${getFreeLimit()} free roasts (normally 3)! Offer ends July 6.`
    : "";
}

export function getJuly4PromoHook(): string {
  return isJuly4PromoActive()
    ? "🎆 July 4th celebration: 5 FREE roasts (normally 3)! Ends July 6.\n\n"
    : "";
}
