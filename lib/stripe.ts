// Stripe Price IDs (Live Mode)
// IMPORTANT: These must be the LIVE price_ IDs from your Stripe dashboard (not test mode).
// Go to Stripe Dashboard → Products → click each product → copy the Price ID (starts with price_)
// The IDs below are the ones you confirmed from Live mode.
// starter = $0.99 one-time
// popular pack = $4.99 one-time
// heavy roaster = $9.99 one-time
// Unlimited Roasts = $19.99/mo recurring (subscription)
// customPrompts = $1.99 one-time add-on (unlocks "create your own prompt" feature for all paid tiers)

export const STRIPE_PRICES = {
  // Starter - $0.99 one-time
  starter: "price_1TdtxfC5AToDgG5NoygmvNQx",

  // Popular Pack - $4.99 one-time
  popular: "price_1TdtxdC5AToDgG5NcZ1bUkYn",

  // Heavy Roaster - $9.99 one-time
  heavy: "price_1TdtxcC5AToDgG5N9SThB8O3",

  // Unlimited Roasts - $19.99/month recurring subscription
  unlimited: "price_1TdtxcC5AToDgG5NYt3wKgnX",

  // Custom Prompts / Create Your Own Prompt - $1.99 one-time add-on
  // This unlocks the custom prompt textarea (write your own instructions for the AI).
  // Works on top of any paid tier (Starter/Popular/Heavy/Unlimited).
  customPrompts: "price_1TeFlxC5AToDgG5NrrGP1pcE",
};
