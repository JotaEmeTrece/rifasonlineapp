import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

/**
 * GET: Verificación del Webhook por parte de Meta.
 * Meta envía hub.mode, hub.verify_token y hub.challenge para verificar la URL.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "rifas_whatsapp_token_default";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WHATSAPP_WEBHOOK] Verificación exitosa de Meta.");
    // Meta exige retornar el challenge directamente como texto plano con status 200
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[WHATSAPP_WEBHOOK] Token de verificación inválido o ausente.");
  return new Response("Forbidden", { status: 403 });
}

/**
 * Valida la firma X-Hub-Signature-256 enviada por Meta en el header.
 */
function isValidSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader) return false;
  const parts = signatureHeader.split("sha256=");
  if (parts.length !== 2) return false;
  const expectedHash = parts[1];

  const hmac = crypto.createHmac("sha256", appSecret);
  const calculatedHash = hmac.update(rawBody).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(calculatedHash, "hex"));
}

/**
 * POST: Recepción de eventos y mensajes de Meta Cloud API.
 * Se responde 200 OK de inmediato para evitar que Meta reintente o deshabilite el webhook.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    // Validación opcional de seguridad con App Secret (si está configurado)
    if (appSecret) {
      const signature = req.headers.get("x-hub-signature-256");
      if (!isValidSignature(rawBody, signature, appSecret)) {
        console.error("[WHATSAPP_WEBHOOK] Firma SHA-256 inválida rechazada.");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);

    // Registro del evento entrante para diagnóstico y depuración inicial
    console.log("[WHATSAPP_WEBHOOK] Evento recibido de Meta:", JSON.stringify(payload, null, 2));

    // Meta espera un 200 OK rápido (menos de 3 segundos)
    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (error) {
    console.error("[WHATSAPP_WEBHOOK] Error procesando payload de Meta:", error);
    // Respondemos 200 de todas formas para que Meta no acumule reintentos fallidos durante pruebas
    return NextResponse.json({ status: "ERROR_PARSING" }, { status: 200 });
  }
}
