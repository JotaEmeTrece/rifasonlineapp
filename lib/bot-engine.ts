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
  // replyTo conserva el JID exacto (@lid o @s.whatsapp.net) para responder al chat correcto
  const replyTo = from.trim();
  const cleanFrom = from.split('@')[0].split(':')[0].replace(/\D/g, "");

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

    // Comando #aprobar o #aprobado
    if (lower.startsWith("#aprobar") || lower.startsWith("#aprobado")) {
      const numbersInText = parseRequestedNumbers(text);

      let query = supabaseAdmin
        .from("numeros")
        .select("*")
        .eq("rifa_id", rifa.id)
        .eq("estado", "reserved");

      if (numbersInText.length > 0) {
        query = query.in("numero", numbersInText);
      } else {
        // Si no especificó números, aprueba todas las reservas de este chat
        query = query.eq("cliente_telefono", replyTo);
      }

      const { data: numData } = await query;

      if (!numData || numData.length === 0) {
        await sendBotMessage(replyTo, `⚠️ No se encontraron reservas pendientes para aprobar.`);
        return;
      }

      const ids = numData.map((n) => n.id);
      const numerosConfirmados = numData.map((n) => n.numero).sort().join(", ");
      const clienteDestino = numData[0].cliente_telefono || replyTo;

      await supabaseAdmin
        .from("numeros")
        .update({ estado: "paid", pagado_en: new Date().toISOString(), expira_en: null })
        .in("id", ids);

      // Notificar al cliente con su ticket oficial
      await sendBotMessage(
        clienteDestino,
        `🎟️ *¡PAGO CONFIRMADO!*\n\nTus números son: *${numerosConfirmados}*\nJuegan con *${rifa.loteria}* (Sorteo: ${rifa.hora_sorteo}).\n\n🏆 *Premio:* $${rifa.premio.toLocaleString("es-CO")} COP.\n¡Mucha suerte! 🍀`
      );
      return;
    }

    // Comando #rechazar o #rechazado
    if (lower.startsWith("#rechazar") || lower.startsWith("#rechazado")) {
      const numbersInText = parseRequestedNumbers(text);

      let query = supabaseAdmin
        .from("numeros")
        .select("*")
        .eq("rifa_id", rifa.id)
        .eq("estado", "reserved");

      if (numbersInText.length > 0) {
        query = query.in("numero", numbersInText);
      } else {
        query = query.eq("cliente_telefono", replyTo);
      }

      const { data: numData } = await query;

      if (!numData || numData.length === 0) {
        await sendBotMessage(replyTo, `⚠️ No se encontraron reservas pendientes para rechazar.`);
        return;
      }

      const ids = numData.map((n) => n.id);
      const clienteDestino = numData[0].cliente_telefono || replyTo;

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

      await sendBotMessage(
        clienteDestino,
        `❌ Tu reserva de números no pudo ser confirmada y los números fueron liberados nuevamente.`
      );
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
      .eq("cliente_telefono", replyTo)
      .eq("estado", "reserved");

    if (reservas && reservas.length > 0) {
      const nums = reservas.map((r) => r.numero).join(", ");
      await sendBotMessage(
        replyTo,
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
      p_cliente_telefono: replyTo,
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

      await sendBotMessage(replyTo, mensajeConfirmacion);
      return;
    } else {
      const ocupados = (resultadoReserva?.ocupados || []).join(", ");
      await sendBotMessage(
        replyTo,
        `⚠️ Lo sentimos, el/los número(s) *${ocupados}* ya fueron reservados o comprados por otra persona.\n\nPor favor elige otro(s) número(s). Escribe *NUMEROS* para ver los que quedan libres.`
      );
      return;
    }
  }

  // C. Menú principal / Estado del cliente
  // Primero liberamos reservas viejas
  await supabaseAdmin.rpc("liberar_reservas_expiradas");

  // 1. Si el cliente ya tiene números reservados pendientes, recordarle el comprobante en lugar de la tabla entera
  const { data: reservasPendientes } = await supabaseAdmin
    .from("numeros")
    .select("numero")
    .eq("rifa_id", rifa.id)
    .eq("cliente_telefono", replyTo)
    .eq("estado", "reserved");

  if (reservasPendientes && reservasPendientes.length > 0) {
    const nums = reservasPendientes.map((r) => r.numero).sort().join(", ");
    await sendBotMessage(
      replyTo,
      `⏳ Tienes los números *${nums}* apartados.\n\nRecuerda enviar la foto del comprobante de transferencia por Nequi aquí mismo para confirmarte tu ticket oficial. 📸`
    );
    return;
  }

  // 2. Si el cliente ya tiene números pagados hoy, mostrarle sus números en vez de la tabla completa
  const { data: comprados } = await supabaseAdmin
    .from("numeros")
    .select("numero")
    .eq("rifa_id", rifa.id)
    .eq("cliente_telefono", replyTo)
    .eq("estado", "paid");

  const lowerText = text.toLowerCase().trim();
  const pideMenu = lowerText.includes("numero") || lowerText.includes("número") || lowerText.includes("disponible") || lowerText.includes("menu") || lowerText.includes("menú") || lowerText.includes("hola");

  if (comprados && comprados.length > 0 && !pideMenu) {
    const nums = comprados.map((p) => p.numero).sort().join(", ");
    await sendBotMessage(
      replyTo,
      `🎟️ ¡Tus números confirmados para hoy son: *${nums}*!\nJuegan hoy a las ${rifa.hora_sorteo} con *${rifa.loteria}* (Premio: $${rifa.premio.toLocaleString("es-CO")} COP). 🍀\n\nSi deseas comprar más números, escribe *NUMEROS* para ver los que quedan libres.`
    );
    return;
  }

  // 3. Menú general y lista de disponibles
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

  await sendBotMessage(replyTo, bienvenida);
}

/**
 * Procesa reacciones de emoji del vendedor (👍 para aprobar, 👎 para rechazar)
 */
export async function processReaction(payload: {
  botNumber: string;
  from: string;
  isFromMe: boolean;
  reaction: string;
}) {
  const { botNumber, from, isFromMe, reaction } = payload;
  if (!isFromMe) return; // Solo procesar reacciones hechas por el vendedor

  const cleanReaction = reaction.trim();
  const isApproval = cleanReaction === "👍" || cleanReaction === "✅" || cleanReaction === "👌";
  const isRejection = cleanReaction === "👎" || cleanReaction === "❌";

  if (!isApproval && !isRejection) return;

  const replyTo = from.trim();

  // 1. Identificar al vendedor
  let { data: vendedor } = await supabaseAdmin
    .from("vendedores")
    .select("*")
    .eq("telefono_bot", botNumber)
    .single();

  if (!vendedor) {
    const { data: vList } = await supabaseAdmin
      .from("vendedores")
      .select("*")
      .eq("activo", true)
      .limit(1);
    vendedor = vList?.[0] || null;
  }

  if (!vendedor) return;

  // 2. Obtener la rifa activa
  const { data: rifa } = await supabaseAdmin
    .from("rifas")
    .select("*")
    .eq("vendedor_id", vendedor.id)
    .eq("estado", "activa")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!rifa) return;

  // 3. Buscar reservas pendientes para este cliente/chat
  const { data: numData } = await supabaseAdmin
    .from("numeros")
    .select("*")
    .eq("rifa_id", rifa.id)
    .eq("cliente_telefono", replyTo)
    .eq("estado", "reserved");

  if (!numData || numData.length === 0) return;

  const ids = numData.map((n) => n.id);
  const numerosConfirmados = numData.map((n) => n.numero).sort().join(", ");

  if (isApproval) {
    // Confirmar pago
    await supabaseAdmin
      .from("numeros")
      .update({ estado: "paid", pagado_en: new Date().toISOString(), expira_en: null })
      .in("id", ids);

    // Enviar ticket oficial al cliente
    await sendBotMessage(
      replyTo,
      `🎟️ *¡PAGO CONFIRMADO!*\n\nTus números son: *${numerosConfirmados}*\nJuegan con *${rifa.loteria}* (Sorteo: ${rifa.hora_sorteo}).\n\n🏆 *Premio:* $${rifa.premio.toLocaleString("es-CO")} COP.\n¡Mucha suerte! 🍀`
    );
  } else if (isRejection) {
    // Liberar números
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

    // Notificar al cliente
    await sendBotMessage(
      replyTo,
      `❌ Tu reserva para los números *${numerosConfirmados}* no pudo ser confirmada y los números fueron liberados nuevamente.`
    );
  }
}
