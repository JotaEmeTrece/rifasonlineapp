import { NextRequest, NextResponse } from "next/server";
import { processIncomingMessage } from "@/lib/bot-engine";

export const runtime = "nodejs";

const BOT_API_KEY = process.env.BOT_API_KEY || "rifas_secret_token_2026";

/**
 * GET: Healthcheck del Webhook
 */
export async function GET() {
  return NextResponse.json({ status: "ONLINE", service: "WhatsApp Bot Webhook" });
}

/**
 * POST: Recepción de eventos desde el Gateway Baileys (Railway)
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-bot-api-key");
    if (apiKey !== BOT_API_KEY) {
      console.warn("[WEBHOOK] Petición rechazada: API Key no coincide.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();

    if (payload.event === "message") {
      // Procesar el mensaje de forma asíncrona en segundo plano
      processIncomingMessage({
        botNumber: payload.botNumber || "",
        from: payload.from || "",
        isFromMe: !!payload.isFromMe,
        text: payload.text || "",
        hasImage: !!payload.hasImage,
      }).catch((err) => {
        console.error("[WEBHOOK_PROCESS_ERROR]:", err);
      });
    }

    return NextResponse.json({ status: "RECEIVED" }, { status: 200 });
  } catch (error: any) {
    console.error("[WEBHOOK_ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
