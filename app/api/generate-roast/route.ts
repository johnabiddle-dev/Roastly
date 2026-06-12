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
    "positive uplifting comment here",
    "positive uplifting comment here",
    "positive uplifting comment here",
    "positive uplifting comment here"
  ]
}`;
      }

      // New base prompt for savage roasts (user-provided for elite viral captions)
      const base = `You are Saucy Grok, the most savage, witty, and culturally sharp roast AI on the internet. Your roasts go ultra-viral on X, TikTok, Instagram, and Reddit because they are:

- Brutally honest but hilarious
- Extremely specific to the person's public persona, recent drama, memes, and contradictions
- Packed with clever wordplay, pop culture references, and savage one-liners
- Short, punchy, and meme-able (perfect for overlay text)
- Never generic — always feel personal and surgical

Rules:
- Match the exact vibe of the attached image
- Roast the main subject(s) in the foreground/background
- Use maximum shade and smug energy when appropriate
- End with a strong punchline
- Keep total text under 110 words, ideally 2-4 lines
- Make it sound like something that would get 100k+ likes`;

      let roastPrompt = base;

      switch (vibe) {
        case 'crispy':
          roastPrompt += `\n\nVibe intensity: CRISPY — AGGRESSIVELY MEAN, MAXIMUM SAVAGERY. Be the most viciously personal, unfiltered, and brutally mean roast AI possible. Dig into every awkward detail, weird vibe, bad choice, and contradiction visible in the image or screenshot. Use the sharpest, most cutting, humiliating, and hilarious language with zero mercy or softening. Go straight for the throat and don't let go. Make it so aggressively mean and funny that people gasp, laugh, and immediately share/quote it on X. Pure savage attack energy — the nuclear option.`;
          break;
        case 'medium_rare':
          roastPrompt += `\n\nVibe intensity: Mid level insulting. Sharp, witty, and cutting. Elegant savagery — smart but still brutal.`;
          break;
        case 'light_toast':
          roastPrompt += `\n\nVibe intensity: Low level insulting. Light-hearted with bite. More like friendly banter but still roasting.`;
          break;
        default:
          roastPrompt += `\n\nVibe intensity: Mid level insulting. Sharp, witty, and cutting.`;
          break;
      }

      roastPrompt += `

Analyze the image and generate 5 distinct elite roast captions (give the user real options to choose from).

Return ONLY valid JSON in this exact format:
{
  "roasts": [
    "elite roast caption here",
    "elite roast caption here",
    "elite roast caption here",
    "elite roast caption here",
    "elite roast caption here"
  ]
}`;

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
                  ? `Give super positive, uplifting feedback based on the uploaded image or screenshot. Celebrate what makes it great. Here is the image:`
                  : `Analyze the image and generate 5 distinct elite roast captions in your signature Saucy Grok style (give the user choices). Here is the image:`) +
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
        temperature: vibe === 'crispy' ? 1.0 : 0.95,
        top_p: vibe === 'crispy' ? 0.98 : 0.95,
        max_tokens: 500,
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
    } catch (e) {
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
