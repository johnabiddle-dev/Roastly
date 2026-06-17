import { NextRequest, NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";

// Owner-only: posts the roast + full branded card image directly to X as @roastlyapp.
// The client sends a complete caption containing the roast text + CTA + hashtags.
// UI button "Post to X @roastlyapp" is shown only to the owner inside the card modal.

export const runtime = 'nodejs';

const OWNER_BROWSER_ID = process.env.OWNER_BROWSER_ID || "";

function isOwner(req: NextRequest): boolean {
  const browserId = req.headers.get("x-roastly-browser-id") || "";
  const cleanBrowser = browserId.trim();
  const cleanOwner = OWNER_BROWSER_ID.trim();
  return !!cleanOwner && cleanBrowser === cleanOwner;
}

export async function POST(req: NextRequest) {
  if (!isOwner(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { text, imageBase64 } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Client now sends a complete ready-to-post caption (roast + CTA + hashtags).
    // We still enforce X's 280 char limit.
    if (text.length > 280) {
      return NextResponse.json({ error: "Text too long for X" }, { status: 400 });
    }

    // Basic size limit for images (prevent abuse of brand account)
    if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 5_000_000) {
      return NextResponse.json({ error: "Image too large for X post" }, { status: 413 });
    }

    const apiKey = process.env.X_API_KEY;
    const apiSecret = process.env.X_API_SECRET;
    const accessToken = process.env.X_ACCESS_TOKEN;
    const accessSecret = process.env.X_ACCESS_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      return NextResponse.json(
        { error: "X API keys not configured. Add them to Vercel env vars." },
        { status: 500 }
      );
    }

    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    let mediaId: string | undefined;

    if (imageBase64) {
      // Convert base64 to buffer for media upload
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const mimeType = imageBase64.includes("png") ? "image/png" : "image/jpeg";

      // Upload media (v1 for upload, then v2 for tweet)
      const media = await client.v1.uploadMedia(buffer, { mimeType });
      mediaId = media;
    }

    // Use the text exactly as provided by the client (includes the roast text,
    // CTA, and hashtags for visibility). Add a safety net for length.
    let tweetText = text.trim();
    if (tweetText.length > 280) {
      tweetText = tweetText.slice(0, 277) + "...";
    }
    const tweetOptions: any = { text: tweetText };
    if (mediaId) {
      tweetOptions.media = { media_ids: [mediaId] };
    }

    const tweet = await client.v2.tweet(tweetOptions);

    // Get the actual username from the authenticated user (so returned links are always correct for whatever @handle the OAuth 1.0a keys belong to)
    let username = "roastlyapp";
    try {
      const me = await client.v2.me();
      if (me?.data?.username) username = me.data.username;
    } catch {}

    return NextResponse.json({
      success: true,
      tweetId: tweet.data.id,
      url: `https://x.com/${username}/status/${tweet.data.id}`,
    });
  } catch (error: any) {
    console.error("X Post Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to post to X" },
      { status: 500 }
    );
  }
}
