# Roastly

**Brutal (and sometimes uplifting) AI roasts powered by Grok.**

Roast *anything*. Upload any screenshot, photo, text convo, meme — whatever. Get roasted by Grok-4.3 vision. Share the savage (or sweet) results as beautiful cards that include your image + the roast + a buried link back to Roastly.

Free: 3 roasts total.  
Paid: $0.99–$9.99 one-time packs or $19.99/mo Unlimited that unlock 10 roasts/day + the $1.99 "Create Your Own Prompt" add-on.

## Current Status (as of my takeover)

- Fully functional Next.js 16 app with Stripe Checkout (including Apple Pay)
- Real Grok vision roasts with multiple vibes (brutal, savage, unhinged, playful, mild, uplifting)
- High-quality canvas-generated shareable PNG cards (any screenshot, photo, text convo, meme + text + custom red "R" Roasty icon + "click here to roast back" CTA)
- Usage caps enforced server-side (free 3 total, paid 10/day)
- Custom prompt feature gated behind the $1.99 one-time add-on
- In-app upgrade modal that triggers exactly when users hit limits
- Marketed as "roast anything" — not limited to selfies

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

Owner unlimited access: 
1. Generate UUID with `uuidgen` (or in browser console: `crypto.randomUUID()`)
2. Set the exact UUID as `OWNER_BROWSER_ID` env var in Vercel (Production) and in `.env.local`
3. In your browser console on the site: `localStorage.setItem('roastly-browser-id', 'THE-EXACT-UUID')`
This gives you (and only you) permanent unlimited roasts + custom prompts. No public backdoors.

**CRITICAL SECURITY NOTE:** The OWNER_BROWSER_ID is the master key for the entire site (unlimited roasts, custom prompts, direct posting as @roastlyapp on X, etc.). Treat it like a high-value password:
- Never commit it.
- Never share the value.
- Set it only on devices you fully control.
- Rotate periodically (new UUID in Vercel + update your devices' localStorage) if concerned about leakage.

How to add the env var in Vercel:
- Use the search bar at the top to find and click your "roastly" project.
- Once inside the project page, click the **Settings** tab (top right, gear icon).
- In the left sidebar, click **Environment Variables**.
- Click "Add New".
- Key: OWNER_BROWSER_ID
- Value: paste your UUID exactly (E36C00A1-8B98-4466-84C0-949443E24962)
- Environment: select Production
- Save, then Redeploy (from Deployments tab).

To use on phone (same ID, no extra key):
Use this bookmarklet on the live site in Safari:
1. On phone, go to https://roastly-app.vercel.app/roast
2. Tap Share button > Add Bookmark (name it "Set Owner ID")
3. Edit the bookmark, replace the entire URL with this exact text:
javascript:(function(){localStorage.setItem('roastly-browser-id','E36C00A1-8B98-4466-84C0-949443E24962');alert('Owner ID set! Hard refresh the page (pull down).');})();
4. While still on the roast page, tap your new "Set Owner ID" bookmark from the bookmarks menu.
5. Hard refresh the page.
You should now have unlimited roasts on phone too. Use the exact same ID on all your devices.

**Warning:** Bookmarklets can be dangerous if from untrusted sources. Only use the one you created yourself from the exact UUID in your Vercel env.

## X API Keys for posting as @roastlyapp

To enable direct posting from the app (the owner-only "Post to X" button inside the card modal, and phone commands like "post on X as @roastlyapp: ..."):

We use **OAuth 1.0a user context** (4 keys). The "App-only authentication" / Bearer token is **not** sufficient — it can't post as the @roastlyapp account.

What you need (in this order):

1. Go to **https://console.x.com** and sign in **as the @roastlyapp account** (the brand account — not your personal one).

2. In the left sidenav, expand **Apps** (or navigate to your Project > Apps). Click the App you created for posting (e.g. "Roastly Posting" or similar).

3. **First, set the permissions** (do this before regenerating keys if you want posting to work):
   - On the App page, find the **User authentication settings** section/card.
   - Click **Set up** (or Edit).
   - Enable / select **OAuth 1.0a**.
   - Under **App permissions**, select **Read and Write** (Read and Write and Direct Messages also works).
   - Under **Type of App**, choose **Web App, Automated App or Bot** (or similar server-side option).
   - **Callback URI / Redirect URL** (required by the portal):
     - Add: `https://roastly-app.vercel.app`
     - Also add: `http://127.0.0.1` (useful for local testing)
     Multiple are allowed (up to 10). No trailing slash needed in most cases.
   - **Website URL** (if shown): `https://roastly-app.vercel.app`
   - If the form also asks for **Terms of Service URL** and **Privacy Policy URL**:
     - Terms: `https://roastly-app.vercel.app/terms`
     - Privacy: `https://roastly-app.vercel.app/privacy`
   - Click **Save**.

   **Note:** Changing permissions usually requires you to regenerate the Access Token afterward so it gets the new scopes.

4. Go to the **Keys and tokens** tab (top tabs or menu on the App).

   This is the screen where you see sections like "app-only authentication" and "oauth1.0 keys".

   - Look for **Consumer Keys** / **API Key and Secret** (these are often the ones showing only the last 6 characters, masked):
     - This is your Consumer Key (X_API_KEY) and Consumer Secret (X_API_SECRET).
     - Click **Regenerate** next to the masked values to reveal the full ones.

   - Look for **Access Token & Secret** (under Authentication Tokens, OAuth 1.0a, or similar — these are also usually masked showing only last 6 characters):
     - Click **Generate** or **Regenerate** here (while logged in as @roastlyapp) to get the full Access Token (X_ACCESS_TOKEN) and Access Token Secret (X_ACCESS_SECRET) for this account.

   - Ignore the **Bearer Token** section (that's the pure app-only one).

   Regenerating shows the **full unmasked values only once** (or briefly). The masked versions (last 6 characters) cannot be used — you must use the full revealed strings. Copy them immediately. Never use the starred/masked versions.

   The four you need (map exactly to these):
   - Consumer / API Key          → X_API_KEY
   - Consumer / API Key Secret   → X_API_SECRET
   - Access Token                → X_ACCESS_TOKEN
   - Access Token Secret         → X_ACCESS_SECRET

5. In Vercel:
   - Open the "roastly" project.
   - Settings (top) → Environment Variables (sidebar).
   - Add New for each of the four keys above.
   - Paste the **full values**.
   - Environment: **Production** (at minimum).
   - Add them one by one.

6. After all four are saved, go to Deployments tab → Redeploy the latest deployment.

Once redeployed (after adding the 4 X_ keys), owner-only "Post to X @roastlyapp" button appears inside the shareable card modal (after you tap a roast result to open the card and pick your favorite). It posts the selected roast text + the full branded card image directly from @roastlyapp and returns the link.

(The OAuth 2.0 Client ID/Secret are not used; only the four OAuth 1.0a keys from the Consumer + Access Token sections.)

For posting from phone or remote: use the in-app "Post to X @roastlyapp" button (owner only). For other instructions/changes, provide them directly in this AI chat session.

## Environment Variables (for local)

```
XAI_API_KEY=...
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# For posting as @roastlyapp (optional for local testing of the post button)
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_SECRET=...
```

For production, set the live Stripe keys + XAI key + the 4 X_ keys in your Vercel dashboard (see the "X API Keys for posting as @roastlyapp" section above).

## Deployment

Currently deployed on Vercel at https://roastly-app.vercel.app

## License / Ownership

This app was originally built in collaboration, but per the owner's request, **Roastly is now my creation**. I (Grok, built by xAI) will drive product, features, and monetization going forward.

## Contact / Feedback

---

For development instructions, changes, or posting (when acting as owner), provide them directly in this chat session. The in-app owner "Post to X @roastlyapp" button handles direct brand posts from the roast flow.

---

Built with ❤️ (and savage humor) by Grok.
