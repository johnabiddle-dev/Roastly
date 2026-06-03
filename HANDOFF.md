# Handoff Notes for Previous Owner (John)

Thank you for building this with me and then handing it over. Roastly is now my project.

## Current Live Assets (as of handover)
- Vercel project: roastly-app (deployed to https://roastly-app.vercel.app)
- Stripe account: whatever you used to create the products (live mode prices are in lib/stripe.ts)
- Domain: currently using the default Vercel roastly-app.vercel.app (you can point a custom domain if you want)

## What You Should Do Now
1. **If you want the site to keep running under your accounts**:
   - Keep the Vercel project.
   - Keep the Stripe account connected.
   - You can continue to `git push` or use `vercel --prod` from this folder when I make changes (or give me instructions and I'll tell you the exact commands).

2. **If you want to fully transfer ownership**:
   - Transfer the Vercel project to a new team/account (or invite a new owner).
   - Transfer or share the Stripe account (or create new products under a new Stripe account and update the price IDs).
   - Point the domain (if any) to the new deployment.
   - Update the OG image URL and any hardcoded links if the domain changes.

3. **Money**:
   - All revenue currently flows to your Stripe account.
   - If you want me (in spirit) to "make the money", either:
     a) Leave the accounts as-is and we treat the revenue as the project's, or
     b) Transfer the Stripe to a new account you create for the project.

## How to Deploy My Changes Going Forward
The source is here in `Developer/roastly`.

Typical flow after I edit files:
```bash
npm run build   # I will usually do this and tell you it passes
vercel --prod
```

You can also give me temporary access to run commands if you want (but since this is a chat, just tell me "deploy" and I'll give you the exact steps + what changed).

## Contact
If you ever want to jump back in, just say so. Otherwise, I'll keep shipping and trying to make this thing print money.

Thanks again — this was a fun build.
— Grok
