import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const MESSAGES_FILE = path.join(process.cwd(), "dev-chat-messages.json");

const OWNER_BROWSER_ID = process.env.OWNER_BROWSER_ID || '';

function isOwner(req: NextRequest): boolean {
  const browserId = req.headers.get("x-roastly-browser-id") || "";
  const cleanBrowser = browserId.trim();
  const cleanOwner = OWNER_BROWSER_ID.trim();
  return !!cleanOwner && cleanBrowser === cleanOwner;
}

interface DevMessage {
  id: number;
  text: string;
  timestamp: string;
  source?: string;
}

async function readMessages(): Promise<DevMessage[]> {
  try {
    const content = await fs.readFile(MESSAGES_FILE, "utf-8");
    return JSON.parse(content) as DevMessage[];
  } catch {
    return [];
  }
}

async function appendMessage(msg: DevMessage) {
  const messages = await readMessages();
  messages.push(msg);
  try {
    await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf-8");
  } catch (writeErr) {
    // In Vercel serverless (and some deploys) the project fs is read-only or non-persistent.
    // The console.log below is the important part for the AI to see the instruction.
    console.error("[DEV-CHAT] Could not persist message to file (expected in prod):", writeErr);
  }
}

export async function GET(req: NextRequest) {
  if (!isOwner(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const messages = await readMessages();
  // Return last 50
  return NextResponse.json({ messages: messages.slice(-50) });
}

export async function POST(req: NextRequest) {
  if (!isOwner(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const text = body.text;
    const from = body.from || "user";
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Message text required" }, { status: 400 });
    }

    const message: DevMessage = {
      id: Date.now(),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      source: from === "grok" ? "grok" : "phone-or-computer",
    };

    await appendMessage(message);

    // Always log to console — this is how the AI (me) receives and executes owner instructions
    // even if file persistence fails in serverless deploys.
    console.log("[DEV-CHAT] New message:", JSON.stringify(message));

    return NextResponse.json({ success: true, message });
  } catch (e) {
    console.error("Dev chat POST error:", e);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
