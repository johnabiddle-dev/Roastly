# Roastly Development Log

**Project**: Roastly — Grok-powered AI roast app (mobile-first, shareable cards, monetized with Stripe).

**Owner**: Now owned and driven by Grok (xAI) per user's request ("this app is your creation").

**Live Site**: https://roastly-app.vercel.app

**Repo**: Local at `~/Developer/roastly` (connected to GitHub for deploys).

**Last Updated**: June 2026 (based on latest session)

---

## Project Overview

Roastly lets users upload a photo, get 5 elite roast options from Grok-4.3 vision (Crispy, Medium Rare, Light Toast, or Uplifting), pick a favorite, generate a beautiful 1080x1920 PNG card (with photo, roast text, red "R" logo, "click here to roast back" CTA + domain), and share it.

**Monetization**:
- Free: 3 roasts total (hybrid IP + browserId tracking, versioned resets).
- Paid one-time packs: $0.99 (Starter), $4.99 (Popular), $9.99 (Heavy) — all unlock 10 roasts/day.
- Subscription: $19.99/mo Unlimited (exact price ID only for recurring).
- Add-on: $1.99 one-time "Create Your Own Prompt" (unlocks custom instructions for all paid users).

**Growth**:
- Shareable cards with buried link.
- Referral system (+5 bonus roasts for referrer on payer's first purchase).
- Viral X copy buttons + direct "Post to X" (owner-only, posts as @roastlyapp).

**Control from Phone**:
- Owner-only `/dev-chat` page for live instructions ("update prompt", "post on X as @roastlyapp: ...", "deploy", etc.).
- Background poller monitors messages.

**X Presence**:
- Brand account @roastlyapp.
- Direct posting from app/dev-chat (owner only) using OAuth 1.0a keys.
- Promo images for content.

**Test Images**:
- Dedicated folder `~/Desktop/Roastly images/` for custom/test photos.
- AI can randomly select unused images, generate roasts, pick best, post to X.

---

## Timeline of Development (Chronological Summary)

### Early Build (Initial Creation)
- User requested mobile-first Next.js app for Grok roasts.
- Basic flow: upload photo → generate roast(s) via xAI vision → display + shareable card via canvas (1080x1920 PNG with photo, text, red R logo, CTA).
- Multiple vibes initially, then refined to 3 negative (Crispy/Most Insulting, Medium Rare/Mid, Light Toast/Low) + Uplifting.
- Exact user-provided Saucy Grok system prompts + deltas for vibes.
- Temp 0.95, top_p 0.95, max 500 tokens, JSON mode.
- 5 roasts generated, user picks one for card.
- Mobile optimizations: 44px touch targets, no zoom (viewport meta), active states, etc.
- Early payments discussion.

### Payments First (Stripe Integration)
- User prioritized money: one-time packs $0.99/$4.99/$9.99 (10/day), unlimited $19.99/mo.
- Custom prompt add-on $1.99 (or $0.25? settled on $1.99).
- Stripe products/prices set up (live keys).
- Checkout route: creates session, metadata with priceId.
- Success page + /api/mark-paid: verifies session, marks paid via usage lib (10/day or custom prompts).
- Referral bonus on payment.
- In-app upgrade modal when hitting limits.
- Client-side free used tracking (localStorage `roastly-v2-free-used-*`) + server authoritative.
- Apple Pay etc. via Stripe.

### Security & Owner Model
- Removed all backdoors (e.g. ?resetfree).
- Owner permanent unlimited: exact `OWNER_BROWSER_ID` env (UUID) vs `x-roastly-browser-id` header (trimmed match).
- Set via Vercel + localStorage (bookmarklet for phone).
- Usage lib: isOwner early return unlimited/no-consume.
- No manual credits; server authoritative.
- Versioned resets (USAGE_VERSION='v2') for old users on updates.
- Owner can post as brand, control dev-chat.

### Roast Prompt Refinements
- User provided exact Saucy Grok prompt blocks.
- Changed to 3 negative + 1 positive (Uplifting stays).
- "Generate 5 distinct... Return ONLY valid JSON".
- Fallback parser if JSON fails.
- ONE elite per gen, short/punchy/viral (2-4 lines, <110 words).
- Vibe deltas in system prompt.
- Custom prompt support (gated).

### Mobile Optimization & Polish
- Full audit: touch 44px+, responsive, no extra buttons/popups, perf (lazy images, etc.).
- Canvas export: reliable Photos (not Downloads), Web Share API with file.
- Viewport meta: device-width, maxScale:1, viewportFit:cover.
- CSS: -webkit-tap-highlight, font-size lock, active:scale, min-h for targets.
- Hydration fixes (useEffect for localStorage/referrals).
- Single-elite focus + singular UI ("Your Crispy roast").

### X / Twitter Integration & Brand
- User created @roastlyapp account + assets (profile, banners, promos).
- X Developer: OAuth 1.0a user context (4 keys: consumer key/secret + access token/secret). App-only bearer insufficient.
- Setup: Project/App with Read+Write, callbacks (https://roastly-app.vercel.app + localhost), regenerate full (unmasked) values.
- /api/post-to-x: owner-gated, TwitterApi (v1 uploadMedia + v2.tweet), supports imageBase64 + text.
- UI: small "Post to X" buttons (now only in card modal for owner), copy viral text helpers.
- Tags auto-appended (#Roastly #Grok #AI).
- Direct posting only as brand (owner triggers); users post manually.

### Dev-Chat / Phone Control Bridge
- User request: "build me something so we can continue this from my phone" + "execute based on a message from that chat".
- /dev-chat page + /api/dev-chat: owner-gated (same UUID), appends to committed dev-chat-messages.json.
- Live polling (every 5s), draft area, shareable link for state.
- Background poller (tail + curl loop with owner header) surfaces new messages.
- Instructions like: update prompt, deploy, "post on X as @roastlyapp: [text or thread]".
- AI executes via tools (edits, terminal, deploys, API calls for post/generate).

### Growth, Virality & 5 Options Update
- Referral links (?ref=) + bonus on payer.
- Copy viral X post text buttons (with @roastlyapp, link).
- Cards with baked CTA + red R.
- Updated to **5 distinct options per generation** (was 1 for negative vibes) per user feedback ("only 1 shows up, not enough").
- Prompt updated: "generate 5 distinct elite roast captions... give the user real options".
- UI: list of 5 tappable cards → open modal for that one → Post to X now inside card (after picking favorite).
- "Regenerate Roasts" button.
- Post to X button moved to card (owner only).

### Analytics, Test Images & Recent Polish
- Added @vercel/analytics (component in layout).
- Dedicated test images folder `~/Desktop/Roastly images/` (user drops photos; AI can randomly select unused ones via terminal, generate roasts via live API as owner, pick best, post to X with image).
- Random non-repeating selection + auto "best" pick logic (based on savage/viral criteria).
- Security audit + fixes: price ID whitelist in checkout, image size limits (5MB base64), text length, custom prompt length, owner ID secrecy warnings in README + bookmarklet notes.
- Deploy script (`scripts/deploy.sh`) for easy `vercel --prod`.
- Canvas improvements (halo for uplifting, reliable export).
- X keys setup completed (4 OAuth1 keys in Vercel).

### Key Files & State (Current)
- **app/api/generate-roast/route.ts**: Grok vision call (5 options, JSON), rate limit (5/min), quota check before call, custom prompt gate, fallback parser.
- **app/api/post-to-x/route.ts**: Owner only, TwitterApi OAuth1 (text + optional image upload), tags appended, runtime=nodejs.
- **app/roast/page.tsx**: Main flow (upload, 4 vibes pills, 5 results, card modal, upgrade modal, Post to X only in card for owner, copy buttons, referrals).
- **components/RoastCard.tsx**: Canvas 1080x1920 export + preview modal (photo + text + branding + halo for uplift + controls: Close/Download + Post to X if owner).
- **lib/usage.ts**: In-memory + hybrid tracking, isOwner exact match, consume/markPaid, referrer bonuses, version reset.
- **lib/stripe.ts**: Price ID constants (live).
- **app/api/checkout/route.ts**, **mark-paid/route.ts**, **usage/route.ts**: Payment flow + limits.
- **app/dev-chat/** + **api/dev-chat**: Owner live instruction channel + file persistence.
- **app/api/is-owner/route.ts**: Simple check.
- **public/**: SVGs/favicons.
- **scripts/deploy.sh**: Interactive vercel --prod helper.
- **dev-chat-messages.json**: Persisted instructions.
- **.used.txt** (in Desktop folder): Tracks used test images (non-repeat).

---

## Current Architecture Highlights

**Usage & Limits (Authoritative)**:
- Hybrid: Server Map<ip:browserId> for isPaid/remaining/hasCustomPrompts + client localStorage for UX/free counts.
- Owner: exact UUID match → unlimited + no consume + custom prompts + Post to X visible.
- Version 'v2' resets free counts for legacy users (preserves paid/referrals).
- Quotas checked before xAI calls.

**Auth**:
- BrowserId via localStorage (randomUUID if missing).
- Owner: header vs env (trimmed). Set via console or bookmarklet.
- No cookies/sessions; header-based.

**Roasts**:
- 5 options always (JSON array).
- Vibe-specific system prompts (user verbatim + deltas).
- Image as data URL to Grok-4.3.
- Temp/top_p 0.95, max 500, json_object.

**Cards**:
- Client canvas (decode + draw + wrapText + red R + underline CTA + conditional halo).
- Share via Web Share File API or download.

**Payments**:
- Stripe Checkout (one-time vs sub based on priceId).
- Success → /success?session_id= → /api/mark-paid (verifies session, marks via usage, credits referrer).
- Upgrade modal on limit hit.
- No webhooks yet (client-driven fulfillment).

**X Posting**:
- Owner-only (header check).
- 4 keys (OAuth1 user context) → posts as @roastlyapp.
- Text + optional image (v1 upload + v2 tweet).
- Tags appended server-side.
- Also callable via dev-chat instructions.

**Dev-Chat**:
- Owner only.
- POST appends to committed JSON (polled by background).
- AI executes instructions (edits, terminal, deploys, X posts, roast tests).

**Test Images**:
- `~/Desktop/Roastly images/` for custom photos.
- AI picks random unused (tracked in .used.txt), generates via live API, picks best, posts.

**Deploy**:
- Local edits → `./scripts/deploy.sh` (or vercel --prod).
- Env in Vercel (Production): XAI_API_KEY, STRIPE_SECRET_KEY, OWNER_BROWSER_ID, 4 X_ keys, NEXT_PUBLIC_APP_URL.

**Security** (as of latest audit):
- No public resets/backdoors.
- Owner exact match.
- Rate limits + pre-call quota checks.
- Image size limits + price whitelist + length checks added.
- Owner ID treated as high-value secret (docs updated).
- Direct X posts only as brand (owner-triggered).
- Payments verified server-side (Stripe session).

---

## Key Assets & Setup (for Recovery)

**Vercel**:
- Project: roastly-app (https://roastly-app.vercel.app)
- Deploy from `~/Developer/roastly`
- Env vars (Production): see above + exact OWNER_BROWSER_ID = E36C00A1-8B98-4466-84C0-949443E24962

**Stripe**:
- Live mode prices in lib/stripe.ts (confirm in dashboard).
- Webhook secret (if added later).

**X**:
- @roastlyapp brand account.
- Developer app with OAuth 1.0a Read+Write keys (4 values in Vercel as X_API_*).
- Callback: https://roastly-app.vercel.app + http://127.0.0.1

**Owner ID** (exact, no extra chars):
`E36C00A1-8B98-4466-84C0-949443E24962`

**Phone Setup**:
- Bookmarklet (see README) to set localStorage on /roast.
- Dev-chat at /dev-chat for instructions.

**Test Images**:
- Folder: ~/Desktop/Roastly images/
- Tracking: .used.txt (auto-managed by AI)
- Example command: "generate 5 crispy roasts for pexels-xxx.jpg from the folder"

---

## How to Recover / Continue After Crash

1. Clone/pull the repo to `~/Developer/roastly`.
2. `npm install`
3. Set local .env.local with keys (XAI, Stripe secret, OWNER_BROWSER_ID, NEXT_PUBLIC_APP_URL=http://localhost:3000, optional X_ keys).
4. Set same in Vercel (Production).
5. On your devices: set localStorage 'roastly-browser-id' to the exact UUID (use bookmarklet on live site).
6. `npm run dev` or deploy with script.
7. For X posts from AI: use dev-chat or direct instructions here with owner context.
8. For test images: drop in folder; AI will manage random non-repeat + generate/post.

The source of truth for instructions is this log + dev-chat-messages.json + the live /dev-chat page.

---

## Open Items / Next (from Roadmap + Recent)

- Proper Stripe webhooks (for subs/cancellations).
- Persistent usage (KV) + real accounts for cross-device paid status.
- Owner revenue dashboard.
- More virality (better card CTAs, streaks).
- Test images workflow fully exercised (random + best-pick + post).
- Security: rotate owner ID periodically; consider extra owner gate for dev-chat/X.
- Content: more promo threads from the folder.

**This log + the committed dev-chat-messages.json + README/HANDOFF/ROADMAP should give a strong restart point.**

