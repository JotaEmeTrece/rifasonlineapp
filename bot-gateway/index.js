require('dotenv').config();
const express = require('express');
const pino = require('pino');
const QRCode = require('qrcode');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BOT_API_KEY = process.env.BOT_API_KEY || 'rifas_secret_token_2026';
const WEBHOOK_URL = process.env.WEBHOOK_URL || '';
const AUTH_DIR = process.env.AUTH_DIR || path.join(__dirname, 'auth_info_baileys');

// Estado de la conexión
let sock = null;
let currentQR = null;
let connectionStatus = 'initializing'; // initializing | qr_ready | connected | disconnected
let botPhoneNumber = '';

// Logger silencioso para no saturar consola
const logger = pino({ level: 'silent' });

async function initWhatsApp() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: true,
    auth: state,
    browser: ['Rifas Bot', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = await QRCode.toDataURL(qr);
      connectionStatus = 'qr_ready';
      console.log('[BOT_GATEWAY] Código QR generado. Ábrelo en /qr');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      connectionStatus = 'disconnected';
      currentQR = null;
      console.log(`[BOT_GATEWAY] Conexión cerrada (${statusCode}). ¿Reconectar?:`, shouldReconnect);

      if (shouldReconnect) {
        setTimeout(initWhatsApp, 4000);
      } else {
        console.log('[BOT_GATEWAY] Sesión cerrada definitivamente. Limpia auth_dir para reiniciar.');
      }
    } else if (connection === 'open') {
      connectionStatus = 'connected';
      currentQR = null;
      botPhoneNumber = sock.user?.id ? sock.user.id.split(':')[0] : 'Conectado';
      console.log('[BOT_GATEWAY] ✅ WhatsApp Conectado exitosamente con número:', botPhoneNumber);
    }
  });

// Función auxiliar para extraer contenido incluso de mensajes temporales o efímeros
function extractMessageContent(rawMessage) {
  if (!rawMessage) return { text: '', hasImage: false };
  let m = rawMessage;
  if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
  if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
  if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
  if (m.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;

  const text = m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || '';
  const hasImage = !!m.imageMessage;
  return { text: text.trim(), hasImage };
}

  // Escuchar mensajes entrantes y reenviarlos al webhook de Next.js
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;

    for (const msg of m.messages) {
      if (!msg.message) continue;

      const remoteJid = msg.key.remoteJid || '';
      // Ignorar difusiones de estado, grupos y canales/newsletters
      if (remoteJid === 'status@broadcast' || remoteJid.includes('@g.us') || remoteJid.includes('@newsletter')) continue;

      // Identificador de destino exacto en WhatsApp (conserva @lid o @s.whatsapp.net)
      const isLid = remoteJid.endsWith('@lid');
      const cleanId = remoteJid.split('@')[0].split(':')[0];
      const targetJid = isLid ? `${cleanId}@lid` : `${cleanId}@s.whatsapp.net`;
      const isFromMe = msg.key.fromMe || false;

      // Manejar reacciones de emoji (👍 para aprobar, 👎 para rechazar)
      if (msg.message.reactionMessage) {
        const reactionEmoji = msg.message.reactionMessage.text || '';
        console.log(`[BOT_GATEWAY] 🌟 Reacción detectada en ${targetJid} (fromMe: ${isFromMe}): "${reactionEmoji}"`);
        if (WEBHOOK_URL && isFromMe) {
          try {
            const res = await axios.post(
              WEBHOOK_URL,
              {
                event: 'reaction',
                botNumber: botPhoneNumber,
                from: targetJid,
                isFromMe,
                reaction: reactionEmoji,
                targetMessageId: msg.message.reactionMessage.key?.id,
                timestamp: msg.messageTimestamp
              },
              {
                headers: {
                  'x-bot-api-key': BOT_API_KEY,
                  'Content-Type': 'application/json'
                },
                timeout: 12000
              }
            );
            console.log(`[BOT_GATEWAY] ✅ Reacción procesada por Vercel (${res.status}) para ${targetJid}`);
          } catch (err) {
            console.error(`[REACTION_FORWARD_ERROR]:`, err.message, err.response?.data || '');
          }
        }
        continue;
      }

      const { text, hasImage } = extractMessageContent(msg.message);
      const messageId = msg.key.id;

      console.log(`[BOT_GATEWAY] 📩 Mensaje recibido de ${targetJid} (fromMe: ${isFromMe}): "${text}" (hasImage: ${hasImage})`);

      // Disparar evento a Next.js en Vercel
      if (WEBHOOK_URL) {
        try {
          const res = await axios.post(
            WEBHOOK_URL,
            {
              event: 'message',
              botNumber: botPhoneNumber,
              from: targetJid,
              isFromMe,
              text,
              hasImage,
              messageId,
              timestamp: msg.messageTimestamp
            },
            {
              headers: {
                'x-bot-api-key': BOT_API_KEY,
                'Content-Type': 'application/json'
              },
              timeout: 12000
            }
          );
          console.log(`[BOT_GATEWAY] ✅ Webhook Vercel procesado exitosamente (${res.status}) para ${targetJid}`);
        } catch (err) {
          console.error(`[WEBHOOK_FORWARD_ERROR]:`, err.message, err.response?.data || '');
        }
      }
    }
  });
}

// ==============================================================
// RUTAS HTTP DEL SERVICIO
// ==============================================================

// 1. Estado del bot
app.get('/status', (req, res) => {
  res.json({
    status: connectionStatus,
    botNumber: botPhoneNumber,
    hasQR: !!currentQR
  });
});

// 2. Página web visual para escanear el QR desde el teléfono
app.get('/qr', (req, res) => {
  if (connectionStatus === 'connected') {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>WhatsApp Bot - Conectado</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white; text-align: center; }
            .box { padding: 30px; border-radius: 16px; background: #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h1 { color: #22c55e; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>✅ Conectado Exitosamente</h1>
            <p>El bot está activo y conectado con el número: <strong>+${botPhoneNumber}</strong></p>
          </div>
        </body>
      </html>
    `);
  }

  if (!currentQR) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta http-equiv="refresh" content="3">
          <title>Generando QR...</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white; text-align: center; }
          </style>
        </head>
        <body>
          <div>
            <h2>⏳ Generando código QR de WhatsApp...</h2>
            <p>Esta página se actualizará automáticamente en unos segundos.</p>
          </div>
        </body>
      </html>
    `);
  }

  return res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="15">
        <title>Escanear WhatsApp QR</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white; text-align: center; }
          .card { padding: 25px; border-radius: 16px; background: #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          img { border-radius: 8px; margin: 15px 0; background: white; padding: 10px; }
          p { color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>📱 Escanea con tu WhatsApp</h2>
          <p>Abre WhatsApp en tu celular > Dispositivos vinculados > Vincular un dispositivo</p>
          <img src="${currentQR}" alt="WhatsApp QR Code" width="280" height="280" />
          <p>El código se refresca automáticamente cada 15 segundos.</p>
        </div>
      </body>
    </html>
  `);
});

// 3. Endpoint para enviar mensajes (llamado desde Vercel / Next.js)
app.post('/send', async (req, res) => {
  const apiKey = req.headers['x-bot-api-key'];
  if (apiKey !== BOT_API_KEY) {
    return res.status(403).json({ error: 'API Key inválida' });
  }

  if (connectionStatus !== 'connected' || !sock) {
    return res.status(503).json({ error: 'WhatsApp no está conectado en el bot' });
  }

  const { to, text } = req.body;
  if (!to || !text) {
    return res.status(400).json({ error: 'Campos to y text son obligatorios' });
  }

  try {
    const rawTo = to.toString().trim();
    let jid = rawTo;
    if (!jid.includes('@')) {
      const cleanNumber = jid.replace(/\D/g, '');
      jid = `${cleanNumber}@s.whatsapp.net`;
    }

    console.log(`[BOT_GATEWAY] 📤 Enviando mensaje a ${jid}...`);

    // Simular presencia de escritura durante 1 segundo para emular humano
    await sock.sendPresenceUpdate('composing', jid);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await sock.sendPresenceUpdate('paused', jid);

    // Enviar el mensaje de texto
    const sent = await sock.sendMessage(jid, { text });

    console.log(`[BOT_GATEWAY] ✅ Mensaje entregado exitosamente a ${jid} (ID: ${sent.key.id})`);
    return res.json({ success: true, messageId: sent.key.id });
  } catch (err) {
    console.error('[SEND_MESSAGE_ERROR]:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[BOT_GATEWAY] Servidor escuchando en el puerto ${PORT}`);
  initWhatsApp();
});
