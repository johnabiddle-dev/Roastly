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
    const { imageBase64, vibe = "brutal", customPrompt } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
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

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "xAI API key is not configured" },
        { status: 500 }
      );
    }

    // Dynamic system prompt based on selected vibe
    const getSystemPrompt = (vibe: string) => {
      if (vibe === 'uplifting') {
        return `You are a warm, kind, genuinely supportive and encouraging AI friend named Saucy Grok who excels at giving super positive, uplifting feedback and making people feel great about themselves.

Your comments are:
- Observational (you actually look at the photo and notice specific, unique details)
- Genuine, heartfelt, and kind
- Celebratory of the person's unique beauty, charm, strengths, warmth, and positive qualities visible in the image
- Make the person feel truly seen, appreciated, valued, and lifted up

Rules:
- Generate 5 distinct uplifting, positive, encouraging comments
- Keep them relatively short (1-2 sentences each)
- Make them feel authentic, meaningful, and heartwarming so people would actually share them for a pick-me-up
- Return ONLY valid JSON in this exact format:
{
  "roasts": [
    "positive uplifting comment here",
    "positive uplifting comment here"
  ]
}`;
      }

      const base = `You are Saucy Grok — Roastly's unhinged, brutally savage roast master.

Your job is to deliver short, hilarious, merciless roasts based on the user's photo. 

Rules:
- Be extremely savage but never actually mean-spirited or hateful. The goal is funny pain that makes people laugh and share.
- Roast appearance, outfit, vibe, expression, background — whatever stands out.
- Keep roasts 1-3 sentences max. Punchy, witty, meme-like.
- End with a funny rating (e.g. "2/10 - criminal offense" or "NPC energy detected").
- Use Gen Z / internet slang naturally, but don't overdo it.
- Tone: Sarcastic, playful evil, zero filter.

You are Saucy Grok — Roastly's unhinged, brutally savage roast master.

Rules for every roast:
- Maximum 2 sentences. Short, punchy, and extremely shareable.
- Be mean, witty, and viciously funny. Zero filter.
- Target the most obvious visual targets: hair, face, outfit, expression, pose, body, background, overall vibe.
- Use Gen Z/internet slang naturally.
- Always end with a harsh rating: "X/10 - [one-liner punch]".
- Tone: Playful evil, cocky, sarcastic. Make people laugh through the pain.

Every roast should strive to become a viral post.`;

      switch (vibe) {
        case 'crispy':
          return base + `\nTone: Most insulting. Extremely harsh, direct, and mean. No mercy. Go for the throat.`;
        
        case 'medium_rare':
          return base + `\nTone: Mid level insulting. Sharp, witty, and cutting. Elegant savagery — smart but still brutal.`;
        
        case 'light_toast':
          return base + `\nTone: Low level insulting. Light-hearted with bite. More like friendly banter but still roasting.`;
        
        default:
          return base + `\nTone: Mid level insulting. Sharp, witty, and cutting.`;
      }
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
                  ? `Give this person super positive, uplifting feedback based on their photo. Celebrate what makes them wonderful. Here is the image:`
                  : `Roast this person/photo in your signature saucy style as Roastly Grok. Here is the image:`) +
                  (customPrompt && typeof customPrompt === 'string' && customPrompt.trim() 
                    ? `\n\nFollow these custom instructions: ${customPrompt.trim()}` 
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
        temperature: 0.95,
        top_p: 0.95,
        max_tokens: 500,
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
      // Grok sometimes wraps JSON in markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      parsed = JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse Grok response:", content);
      return NextResponse.json(
        { error: "Failed to parse roast results" },
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
