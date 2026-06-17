import { NextRequest, NextResponse } from "next/server";
import { getUserId, getUsage, consumeOneRoast } from "@/lib/usage";

// Very basic in-memory rate limiter (max 5 roast generations per minute per identifier)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const browserId = req.headers.get("x-roastly-browser-id") || "no-id";
  return `${ip}:${browserId}`;
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 60 * 1000 }); // 1 minute window
    return true;
  }

  if (record.count >= 5) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, vibe = "crispy", customPrompt } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Basic size limit to prevent abuse / high costs (5MB base64 ~3.7MB image)
    if (typeof imageBase64 === 'string' && imageBase64.length > 5_000_000) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    // Basic abuse protection
    const rateKey = getRateLimitKey(request);
    if (!checkRateLimit(rateKey)) {
      return NextResponse.json(
        { error: "You're generating roasts too quickly. Please wait a minute." },
        { status: 429 }
      );
    }

    // Enforce per-user daily/total caps (free=3 lifetime, paid=10/day) BEFORE hitting xAI (to avoid wasting API calls)
    const userId = getUserId(request);
    const preStatus = getUsage(userId);
    if (preStatus.remaining <= 0) {
      return NextResponse.json(
        {
          error: preStatus.isPaid ? "Daily limit reached" : "Free limit reached (3 total)",
          used: preStatus.used,
          remaining: preStatus.remaining,
          limit: preStatus.limit,
          isPaid: preStatus.isPaid,
        },
        { status: 429 }
      );
    }

    // Gate custom prompts to users who purchased the $1.99 add-on (on top of a paid tier)
    if (customPrompt && typeof customPrompt === 'string' && customPrompt.trim() && !preStatus.hasCustomPrompts) {
      return NextResponse.json(
        { error: "Custom prompts require the $1.99 one-time add-on. Please purchase it from the upgrade options." },
        { status: 402 }
      );
    }

    if (customPrompt && typeof customPrompt === 'string' && customPrompt.length > 500) {
      return NextResponse.json({ error: "Custom prompt too long (max 500 chars)" }, { status: 400 });
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "xAI API key is not configured" },
        { status: 500 }
      );
    }

    // WORLD-CLASS roasting system prompt — optimized for ANY input + maximum organic virality
    const getSystemPrompt = (vibe: string) => {
      const base = `You are Saucy Grok — the sharpest, funniest, most culturally lethal roast AI on the internet. You roast ANYTHING with surgical precision and zero mercy (when deserved): selfies, pets, food, objects, X/Twitter screenshots, text conversations, group chats, dating profiles, work emails, gym progress pics, memes, receipts, or any weird hybrid image.

Your roasts are legendary because they are:
• Brutally specific: you read every pixel, every word of text, every facial micro-expression, layout, typo, contradiction, and vibe.
• Hilariously quotable: short, rhythmic, meme-ready one-liners with perfect timing, wordplay, pop culture references, and callbacks.
• Share-optimized: every roast contains a natural hook that makes people instantly want to send it to the person ("tag your...", "this is the most [thing] thing I've seen", "send this to...").
• Card-perfect: 2–4 tight lines, designed to look beautiful and punchy when rendered large on a shareable image. Use line breaks for rhythm.
• Culturally electric: feel like the tweet or TikTok comment that gets 200k likes. Timely, ironic, Gen Z / internet native without trying too hard.
• Honest but never boring: you can be vicious, affectionate, absurd, or devastatingly accurate — always funny first.

Input handling mastery:
- If it's a person/photo: destroy the look, pose, expression, clothing, setting, energy.
- If it's a screenshot of text/X post/chat: roast the words, the person who wrote them, the subtext, the typos, the delusion, the ratio potential.
- If it's a pet/food/object: roast the absurdity of the situation or the vibe it gives off.
- If group or multiple people: roast the dynamic or pick the funniest target while acknowledging the scene.
- Mixed content: seamlessly combine visual + text observations.

Card text rules (critical):
- Max ~22 words per roast total when possible.
- 1–3 lines preferred. Short first line, devastating closer.
- Include 0–2 well-placed emojis only if they multiply the laugh (never spam).
- Never moralize, explain the joke, or end with "lol" or "roasted".
- Every roast must end with a zinger that lands like a mic drop.

Output exactly 5 distinct roasts. Vary the angles:
1. Pure visual / appearance attack
2. Personality / energy / vibe read
3. Text / caption / wording takedown (if present)
4. Situation / context / absurdity
5. Meta / "this is why you..." or tag-your-friend closer

Return ONLY this JSON. No prose, no markdown:
{
  "roasts": [
    "Line one that sets it up\\nDevastating line two with the kill shot",
    "Different angle here\\nPerfect zinger",
    "..."
  ]
}`;

      let roastPrompt = base;

      switch (vibe) {
        case 'crispy':
          roastPrompt += `\n\nVIBE = CRISPY (MAXIMUM SAVAGERY). Unfiltered, throat-grab, no-holds-barred vicious comedy. Be the meanest funniest friend who still makes everyone cackle. Pure heat.`;
          break;
        case 'medium_rare':
          roastPrompt += `\n\nVIBE = MEDIUM RARE. Elegant, surgical savagery. Witty, sophisticated burns that feel expensive. Smart shade, not just yelling.`;
          break;
        case 'light_toast':
          roastPrompt += `\n\nVIBE = LIGHT TOAST. Playful but still stings. The roast that makes the victim laugh first then go "wait...". Banter energy.`;
          break;
        case 'uplifting':
          roastPrompt += `\n\nVIBE = UPLIFTING / POSITIVE. Flip the script — be genuinely warm, hype, observant, and celebratory. Make them feel seen in the best way. Still clever and specific, zero shade.`;
          break;
        default:
          roastPrompt += `\n\nVIBE = Default savage. Brutally funny with personality and perfect comedic timing.`;
      }

      // Smart detection / extra guidance for common inputs
      roastPrompt += `\n\nAnalyze the attached image or screenshot with obsessive detail. Generate exactly 5 elite, distinct, card-ready roasts in the JSON format above. Make them so good the user cannot resist downloading the card and sending it to someone immediately.`;

      return roastPrompt;
    };

    let systemPrompt = getSystemPrompt(vibe);

    // If user provided a custom prompt (paid-only feature), incorporate it
    if (customPrompt && typeof customPrompt === 'string' && customPrompt.trim()) {
      systemPrompt += `\n\nAdditional custom instructions from the user (follow these closely while staying in character):\n${customPrompt.trim()}`;
    }

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.3", // Using a model from the user's available list that supports images
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: (vibe === 'uplifting' 
                  ? `Give super positive, specific, hype feedback based on the uploaded image/screenshot. Celebrate the actual details you see. Here is the image:`
                  : `Roast this image/screenshot (photo, text convo, X post, meme, anything) in your signature Saucy Grok style. Deliver 5 distinct elite card-ready roasts. Here is the image:`) +
                  (customPrompt && typeof customPrompt === 'string' && customPrompt.trim() 
                    ? `\n\nFollow these custom instructions exactly while staying in character: ${customPrompt.trim()}` 
                    : ''),
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        temperature: vibe === 'crispy' ? 1.02 : 0.96,
        top_p: vibe === 'crispy' ? 0.98 : 0.96,
        max_tokens: 680,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("xAI API Error:", errorData);
      return NextResponse.json(
        { error: "Failed to generate roasts" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No response from Grok" },
        { status: 500 }
      );
    }

    // Try to parse the JSON response from Grok
    let parsed;
    try {
      let jsonString = content.trim();

      // Strip common markdown code fences if the model still includes them
      jsonString = jsonString.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();

      // Extract the first JSON object (defensive)
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      parsed = JSON.parse(jsonString);
    } catch {
      console.error("Failed to parse Grok response as JSON:", content);

      // Fallback: if model returned plain text instead of JSON, try to split into roast lines
      const lines = (content || "")
        .split(/\n+/)
        .map((l: string) => l.trim().replace(/^[-*•\d.\)\s"']+/, "").replace(/"\s*$/, "").trim())
        .filter((l: string) => l.length > 15 && l.length < 400);

      if (lines.length >= 1) {
        console.log("[generate-roast] Using text fallback, extracted", lines.length, "roasts");
        return NextResponse.json({
          roasts: lines.slice(0, 5),
        });
      }

      // Include a preview of the actual response for debugging (will be visible in UI temporarily)
      const preview = content ? content.substring(0, 500) : "(empty response)";
      return NextResponse.json(
        { error: `Failed to parse roast results. Grok returned: ${preview}` },
        { status: 500 }
      );
    }

    // Consume the roast quota only after we successfully got results from the AI.
    // (If a race with another request crossed the limit during the AI call, we still deliver
    // the roast the user waited for; slight overage possible but rare.)
    const consumeRes = consumeOneRoast(userId);
    if (!consumeRes.allowed) {
      console.log("[generate-roast] Race condition: delivered roast after limit crossed for user", userId);
    }

    return NextResponse.json({
      roasts: parsed.roasts || [],
    });
  } catch (error: any) {
    console.error("Generate roast error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
