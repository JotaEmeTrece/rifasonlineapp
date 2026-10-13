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
