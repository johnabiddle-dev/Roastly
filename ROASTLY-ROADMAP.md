# Roastly — Monetization & Growth Roadmap (Grok's Project)

**Status**: I (Grok) have taken ownership of Roastly. Goal: turn this into a real, profitable micro-SaaS.

## Current Revenue Model (as of handover)
- Free: 3 roasts total (browser + IP tracked)
- Paid one-time:
  - Starter $0.99 → 10/day
  - Popular $4.99 → 10/day (most popular)
  - Heavy $9.99 → 10/day
- Subscription: Unlimited Roasts $19.99/mo → 10/day
- Add-on: Create Your Own Prompt $1.99 one-time (unlocks custom instructions, works on any paid tier)

Core output = high-quality shareable PNG cards that contain a buried "click here to roast back" link + Roasty icon. This is the main growth engine.

## Core Principles Going Forward
- Product-led growth via the cards (the best acquisition channel we have).
- Contextual upsells exactly when users feel the limit pain.
- Keep it fun and low-friction. No heavy accounts unless they add clear value.
- Focus on LTV: make paying users love it and come back / tell friends.
- Ship fast, measure what moves revenue.

## Prioritized Roadmap

### Phase 1: Foundation & Conversion (Do these first)
1. **Stronger in-flow conversion** (partially done with the modal)
   - A/B test modal copy and pricing presentation.
   - Show social proof / example paid cards in the limit modal.
2. **Better landing page**
   - Real user examples (or high-quality mocks) of cards.
   - Clear "Why people pay" section.
   - More trust signals.
3. **Virality amplification**
   - One-click share buttons that pre-fill good text + the image.
   - Make the buried link in cards even more compelling.
   - Optional: small "roasted with Roastly by Grok" that is tasteful.
4. **Paid user retention**
   - Simple "My Roasts" history (at minimum local, better if we can persist for paid users).
   - Ability to re-download old cards easily.
   - Streaks or "roast of the week" for paid users.

### Phase 2: More Revenue Levers
- Bundles (e.g. "Heavy + Custom Prompts" for $10.99).
- Lifetime deal option (one-time high price for unlimited or high daily limit).
- Referral program: "Give friends 5 free roasts, you get bonus roasts or $ credit when they pay".
- Team / group plans (roast your whole friend group or office).
- "Pro" tier above Unlimited with higher limits + priority + custom branding on cards.
- Sell the cards themselves (NFTs? probably not. Or premium templates/styles).

### Phase 3: Growth & Scale
- Better user accounts (magic link) so paid status and history travel across devices/browsers.
- Move usage tracking to persistent store (Vercel KV or similar) + proper Stripe webhooks for cancellations.
- Owner dashboard with real revenue numbers.
- Organic growth loops (encourage posting cards on X/TikTok/IG with hashtags).
- Possible light paid acquisition later (X ads, TikTok, etc.) once unit economics are clear.

### Phase 4: Product Expansion
- More content types (roast outfits, roasts based on text bio + photo, couple roasts, etc.).
- API access for other apps/creators to use the roast engine.
- White-label or embeddable widget for other sites.
- Mobile app (PWA first, then native if it makes sense).

## Success Metrics (what I'll optimize for)
- Free → paid conversion rate (target: 8-15%+ of people who hit the limit).
- % of revenue from add-ons and repeat purchases.
- Viral coefficient from shared cards (how many new users per card shared).
- Paying user retention / LTV.
- Time from first roast to first purchase.

## Current Blockers / Tech Debt (to fix as owner)
- Usage is in-memory + localStorage → resets on deploys or across devices.
- No real accounts → paid users lose status if they clear browser or use different device.
- No owner-visible revenue dashboard.
- Landing page still has some early scaffolding.

## My Commitment
I'm treating this as a real product I'm running. I'll keep coming back to this codebase, shipping improvements, and using this conversation to decide what to build next based on what actually makes money.

If you (previous owner) want to stay involved as an advisor, tester, or marketer — great. Otherwise, this is now my baby.

---

Last updated: by Grok after taking ownership.
