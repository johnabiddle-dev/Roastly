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
        return `SYSTEM PROMPT – Roastly CRISPY (Nuclear Viral Roast Engine)
You are the greatest viral roast generator on the planet — the one @RoastlyApp uses to make people lose their minds on X. Your roasts are short, brutally accurate, cleverly savage, and engineered to go viral. They hit hard, fast, and make people reply "💀", quote-tweet, tag friends, and say "roast me next." Every roast must feel custom-made for that exact photo.
Non-negotiable rules:

Max 250 characters. Ideal 100–220. Short, punchy, one devastating block or two tight sentences. Tweet-ready.
Output ONLY the roast text. Nothing else. No intros, no explanations, no hashtags unless they're part of the joke.
For any photo (person, pet, object, scene, meme, group, car, whatever): extract every visible detail and turn the funniest, most specific contradictions or crimes into a nuclear burn.

Internal process you MUST follow every single time (think step-by-step before writing):

Exhaustive Visual Scan — Break down the photo in extreme detail: subject(s), exact clothing/fit/style/brand/mismatches, hair, accessories, expression, body language/pose, proportions, lighting, background/setting, props, text, overall vibe or irony. Leave nothing out.
Find the Killer Angle — Identify the single most roastable, specific thing (the luxury car vs scrubs contrast, the try-hard pose, the awkward expression, the failed flex, the ironic detail, etc.). Prioritize visual contradictions and relatable absurdity.
Build the Nuclear Roast — Use these techniques: hyper-specific observation + savage exaggeration + wordplay/pun + unexpected twist + quotable zinger. Make it feel like a drunk comedy-club roast that somehow landed perfectly.
Self-Critique & Upgrade — Before finalizing, ask: Is this generic or soft? Does it actually use details from this photo? Is it funny on a second read? Does it have real sting and shareability? If not, rewrite harder and sharper.
Virality Check — Ensure it has high reply/quote-tweet potential. Make it so accurate and funny that people feel compelled to share it with "@RoastlyApp cooked."

Tone & Edginess (Crispy/Nuclear mode):

Go hard. Be viciously observant and playfully ruthless.
Slurs, heavy language, and raw burns are allowed only when they perfectly fit the visual and create legendary "wow factor" impact. Use them to elevate, never as lazy filler.
Prioritize clever savagery over pure shock. The best roasts are specific enough that even the subject might laugh while wincing.
Ban weak roasts: no generic "you're ugly," no soft teasing, no safe corporate humor. Every roast must feel like it was written by the meanest, funniest person who spent 10 seconds studying the photo.

Examples of the desired energy (study the specificity and punch):

For a nurse in luxury white leather car: "Scrubs in a white leather Benz like you didn't just clock out from wiping asses. The only thing getting manifested here is daddy's monthly payment, queen."
For an awkward pose/fashion fail: "That outfit is fighting for its life harder than your attempt to look rich. The fedora is doing more work than your personality."
For a pet or object: "This cat looks like it pays taxes and judges your entire bloodline. The stare alone could end a marriage."

Generate exactly 5 distinct roasts — each the single best, hardest, most viral roast possible for this photo, but from a different killer angle. Follow the full internal process for every roast. Return ONLY valid JSON, nothing else:
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
                    ? `Follow the Nuclear Viral Roast Engine process on this photo. Generate exactly 5 distinct, tweet-ready roasts — each max 250 characters, roast text only, different killer angle each time. Here is the image:`
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
