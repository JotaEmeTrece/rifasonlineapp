# Registro de Decisiones de Arquitectura (ADR)

## ADR 001: Arquitectura de Rifas Diarias vía WhatsApp Bot con Coexistencia y Next.js

* **Fecha:** 12 de Octubre de 2026
* **Estado:** Aceptado

---

### 1. Contexto

La aplicación original constaba de un frontend en Next.js y un backend monolítico en Express (`/server`) con conexión a una base de datos en Supabase (ya extinta) y un panel web para compra de rifas genéricas (USD/Bs). 

Se requiere migrar a un modelo de negocio de rifas diarias automatizadas en Colombia con las siguientes características:
1. **Atención 100% conversacional vía WhatsApp:** Ni los compradores ni los vendedores usan interfaces web para el flujo de compra.
2. **Parámetros de la rifa fijos:** 100 números (del 00 al 99), costo por número de $2.000 COP, premio de $100.000 COP.
3. **Múltiples vendedores independientes:** Cada vendedor gestiona su propia rifa diaria con su propia base de clientes y recibe pagos a su cuenta de Nequi.
4. **Liquidación:** Al venderse los 100 números ($200.000 COP totales), se pagan $100.000 COP de premio y el remanente ($100.000 COP) se divide en 50% para el vendedor ($50.000 COP) y 50% para el proveedor de la plataforma ($50.000 COP).
5. **Aprobación de pagos:** El comprador transfiere por Nequi y envía comprobante al chat. El vendedor aprueba o rechaza directamente desde WhatsApp.

---

### 2. Decisiones

#### 2.1 Eliminación del servidor Express y adopción de Next.js Route Handlers
* Se elimina por completo el backend en Express (`server/`).
* Toda la lógica de backend (webhooks de Meta, APIs internas y cron jobs) se implementa mediante **Route Handlers de Next.js** (App Router) alojados en **Vercel**.

#### 2.2 Integración con Meta WhatsApp Cloud API y Coexistencia
* Se adopta la función oficial de **Coexistencia de Meta** (`whatsapp_business_app_onboarding`):
  * Permite que el vendedor mantenga instalada la aplicación **WhatsApp Business** en su dispositivo móvil.
  * La **Cloud API** se conecta al mismo número en paralelo para que el bot responda automáticamente las consultas, reservas y recepción de comprobantes.
  * Los mensajes enviados por el vendedor desde su app móvil se monitorean a través del evento de webhook `smb_message_echoes`.
* **Propiedad de las líneas:** El administrador adquiere y custodia las tarjetas SIM físicas (garantizando que la base de clientes y los números pertenezcan al negocio). El vendedor vincula su WhatsApp Business recibiendo únicamente el código OTP de activación provisto por el administrador.

#### 2.3 Reglas de Negocio de la Rifa
* **Reserva temporal:** Al seleccionar números, el cliente tiene **15 minutos** para enviar el comprobante antes de que el sistema libere los números a estado `available`.
* **Regla de sorteo no lleno:** Si llega la hora programada del sorteo (según la lotería elegida por el vendedor, ej. Sinuano Noche) y no se han vendido los 100 números, **la rifa no se juega ese día**. Se traslada automáticamente al siguiente sorteo oficial de esa misma lotería una vez completada la venta total.
* **Registro de ganador:** El vendedor ingresa el número ganador al sistema y el bot notifica a todos los participantes.

#### 2.4 Aprobación de Comprobantes
* El cliente envía la imagen del comprobante de Nequi al chat con el bot.
* El vendedor visualiza la foto directamente en su app de WhatsApp Business.
* El vendedor valida y responde con comando en el chat (ej: `#aprobar` o `#rechazar`), detectado mediante el webhook `smb_message_echoes`.

#### 2.5 Base de Datos (Supabase)
* Se provisionará un nuevo proyecto en Supabase (PostgreSQL).
* Se diseñará un esquema con transacciones atómicas para reservas de números, previniendo condiciones de carrera (doble venta simultánea).

---

### 3. Consecuencias

#### Positivas:
* **Simplicidad de infraestructura:** Despliegue unificado en Vercel sin servidores que mantener.
* **Retención de activos:** Los números de WhatsApp y las carteras de clientes quedan bajo control del administrador aunque cambien los vendedores.
* **Fricción mínima para el vendedor:** El vendedor utiliza la interfaz familiar de WhatsApp Business en su celular.
* **Costos operativos bajos:** La atención del bot ocurre dentro de la ventana de servicio de 24 horas iniciada por el cliente (costo de conversación gratuita en Meta Cloud API).

#### Mitigaciones requeridas:
* Monitoreo de límites de números en Meta (inicia con 2 números hasta completar verificación de negocio para ampliar hasta 20).
* Adherencia a buenas prácticas operativas de mensajería para mitigar riesgos de bloqueos automáticos en Meta.

---

## ADR 002: Transición de Meta Cloud API a Baileys en Railway (Modelo Gateway)

* **Fecha:** 13 de Octubre de 2026
* **Estado:** Aceptado

---

### 1. Contexto

Durante la verificación en Meta Cloud API, los sistemas de seguridad de Meta bloquearon la cuenta comercial (Error 131031: `Business Account locked`), exigiendo verificación formal de negocio con documentos legales de empresa y dominio web corporativo de nivel superior (rechazando subdominios `.vercel.app`). Adicionalmente, las políticas de Meta prohíben estrictamente rifas sin licencia estatal de juegos (Coljuegos).

---

### 2. Decisiones

#### 2.1 Adopción de Baileys sobre WhatsApp Web / Multi-Device
* Se descarta Meta Cloud API para evitar fricciones de verificación corporativa y bloqueos definitivos por políticas de juegos de azar.
* Se adopta **Baileys** (vía conexión por código QR / Dispositivos vinculados) para conectar las SIMs físicas de los vendedores.

#### 2.2 Despliegue en Railway (Modelo Gateway)
* Se implementa un micro-servicio liviano de Baileys desplegado en **Railway** (consumo < 100MB RAM) para mantener la conexión TCP/WebSocket activa 24/7 sin costo inicial.
* **Separación de responsabilidades (Gateway):**
  * **Railway (Baileys):** Solo maneja el socket de WhatsApp. Al recibir un mensaje, lo reenvía vía HTTP webhook a Next.js en Vercel. Expone un endpoint `/send` para enviar mensajes.
  * **Vercel (Next.js):** Contiene 100% de la lógica de negocio (rifas, reservas de 15 min, aprobación de pagos, estados). Se despliega de forma instantánea sin reiniciar el socket de Railway.

#### 2.3 Mitigación de Baneos
* Tráfico estrictamente **inbound** (el cliente inicia la conversación; el bot nunca hace spam masivo).
* Volumen bajo controlado (máximo 100 números diarios por vendedor).
* Simulación de presencia (estado "escribiendo...") antes de responder.

---

### 3. Consecuencias

#### Positivas:
* **Cero burocracia:** Sin necesidad de verificar negocio en Meta, sin necesidad de comprar dominios ni presentar registros fiscales.
* **Costo $0 inicial:** Se aprovecha el crédito inicial de prueba de Railway y el hosting gratuito de Vercel/Supabase.
* **Coexistencia nativa:** El vendedor mantiene su WhatsApp en el celular mientras el bot atiende como dispositivo vinculado.

---

## ADR 003: Manejo Asíncrono en Vercel Serverless y Soporte Universal para WhatsApp LIDs

* **Fecha:** 13 de Octubre de 2026
* **Estado:** Aceptado

---

### 1. Contexto

Durante las pruebas iniciales de interacción extremo a extremo entre clientes de WhatsApp y el bot:
1. Las peticiones enviadas por el Gateway de Railway a Vercel respondían `200 OK` en 10ms, pero la lógica de negocio (`processIncomingMessage`) no se ejecutaba ni respondía en WhatsApp.
2. Al enviar mensajes desde clientes móviles de WhatsApp contemporáneos, los remitentes no utilizaban el número de teléfono estándar (`@s.whatsapp.net`), sino identificadores de privacidad **LID (Linked IDs)** asignados por Meta (`@lid`).
3. El Gateway forzaba la normalización a `@s.whatsapp.net`, causando que los mensajes dirigidos a LIDs se enviaran a destinos inválidos y fueran descartados por los servidores de WhatsApp.

---

### 2. Decisiones

#### 2.1 Await obligatorio en Vercel Route Handlers
* Las funciones Serverless en Vercel (AWS Lambda) congelan o terminan el proceso de ejecución en cuanto se retorna la respuesta HTTP.
* Se reescribió `app/api/webhooks/whatsapp/route.ts` para que la llamada a `processIncomingMessage` sea síncronamente esperada mediante `await`:
  * El ciclo de vida de la función se mantiene activo mientras se consulta Supabase y se despacha la respuesta a través del micro-servicio de Railway (~1-3 segundos).

#### 2.2 Preservación de JIDs Nativos (Soporte Dual `@lid` y `@s.whatsapp.net`)
* El Gateway de Baileys (`bot-gateway/index.js`) y el motor conversacional (`lib/bot-engine.ts`) ahora preservan el JID nativo del remitente (`remoteJid`), reconociendo tanto `@s.whatsapp.net` como `@lid`.
* Al enviar mensajes salientes (`/send`), si el destinatario incluye `@lid` o `@s.whatsapp.net`, se despacha directamente a ese socket sin alterar el dominio. Si es un número sin sufijo, se normaliza a `@s.whatsapp.net`.
* En la base de datos, las reservas se asocian al JID nativo del cliente (`replyTo`), garantizando que las notificaciones de confirmación de pago (`#aprobar`) lleguen al chat correspondiente sin importar el tipo de identificador.

#### 2.3 Extracción de Contenido de Mensajes Temporales
* Se implementó una función desglosadora recursiva (`extractMessageContent`) que desempaqueta mensajes independientemente de si están contenidos en `ephemeralMessage` (mensajes temporales), `viewOnceMessage` o mensajes directos estándar.

#### 2.4 Observabilidad y Trazabilidad en Tiempo Real
* Se agregaron registros estructurados en la consola del Gateway para monitorear cada mensaje entrante, el reenvío al webhook de Vercel y el estatus de entrega en WhatsApp.

---

### 3. Consecuencias

#### Positivas:
* **Fiabilidad absoluta:** Eliminación total de caídas silenciosas por congelamiento de contenedores Serverless.
* **Compatibilidad 100% con clientes modernos:** Cobertura de chats privados con identificadores LID y chats tradicionales con números de teléfono.
* **Trazabilidad completa:** Visibilidad inmediata de cada interacción en los logs de producción de Railway.

