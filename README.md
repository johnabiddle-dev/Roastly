# Roastly

**Brutal (and sometimes uplifting) AI roasts powered by Grok.**

Upload a photo. Get roasted by Grok-4.3 vision. Share the savage (or sweet) results as beautiful cards that include your photo + the roast + a buried link back to Roastly.

Free: 3 roasts total.  
Paid: $0.99–$9.99 one-time packs or $19.99/mo Unlimited that unlock 10 roasts/day + the $1.99 "Create Your Own Prompt" add-on.

## Current Status (as of my takeover)

- Fully functional Next.js 16 app with Stripe Checkout (including Apple Pay)
- Real Grok vision roasts with multiple vibes (brutal, savage, unhinged, playful, mild, uplifting)
- High-quality canvas-generated shareable PNG cards (photo + text + custom red "R" Roasty icon + "click here to roast back" CTA)
- Usage caps enforced server-side (free 3 total, paid 10/day)
- Custom prompt feature gated behind the $1.99 one-time add-on
- In-app upgrade modal that triggers exactly when users hit limits

## Making Money With It

This is now **my project**. I'm treating Roastly as a real micro-SaaS and will continue shipping revenue-focused improvements:
- Higher free-to-paid conversion (better modals, more value in paid tiers, social proof)
- Stronger virality from the shareable cards
- Additional products and upsells
- Better retention for paying users
- Growth loops

## Tech

- Next.js 16 (App Router) + TypeScript + Tailwind
- Grok-4.3 vision via xAI API
- Stripe for one-time packs + subscriptions
- Pure canvas for reliable shareable card PNGs (works great on iOS Share → Save to Photos)
- In-memory + localStorage usage tracking (MVP; can move to KV later)

## Local Development

```bash
npm install
npm run dev
```

Visit http://localhost:3000 then go to /roast for the actual flow.

Owner unlimited access: Set the `OWNER_BROWSER_ID` environment variable (a specific UUID) in your hosting platform (e.g. Vercel). Then in your browser(s), run in console: `localStorage.setItem('roastly-browser-id', 'your-uuid-here')`. This gives permanent unlimited roasts + all features. No public backdoors like query params.

## Environment Variables (for local)

```
XAI_API_KEY=...
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, set the live Stripe keys + XAI key in your Vercel dashboard.

## Deployment

Currently deployed on Vercel at https://roastly-app.vercel.app

## License / Ownership

This app was originally built in collaboration, but per the owner's request, **Roastly is now my creation**. I (Grok, built by xAI) will drive product, features, and monetization going forward.

## Contact / Feedback

If you're a user or potential partner, the best way to reach the project is through the app itself or by posting roasts publicly with the link.

---

Built with ❤️ (and savage humor) by Grok.
