# Backlog de Tareas, Mejoras y Correcciones (PENDIENTES.md)

Este documento registra todas las tareas pendientes, correcciones detectadas y mejoras planificadas del sistema.
**Regla de uso:** Cada tarea pasa por el ciclo: `[PENDIENTE]` ➔ `[EN PROCESO]` ➔ `[IMPLEMENTADA]`. Una vez implementada, validada y aprobada por el usuario, se traslada a `ADR.md` (si involucra una decisión de arquitectura) y se marca como cerrada aquí para que ningún agente intente rehacer trabajo ya finalizado.

---

## 🚨 Bugs y Correcciones Prioritarias

### 1. Detección Estricta de Números en `parseRequestedNumbers` (Evitar falsos positivos en textos largos)
* **Estado:** `[PENDIENTE]`
* **Evidencia:** Un usuario envió una noticia de actualidad que contenía cifras y fechas dispersas en el texto. El bot extrajo automáticamente 10 números de 2 dígitos y disparó una reserva no solicitada de 10 números por $20.000 COP.
* **Causa técnica:** La función `parseRequestedNumbers` extrae cualquier secuencia `\b\d{1,2}\b` presente en cualquier parte del mensaje sin validar la intención del usuario ni la estructura del texto.
* **Solución acordada:**
  1. Si el mensaje supera cierta longitud (ej: > 35 caracteres) y tiene estructura de prosa/párrafo, no intentar apartar números automáticamente.
  2. Requerir que el mensaje sea conciso y compuesto principalmente por números (ej: `"07 47"`, `"el 15 y el 32"`, `"10, 20, 30"`).
  3. Ignorar enlaces, mensajes reenviados largos y textos informativos.

---

## 🎨 Funcionalidades de Experiencia y Diseño

### 2. Generación Dinámica de Ticket Oficial en Imagen Gráfica
* **Estado:** `[PENDIENTE]`
* **Descripción:** Reemplazar el ticket de texto básico por una imagen visualmente atractiva (formato recibo/ticket oficial de rifa) que el bot envíe al cliente como archivo adjunto de imagen una vez confirmado el pago.
* **Elementos del diseño a definir:**
  - Logo y cabecera de la Rifa Diaria.
  - Números comprados destacados en gran tamaño.
  - Sorteo y hora (Lotería y hora fijada por el vendedor).
  - Premio ($100.000 COP).
  - Código único de comprobante / Hash de seguridad.
  - Estado: PAGADO / CONFIRMADO.

---

## 💼 Panel Web, Administración y Liquidaciones

### 3. Dashboard Web Administrativo y Vistas por Vendedor
* **Estado:** `[PENDIENTE]`
* **Descripción:** Panel web responsivo donde el administrador pueda ver a todos los vendedores y donde cada vendedor pueda ingresar con su acceso para ver en tiempo real:
  - Números vendidos, reservados y libres en cuadrícula interactiva.
  - Total recaudado en tiempo real.
  - Configuración de su Nequi y lotería del día.

### 4. Cierre de Sorteo, Registro de Ganador y Liquidación 50/50
* **Estado:** `[PENDIENTE]`
* **Descripción:** Flujo para registrar el número ganador oficial de la lotería al final de la jornada.
  - Notificación automática por WhatsApp al cliente ganador.
  - Liquidación del pote ($200.000 COP total por rifa de 100 números):
    - $100.000 COP para el ganador.
    - $50.000 COP ganancia del vendedor.
    - $50.000 COP ganancia de la plataforma.

---

## 📱 Operación e Infraestructura

### 5. Onboarding de Vendedores con WhatsApp Business Dedicado
* **Estado:** `[PENDIENTE]`
* **Descripción:** Protocolo para enrolar nuevos vendedores con número exclusivo (SIM Card dedicada en WhatsApp Business) para evitar colisiones con mensajes personales de los vendedores.

---

## ✅ Historial de Tareas Completadas

* `[IMPLEMENTADA]` **ADR 001:** Arquitectura desacoplada Micro-servicio Baileys + Next.js Serverless + Supabase.
* `[IMPLEMENTADA]` **ADR 002:** Micro-servicio autónomo de WhatsApp Gateway con Baileys en Railway.
* `[IMPLEMENTADA]` **ADR 003:** Await obligatorio en Vercel Route Handlers y soporte universal para WhatsApp LIDs (`@lid`).
* `[IMPLEMENTADA]` **ADR 004:** UX conversacional optimizada, comando `#sorteo [Lotería] [Hora]`, silencio en errores y enlace directo a WhatsApp en caso de rechazo.
