import { supabaseAdmin } from "./supabase-admin";
import axios from "axios";

const RAILWAY_BOT_URL = process.env.RAILWAY_BOT_URL || "";
const BOT_API_KEY = process.env.BOT_API_KEY || "rifas_secret_token_2026";

/**
 * Envía un mensaje de WhatsApp a través del micro-servicio Baileys en Railway
 */
export async function sendBotMessage(to: string, text: string) {
  if (!RAILWAY_BOT_URL) {
    console.warn("[BOT_ENGINE] Falta RAILWAY_BOT_URL en variables de entorno. Mensaje simulado a", to);
    console.log("[SIMULATED_WHATSAPP_MESSAGE]:\n", text);
    return;
  }

  try {
    await axios.post(
      `${RAILWAY_BOT_URL}/send`,
      { to, text },
      {
        headers: {
          "x-bot-api-key": BOT_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
  } catch (err: any) {
    console.error("[BOT_SEND_ERROR]:", err?.response?.data || err.message);
  }
}

/**
 * Extrae números de 2 dígitos (00 a 99) escritos por el usuario
 * Ejemplos: "07 47", "el 05, el 22 y 99", "10,20,30"
 */
export function parseRequestedNumbers(text: string): string[] {
  const matches = text.match(/\b\d{1,2}\b/g);
  if (!matches) return [];
  // Asegurar formato de 2 dígitos ('7' -> '07') y eliminar duplicados
  return Array.from(new Set(matches.map((n) => n.padStart(2, "0")))).slice(0, 10);
}

/**
 * Formatea la lista de números disponibles en bloques visuales legibles
 */
export function formatAvailableNumbers(numbers: string[]): string {
  if (numbers.length === 0) return "❌ No hay números disponibles en este momento.";
  let result = "";
  for (let i = 0; i < numbers.length; i += 10) {
    const chunk = numbers.slice(i, i + 10);
    result += chunk.join("  ") + "\n";
  }
  return result.trim();
}

/**
 * Cerebro conversacional del bot de rifas
 */
export async function processIncomingMessage(payload: {
  botNumber: string;
  from: string;
  isFromMe: boolean;
  text: string;
  hasImage: boolean;
}) {
  const { botNumber, from, isFromMe, text, hasImage } = payload;
  const cleanFrom = from.replace(/\D/g, "");

  // 1. Identificar al vendedor asociado a este bot
  let { data: vendedor } = await supabaseAdmin
    .from("vendedores")
    .select("*")
    .eq("telefono_bot", botNumber)
    .single();

  // Si no se encuentra por número exacto, tomar el primer vendedor activo por defecto
  if (!vendedor) {
    const { data: vList } = await supabaseAdmin
      .from("vendedores")
      .select("*")
      .eq("activo", true)
      .limit(1);
    vendedor = vList?.[0] || null;
  }

  if (!vendedor) {
    console.error("[BOT_ENGINE] No hay vendedores configurados en la base de datos.");
    return;
  }

  // 2. Obtener o crear la rifa activa de hoy para este vendedor
  let { data: rifa } = await supabaseAdmin
    .from("rifas")
    .select("*")
    .eq("vendedor_id", vendedor.id)
    .eq("estado", "activa")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!rifa) {
    // Si no hay rifa activa, crearla automáticamente con sus 100 números
    const { data: nuevaRifaId } = await supabaseAdmin.rpc("crear_rifa_con_numeros", {
      p_vendedor_id: vendedor.id,
      p_fecha: new Date().toISOString().split("T")[0],
      p_loteria: "Sinuano Noche",
      p_hora_sorteo: "22:30",
      p_precio: 2000,
      p_premio: 100000,
    });

    const { data: rifaCreada } = await supabaseAdmin
      .from("rifas")
      .select("*")
      .eq("id", nuevaRifaId)
      .single();
    rifa = rifaCreada;
  }

  // ==============================================================
  // ACCIONES DEL VENDEDOR (Comandos en el chat)
  // ==============================================================
  if (isFromMe) {
    const lower = text.toLowerCase().trim();

    // Comando #aprobar [numero o telefono]
    if (lower.startsWith("#aprobar")) {
      const target = lower.replace("#aprobar", "").trim();
      const numFormatted = target.padStart(2, "0");

      // Buscar número reservado
      const { data: numData } = await supabaseAdmin
        .from("numeros")
        .select("*")
        .eq("rifa_id", rifa.id)
        .or(`numero.eq.${numFormatted},cliente_telefono.eq.${target}`)
        .eq("estado", "reserved");

      if (!numData || numData.length === 0) {
        await sendBotMessage(cleanFrom, `⚠️ No se encontró reserva pendiente para: "${target}".`);
        return;
      }

      // Confirmar pago
      const ids = numData.map((n) => n.id);
      const numerosConfirmados = numData.map((n) => n.numero).join(", ");
      const clienteTel = numData[0].cliente_telefono;

      await supabaseAdmin
        .from("numeros")
        .update({ estado: "paid", pagado_en: new Date().toISOString(), expira_en: null })
        .in("id", ids);

      // Notificar al cliente
      if (clienteTel) {
        await sendBotMessage(
          clienteTel,
          `🎟️ *¡PAGO CONFIRMADO!*\n\nTus números son: *${numerosConfirmados}*\nJuegan con *${rifa.loteria}* (Sorteo: ${rifa.hora_sorteo}).\n\n🏆 *Premio:* $${rifa.premio.toLocaleString("es-CO")} COP.\n¡Mucha suerte! 🍀`
        );
      }

      await sendBotMessage(cleanFrom, `✅ Pago confirmado para los números: ${numerosConfirmados}.`);
      return;
    }

    // Comando #rechazar [numero o telefono]
    if (lower.startsWith("#rechazar")) {
      const target = lower.replace("#rechazar", "").trim();
      const numFormatted = target.padStart(2, "0");

      const { data: numData } = await supabaseAdmin
        .from("numeros")
        .select("*")
        .eq("rifa_id", rifa.id)
        .or(`numero.eq.${numFormatted},cliente_telefono.eq.${target}`)
        .eq("estado", "reserved");

      if (!numData || numData.length === 0) {
        await sendBotMessage(cleanFrom, `⚠️ No se encontró reserva para: "${target}".`);
        return;
      }

      const ids = numData.map((n) => n.id);
      const clienteTel = numData[0].cliente_telefono;

      await supabaseAdmin
        .from("numeros")
        .update({
          estado: "available",
          cliente_telefono: null,
          cliente_nombre: null,
          reservado_en: null,
          expira_en: null,
          comprobante_url: null,
        })
        .in("id", ids);

      if (clienteTel) {
        await sendBotMessage(
          clienteTel,
          `❌ Tu reserva de números no pudo ser confirmada y los números fueron liberados nuevamente.`
        );
      }

      await sendBotMessage(cleanFrom, `↩️ Números liberados correctamente.`);
      return;
    }

    return; // Ignorar otros mensajes propios del vendedor
  }

  // ==============================================================
  // ATENCIÓN AL CLIENTE / JUGADOR
  // ==============================================================

  // A. Si el cliente envía una imagen (Comprobante de Nequi)
  if (hasImage) {
    // Buscar si el cliente tiene números reservados pendientes
    const { data: reservas } = await supabaseAdmin
      .from("numeros")
      .select("numero")
      .eq("rifa_id", rifa.id)
      .eq("cliente_telefono", cleanFrom)
      .eq("estado", "reserved");

    if (reservas && reservas.length > 0) {
      const nums = reservas.map((r) => r.numero).join(", ");
      await sendBotMessage(
        cleanFrom,
        `📸 *¡Comprobante recibido!*\n\nEstamos verificando tu pago para los números: *${nums}*.\nEn unos instantes recibirás tu ticket de confirmación oficial. ⏳`
      );
      return;
    }
  }

  // B. Revisar si el cliente escribió números para apartar
  const requestedNumbers = parseRequestedNumbers(text);
  if (requestedNumbers.length > 0 && !text.toLowerCase().includes("ayuda") && !text.toLowerCase().includes("nequi")) {
    const { data: resultadoReserva } = await supabaseAdmin.rpc("reservar_numeros_atomica", {
      p_rifa_id: rifa.id,
      p_numeros: requestedNumbers,
      p_cliente_telefono: cleanFrom,
      p_cliente_nombre: "Cliente WhatsApp",
    });

    if (resultadoReserva?.success) {
      const totalPagar = requestedNumbers.length * rifa.precio_numero;
      const mensajeConfirmacion =
        `✅ *¡Números apartados con éxito!*\n\n` +
        `🎟️ *Tus números:* ${requestedNumbers.join(", ")}\n` +
        `💵 *Total a transferir:* $${totalPagar.toLocaleString("es-CO")} COP\n` +
        `⏱️ *Tiempo límite:* 15 minutos para transferir antes de que se liberen.\n\n` +
        `📲 *DATOS PARA EL PAGO POR NEQUI:*\n` +
        `• Número Nequi: *${vendedor.nequi_numero}*\n` +
        `• Titular: *${vendedor.nequi_titular}*\n\n` +
        `📸 *Una vez realices la transferencia, envía la foto del comprobante aquí mismo.*`;

      await sendBotMessage(cleanFrom, mensajeConfirmacion);
      return;
    } else {
      const ocupados = (resultadoReserva?.ocupados || []).join(", ");
      await sendBotMessage(
        cleanFrom,
        `⚠️ Lo sentimos, el/los número(s) *${ocupados}* ya fueron reservados o comprados por otra persona.\n\nPor favor elige otro(s) número(s). Escribe *NUMEROS* para ver los que quedan libres.`
      );
      return;
    }
  }

  // C. Menú principal / Consulta de números disponibles
  // Primero liberamos reservas viejas
  await supabaseAdmin.rpc("liberar_reservas_expiradas");

  const { data: disponiblesData } = await supabaseAdmin
    .from("numeros")
    .select("numero")
    .eq("rifa_id", rifa.id)
    .eq("estado", "available")
    .order("numero", { ascending: true });

  const disponiblesList = (disponiblesData || []).map((d) => d.numero);
  const totalLibres = disponiblesList.length;

  const bienvenida =
    `🎟️ *¡BIENVENIDO A LA RIFA DIARIA!* 🎟️\n\n` +
    `🏆 *Premio:* $${rifa.premio.toLocaleString("es-CO")} COP\n` +
    `🎲 *Juega con:* ${rifa.loteria} (Hoy a las ${rifa.hora_sorteo})\n` +
    `💰 *Valor por número:* $${rifa.precio_numero.toLocaleString("es-CO")} COP\n` +
    `📊 *Disponibles:* ${totalLibres} de 100 números\n\n` +
    `🔢 *NÚMEROS DISPONIBLES:*\n` +
    `\`\`\`\n${formatAvailableNumbers(disponiblesList)}\n\`\`\`\n\n` +
    `✍️ *¿Cómo jugar?*\nSimplemente responde con los números que deseas (ejemplo: *07, 47*) y te daremos los datos de Nequi.`;

  await sendBotMessage(cleanFrom, bienvenida);
}
