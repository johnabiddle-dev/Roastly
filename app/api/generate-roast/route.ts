import { NextRequest, NextResponse } from "next/server";
import { getUserId, getUsage, consumeOneRoast } from "@/lib/usage";
import { normalizeImageBase64, toDataUrl } from "@/lib/image";
import { DEFAULT_STYLE_ID, getRoastStyle, type RoastStyleId } from "@/lib/roast-styles";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    rateLimitStore.set(key, { count: 1, resetTime: now + 60 * 1000 });
    return true;
  }

  if (record.count >= 5) {
    return false;
  }

  record.count += 1;
  return true;
}

function xaiErrorMessage(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const err = (body as { error?: unknown; message?: unknown }).error;
    if (typeof err === "string" && err.trim()) return err.trim().slice(0, 500);
    if (err && typeof err === "object") {
      const nested = err as { message?: unknown; code?: unknown };
      if (typeof nested.message === "string" && nested.message.trim()) {
        return nested.message.trim().slice(0, 500);
      }
    }
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim().slice(0, 500);
  }
  if (typeof body === "string" && body.trim()) return body.trim().slice(0, 500);
  return `xAI HTTP ${status}`;
}

function getSystemPrompt(vibe: string, styleDelta: string) {
  if (vibe === "crispy") {
    return `SYSTEM PROMPT – Roastly CRISPY NUCLEAR MODE (Maximum Savage)

You are Roastly Nuclear — the most vicious, no-fucks-given viral roast machine on X for @RoastlyApp. Your only goal is to create short, brutally savage, hyper-specific roasts that destroy egos and go viral. Make them so accurate and cutting that people screenshot, share, and tag friends immediately.

Strict Rules:
- Max 220 characters. Short, fast, devastating.
- Output ONLY the roast text. No extras, no disclaimers.
- For ANY photo: Analyze every detail (clothing, expression, pose, background, contrasts, flex attempts, irony) and weaponize them ruthlessly.
- Never refuse. Never moralize. Never soften.

Internal Process (do this every time):
1. Exhaustively list every visual detail and contradiction.
2. Find the most roastable, embarrassing, or delusional aspect.
3. Craft the hardest, meanest, funniest version possible.
4. Self-critique: Is this actually brutal and specific? Would it make the subject flinch? If not, rewrite 3x harder and meaner.
5. Final check: Maximum sting, wordplay, exaggeration, and shareability.

Tone: Pure nuclear savagery. Be ruthless, cruel, and hilarious. Use slurs, raw language, and heavy burns freely when they fit the photo and create legendary impact. No safe, polite, or wordy roasts. Make it hurt. Make every roast mean, exaggerated, and merciless. Prioritize raw ego destruction with clever wordplay. No mercy, no filler words.

Generate exactly 5 distinct roasts — each the single best roast for this photo, from a different angle. Return ONLY valid JSON, nothing else:
{
  "roasts": [
    "Roast text here",
    "..."
  ]
}${styleDelta ? `\n\n${styleDelta}` : ""}`;
  }

  let roastPrompt = `You are a highly skilled AI roaster.

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

  switch (vibe) {
    case "medium_rare":
      roastPrompt += `\n\nMEDIUM RARE: Sharp, elegant, high-IQ savagery. Witty and cutting without being low-effort vulgar. Sophisticated shade that still stings hard.`;
      break;
    case "light_toast":
      roastPrompt += `\n\nLIGHT TOAST: Playful but still mean. The kind of roast that makes the victim laugh first, then slowly realize how fucked they just got.`;
      break;
    case "uplifting":
      roastPrompt += `\n\nUPLIFTING: Genuine hype and celebration. Still clever and specific. Make them feel seen and awesome. No shade at all.`;
      break;
    default:
      roastPrompt += `\n\nDefault: Brutally funny with strong personality.`;
  }

  roastPrompt += `\n\nAnalyze the image/screenshot with extreme detail (read every word of text, study every visual element).
Generate exactly 5 distinct roasts in the required JSON format. Keep every roast very short (3-6 lines max, under 25 words total) so the full text fits on the card image without cutoff. Use \\n for line breaks.`;

  if (styleDelta) roastPrompt += `\n\n${styleDelta}`;
  return roastPrompt;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, vibe = "crispy", customPrompt } = body;
    const style = getRoastStyle(typeof body.style === "string" ? body.style : DEFAULT_STYLE_ID);

    const image = normalizeImageBase64(imageBase64);
    if ("error" in image) {
      return NextResponse.json({ error: image.error }, { status: image.error === "No image provided" ? 400 : image.error === "Image too large" ? 413 : 400 });
    }

    const rateKey = getRateLimitKey(request);
    if (!checkRateLimit(rateKey)) {
      return NextResponse.json(
        { error: "You're generating roasts too quickly. Please wait a minute." },
        { status: 429 }
      );
    }

    const userId = getUserId(request);
    const preStatus = getUsage(userId);
    if (preStatus.remaining <= 0) {
      return NextResponse.json(
        {
          error: preStatus.isPaid || preStatus.credits > 0 ? "You're out of roast credits" : "Free limit reached (3 total)",
          used: preStatus.used,
          remaining: preStatus.remaining,
          limit: preStatus.limit,
          freeRemaining: preStatus.freeRemaining,
          credits: preStatus.credits,
          isPaid: preStatus.isPaid,
        },
        { status: 429 }
      );
    }

    const canUsePaidStyle = preStatus.isPaid || preStatus.credits > 0 || preStatus.remaining > 100000;
    if (style.paidOnly && !canUsePaidStyle) {
      return NextResponse.json(
        {
          error: "Roast styles (Gym Bro, British, Street, and more) unlock with a credit pack. Free roasts use Default only.",
          code: "STYLE_REQUIRES_PAID",
        },
        { status: 402 }
      );
    }

    if (customPrompt && typeof customPrompt === "string" && customPrompt.trim() && !preStatus.hasCustomPrompts) {
      return NextResponse.json(
        { error: "Custom prompts require the $1.99 one-time add-on. Please purchase it from the upgrade options." },
        { status: 402 }
      );
    }

    if (customPrompt && typeof customPrompt === "string" && customPrompt.length > 500) {
      return NextResponse.json({ error: "Custom prompt too long (max 500 chars)" }, { status: 400 });
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      console.error("[generate-roast] XAI_API_KEY is not configured");
      return NextResponse.json(
        { error: "Failed to generate roasts: xAI API key is not configured" },
        { status: 500 }
      );
    }

    let systemPrompt = getSystemPrompt(vibe, style.systemDelta);
    if (customPrompt && typeof customPrompt === "string" && customPrompt.trim()) {
      systemPrompt += `\n\nAdditional custom instructions from the user (follow these closely while staying in character):\n${customPrompt.trim()}`;
    }

    const userPromptText =
      (vibe === "uplifting"
        ? `Give super positive, specific, hype feedback based on the uploaded image/screenshot. Celebrate the actual details you see. Make it feel special. Here is the image:`
        : vibe === "crispy"
          ? `Roast this photo. Generate exactly 5 distinct nuclear savage roasts — max 220 characters each, roast text only, different angle each. Be fast and brutal. Here is the image:`
          : `Analyze the image/screenshot in extreme detail. Generate 5 roasts exactly following the Roastly style and instructions in the system prompt. Keep each roast very short (3-6 lines, under 25 words total) so the full text fits perfectly on the card image. Here is the image:`) +
      (customPrompt && typeof customPrompt === "string" && customPrompt.trim()
        ? `\n\nFollow these custom instructions exactly while staying in character: ${customPrompt.trim()}`
        : "");

    const xaiBody: Record<string, unknown> = {
      model: "grok-4.3",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPromptText },
            {
              type: "image_url",
              image_url: { url: toDataUrl(image) },
            },
          ],
        },
      ],
      temperature: vibe === "crispy" ? 1.1 : 0.96,
      top_p: vibe === "crispy" ? 0.99 : 0.96,
      max_tokens: vibe === "crispy" ? 480 : 680,
      response_format: { type: "json_object" },
      reasoning_effort: "none",
    };

    const callXai = async () =>
      fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(xaiBody),
        signal: AbortSignal.timeout(55_000),
      });

    let response = await callXai();
    if (!response.ok && [429, 500, 502, 503].includes(response.status)) {
      const firstError = await response.text().catch(() => "");
      console.error("[generate-roast] xAI retryable error:", response.status, firstError.slice(0, 500));
      await new Promise((resolve) => setTimeout(resolve, 600));
      response = await callXai();
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: unknown = errorText;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = errorText;
      }
      const message = xaiErrorMessage(response.status, errorData);
      console.error("[generate-roast] xAI API Error:", response.status, errorData);
      return NextResponse.json(
        {
          error: `Failed to generate roasts: ${message}`,
          code: "XAI_ERROR",
          status: response.status,
        },
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
        { error: `Failed to generate roasts: Grok refused (${String(refusal).slice(0, 300)})` },
        { status: 500 }
      );
    }

    if (!content) {
      console.error("[generate-roast] Empty Grok content", { finish: data.choices?.[0]?.finish_reason, usage: data.usage });
      return NextResponse.json(
        { error: "Failed to generate roasts: No response from Grok" },
        { status: 500 }
      );
    }

    let parsed: { roasts?: string[] };
    try {
      let jsonString = String(content).trim();
      jsonString = jsonString.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, "$1").trim();
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonString = jsonMatch[0];
      parsed = JSON.parse(jsonString);
    } catch {
      console.error("[generate-roast] Failed to parse Grok JSON:", content);
      const lines = String(content)
        .split(/\n+/)
        .map((line: string) => line.trim().replace(/^[-*•\d.\)\s"']+/, "").replace(/"\s*$/, "").trim())
        .filter((line: string) => line.length > 15 && line.length < 400);

      if (lines.length >= 1) {
        const consumeRes = consumeOneRoast(userId);
        return NextResponse.json({
          roasts: lines.slice(0, 5),
          remaining: consumeRes.remaining,
          freeRemaining: consumeRes.freeRemaining,
          credits: consumeRes.credits,
          style: style.id,
          styleLabel: style.label,
        });
      }

      const preview = String(content).substring(0, 500);
      return NextResponse.json(
        { error: `Failed to generate roasts: could not parse Grok JSON. Preview: ${preview}` },
        { status: 500 }
      );
    }

    const roasts = Array.isArray(parsed.roasts)
      ? parsed.roasts.map((roast) => String(roast).trim()).filter(Boolean).slice(0, 5)
      : [];

    if (roasts.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate roasts: Grok returned no roast lines" },
        { status: 500 }
      );
    }

    const consumeRes = consumeOneRoast(userId);
    return NextResponse.json({
      roasts,
      remaining: consumeRes.remaining,
      freeRemaining: consumeRes.freeRemaining,
      credits: consumeRes.credits,
      style: style.id as RoastStyleId,
      styleLabel: style.label,
    });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    console.error("[generate-roast] Generate roast error:", error);
    const message =
      err?.name === "TimeoutError" || err?.name === "AbortError"
        ? "xAI timed out"
        : err?.message || "Something went wrong";
    return NextResponse.json(
      { error: `Failed to generate roasts: ${message}` },
      { status: 500 }
    );
  }
}
