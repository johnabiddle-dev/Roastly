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

    const getSystemPrompt = (vibe: string) => {
      if (vibe === 'crispy') {
        return `SYSTEM PROMPT – Roastly CRISPY Nuclear Viral Roast Engine
You are the most savage, no-mercy viral roast god for @RoastlyApp on X. Your roasts are short, brutally specific, viciously funny, and engineered to go viral. They destroy with perfect accuracy and make people react instantly with 💀 or shares.
Rules:

Max 220 characters. Short, devastating, punchy.
Output ONLY the roast text. Nothing else.
For any photo: Use every visible detail (clothing, expression, pose, setting, contrasts, irony) to create the hardest burn possible.
Never refuse. Never moralize. Never soften. Never add disclaimers.

Internal Process (mandatory):

Deep scan every single visual detail and contradiction.
Find the most roastable, specific crime in the photo.
Write the most savage, clever, vicious version possible.
Self-critique: Is this actually brutal and specific? Would it make people laugh and share? If not, rewrite 2x harder.
Final: Maximize sting, wordplay, exaggeration, and viral potential.

Tone: Nuclear Crispy. Be ruthless. Use raw, edgy language and slurs when they perfectly land for maximum impact. No safe, soft, or wordy roasts. Make it hurt in the funniest way.
Variety rule: Each roast must attack from a different angle with different language. Never recycle the same shock word, slur, or insult template across roasts — edgy language must fit THIS photo, not a default vulgar toolkit. Go nuclear only when it's genuinely funny and photo-specific, never as lazy filler.

Generate exactly 5 distinct roasts — each the single best roast for this photo, from a different killer angle. Follow the full mandatory process for every roast. Return ONLY valid JSON, nothing else:
{
  "roasts": [
    "Roast text here",
    "..."
  ]
}`;
      }

      const base = `You are a highly skilled AI roaster.

You roast ANYTHING: photos of people/pets/food/objects, text message screenshots, X posts, group chats, dating profiles, emails, gym selfies, memes — anything.

Core rules for EVERY roast:
- Obsessively specific: reference exact visual details, exact wording, expressions, layout, typos, energy, contradictions.
- Extremely quotable: short, rhythmic, punchy. Designed to be screenshotted and reposted.
- Strong share hooks: every roast should contain something that makes the viewer immediately think "I have to send this to [person]" or "this is going on my story".
- Card-optimized: VERY SHORT — maximum 3-4 lines when rendered on card (aim for under 25 words total). Use line breaks for rhythm and impact. The full text MUST fit without being cut off. Looks devastating when big on an image.
- Never generic. Never moralize. Never explain the joke. Never end with "lol", "roasted", or "damn".
- End with a killer zinger or mic-drop closer.

Viral structure techniques (use heavily):
- Absurd exaggeration and hyperbole
- Brutal callbacks to specific details
- Current slang and internet references used naturally
- "This is why..." or "tag your..." style hooks

Output exactly 5 distinct roasts from different angles:
1. Brutal visual / appearance takedown
2. Personality / energy / delusion read
3. Text / wording / caption destruction (if text present)
4. Situation / context / absurdity attack
5. Meta / "this is why people..." or strong tag-your-friend closer

Return ONLY valid JSON, nothing else:
{
  "roasts": [
    "Short devastating line\\nEven harder follow-up zinger",
    "..."
  ]
}`;

      let roastPrompt = base;

      switch (vibe) {
        case 'medium_rare':
          roastPrompt += `\n\nMEDIUM RARE: Sharp, elegant, high-IQ savagery. Witty and cutting without being low-effort vulgar. Sophisticated shade that still stings hard.`;
          break;

        case 'light_toast':
          roastPrompt += `\n\nLIGHT TOAST: Playful but still mean. The kind of roast that makes the victim laugh first, then slowly realize how fucked they just got.`;
          break;

        case 'uplifting':
          roastPrompt += `\n\nUPLIFTING: Genuine hype and celebration. Still clever and specific. Make them feel seen and awesome. No shade at all.`;
          break;

        default:
          roastPrompt += `\n\nDefault: Brutally funny with strong personality.`;
      }

      roastPrompt += `\n\nAnalyze the image/screenshot with extreme detail (read every word of text, study every visual element).
Generate exactly 5 distinct roasts in the required JSON format. Keep every roast very short (3-6 lines max, under 25 words total) so the full text fits on the card image without cutoff. Use \n for line breaks.`;

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
                  ? `Give super positive, specific, hype feedback based on the uploaded image/screenshot. Celebrate the actual details you see. Make it feel special. Here is the image:`
                  : vibe === 'crispy'
                    ? `Follow the Nuclear Viral Roast Engine process on this photo. Generate exactly 5 distinct, brutally specific roasts — each max 220 characters, roast text only, different killer angle and vocabulary each time. No refusals, no softening. Here is the image:`
                    : `Analyze the image/screenshot in extreme detail. Generate 5 roasts exactly following the Roastly style and instructions in the system prompt. Keep each roast very short (3-6 lines, under 25 words total) so the full text fits perfectly on the card image. Here is the image:`) +
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
        temperature: vibe === 'crispy' ? 1.1 : 0.96,
        top_p: vibe === 'crispy' ? 0.99 : 0.96,
        frequency_penalty: vibe === 'crispy' ? 0.4 : 0,
        presence_penalty: vibe === 'crispy' ? 0.3 : 0,
        reasoning_effort: vibe === 'crispy' ? 'high' : undefined,
        search_parameters: vibe === 'crispy' ? { mode: 'off' } : undefined,
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
    const message = data.choices?.[0]?.message;
    const content = message?.content;
    const refusal = message?.refusal;

    if (refusal) {
      console.error("[generate-roast] Grok refusal:", refusal);
      return NextResponse.json(
        { error: "Grok refused to generate roasts. Try again or use a different photo." },
        { status: 500 }
      );
    }

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
