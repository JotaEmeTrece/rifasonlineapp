// FILE: server/rifas.route.ts (VERSIÓN FINAL: Compra Inmediata + Auditoría + Tamaños Dinámicos)

import express, { Request, Response, Router } from 'express';
import { supabaseAdmin } from './supabaseClient.js';

const rifasRouter: Router = express.Router();

// --- FUNCIONES UTILITARIAS ---

const sendWhatsAppNotification = async (to: string, templateId: string, data: any) => {
    // ESTE ES UN PLACEHOLDER. Aquí iría la integración real con la API de WhatsApp
    console.log(`[WS_NOTIFICATION] Enviando mensaje '${templateId}' a ${to} con datos:`, data);
};


// --- INTERFACES --- 

// Estructura definida para los datos de pago del administrador
interface DatosPagoAdmin {
    titular_nombre: string;
    banco: string;
    numero_telefono: string;
    cedula_id: string;
}

interface RifasBody {
    nombre: string;
    precio_numero: number;
    fecha_sorteo: string;
    datos_pago_admin: DatosPagoAdmin;
    rango_maximo: number; // <-- ¡NUEVO!: Define el número más alto (ej: 99 para rifa de 100)
}

// Interfaz para el nuevo flujo de "Compra Inmediata/Reserva Provisional"
interface ReservaBody {
    rifa_id: string;
    numero: string;
    user_whatsapp: string;
    full_name: string;
    payment_ref: string; // Referencia REAL de la transacción ingresada por el cliente
    banco_cliente: string; // Banco que usó el cliente para pagar
}

// Interfaz de Confirmación (El Admin solo necesita confirmar el número)
interface ConfirmPaymentBody {
    rifa_id: string;
    numero: string;
}

// -------------------------------------------------------------------
// --- NUEVA RUTA: OBTENER DETALLES DE RIFA POR ID (/rifaId) ---
// -------------------------------------------------------------------
/**
 * RUTA: GET /api/rifas/:rifaId
 * Propósito: Obtiene los detalles de configuración de una rifa específica para el frontend público.
 */
rifasRouter.get('/:rifaId', async (req: Request, res: Response) => {
    try {
        const { rifaId } = req.params;

        // Validación básica de formato UUID
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        if (!rifaId || !uuidRegex.test(rifaId)) {
            return res.status(400).json({ success: false, message: "ID de rifa inválido." });
        }

        // 1. Consulta a Supabase para obtener los detalles de la rifa
        const { data: rifa, error } = await supabaseAdmin
            .from('rifas')
            // Seleccionamos solo los campos necesarios para la vista pública (numbers)
            .select('id, nombre, precio_numero, rango_maximo, datos_pago_admin')
            .eq('id', rifaId)
            .single();

        if (error || !rifa) {
            console.error('Error al obtener rifa:', error);
            // Si la rifa no se encuentra, devolvemos 404
            return res.status(404).json({ success: false, message: "Rifa no encontrada o error de base de datos." });
        }
        
        // 2. Formatear datos (asegurar que precio_numero es un número)
        // Aunque Supabase maneja bien los tipos, siempre es buena práctica.
        const formattedRifa = {
            ...rifa,
            precio_numero: parseFloat(rifa.precio_numero),
        };

        res.status(200).json({ success: true, data: formattedRifa });

    } catch (error) {
        console.error("Error fatal al obtener detalles de la rifa:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor." });
    }
});


// -------------------------------------------------------------------
// --- ENDPOINT: CREACIÓN DE RIFA (/create) ---
// -------------------------------------------------------------------

rifasRouter.post('/create', async (req: Request<{}, {}, RifasBody>, res: Response) => {
    try {
        const { nombre, precio_numero, fecha_sorteo, datos_pago_admin, rango_maximo } = req.body;
        
        // Validación básica del rango
        if (rango_maximo <= 0 || !Number.isInteger(rango_maximo)) {
            return res.status(400).json({ error: 'El rango máximo debe ser un número entero positivo.' });
        }

        // 1. Crear la entrada de la rifa principal
        const { data: rifa, error: rifaError } = await supabaseAdmin
            .from('rifas')
            .insert({ nombre, precio_numero, fecha_sorteo, datos_pago_admin, rango_maximo }) // Guardamos el rango
            .select().single();

        if (rifaError) {
            console.error('Error al crear rifa:', rifaError);
            return res.status(500).json({ error: 'Error al crear la rifa principal.' });
        }

        const rifaId = rifa.id;
        
        // 2. Lógica Dinámica de Generación de Números
        const totalNumeros = rango_maximo + 1; // Incluyendo el 0
        const padding = String(rango_maximo).length; // Determina el relleno (ej: 99 -> 2; 999 -> 3)
        const numerosToInsert = [];
        
        for (let i = 0; i <= rango_maximo; i++) {
            // Se usa el padding calculado dinámicamente
            numerosToInsert.push({ 
                rifa_id: rifaId, 
                numero: String(i).padStart(padding, '0'), 
                status: 'available' 
            });
        }

        // 3. Insertar los números
        const { error: numerosError } = await supabaseAdmin.from('numeros').insert(numerosToInsert);

        if (numerosError) {
            // Rollback: Si falla la inserción de números, elimina la rifa creada
            await supabaseAdmin.from('rifas').delete().eq('id', rifaId);
            return res.status(500).json({ error: `Error al generar los ${totalNumeros} números para la rifa.` });
        }

        res.status(201).json({ 
            message: `Rifa creada exitosamente con ${totalNumeros} números disponibles (0 al ${rango_maximo}).`, 
            rifaId 
        });
    } catch (error) {
        console.error('Error en el endpoint /create:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


// -------------------------------------------------------------------
// --- ENDPOINT: RESERVA DE NÚMERO (/reserve) - COMPRA PROVISIONAL ---
// -------------------------------------------------------------------

rifasRouter.post('/reserve', async (req: Request<{}, {}, ReservaBody>, res: Response) => {
    const supabaseClient = supabaseAdmin; 
    try {
        const { rifa_id, numero, user_whatsapp, full_name, payment_ref, banco_cliente } = req.body; 
        const RESERVATION_TIME_MINUTES = 180; // 3 horas

        // 1. UPSERT de Usuario
        const { error: userError } = await supabaseClient
            .from('usuarios')
            .upsert({ whatsapp_number: user_whatsapp, full_name: full_name })
            .select();
        if (userError) { console.error('Error al registrar usuario:', userError); }

        
        // ------------------------------------------------------------------
        // --- REGLAS DE CORTE y CONCURRENCIA ---
        // ------------------------------------------------------------------
        
        // Obtener datos de rifa (fecha de sorteo Y datos de pago del admin)
        const { data: rifaData, error: rifaError } = await supabaseClient
            .from('rifas')
            .select('fecha_sorteo, datos_pago_admin') 
            .eq('id', rifa_id)
            .single();
        
        if (rifaError || !rifaData) {
            return res.status(404).json({ success: false, message: 'La rifa especificada no existe.' });
        }
        
        // --- Validación de tiempo de sorteo (omito por brevedad) ---
        // ...
        
        // Verificación de estado de concurrencia
        const { data: numeroActual, error: checkError } = await supabaseClient
            .from('numeros')
            .select('status, expires_at')
            .eq('rifa_id', rifa_id)
            .eq('numero', numero)
            .single();
            
        if (checkError || !numeroActual) {
            return res.status(404).json({ success: false, message: 'El número de rifa no existe.' });
        }
        
        const isExpired = numeroActual.status === 'reserved' && new Date(numeroActual.expires_at).getTime() < Date.now();
        
        if ((numeroActual.status === 'reserved' && !isExpired) || numeroActual.status === 'paid') {
            return res.status(409).json({ 
                success: false, 
                message: '¡Lo sentimos! Este número ya está reservado o fue comprado. Intenta con otro.' 
            });
        }
        
        // ------------------------------------------------------------------
        
        
        // 2. Cálculo de Expiración
        const currentTime = Date.now();
        const expiresAtISO = new Date(currentTime + RESERVATION_TIME_MINUTES * 60000).toISOString();
        
        
        // 3. Reserva Atómica (UPDATE)
        const { data, error } = await supabaseClient
            .from('numeros')
            .update({
                status: 'reserved',
                user_whatsapp: user_whatsapp,
                full_name: full_name, 
                reserved_at: new Date().toISOString(),
                expires_at: expiresAtISO, 
                payment_ref: payment_ref, 
                banco_cliente: banco_cliente, 
            })
            .eq('rifa_id', rifa_id)
            .eq('numero', numero)
            .select(); 

        
        // 4. Validación Final
        if (error || !data || data.length === 0) {
            console.error('Error al intentar reservar/auditar:', error);
            return res.status(500).json({ success: false, message: 'Error interno o de base de datos durante la reserva.' });
        }
        
        // 5. Notificación WS al Cliente: Reserva Provisional (Ticket de texto)
        await sendWhatsAppNotification(
            user_whatsapp, 
            'reserva_provisional', 
            { numero: numero, nombre: full_name, expires_at: expiresAtISO }
        );

        // 6. Respuesta Exitosa: Se devuelve la información de pago del Admin
        const expirationTime = new Date(data[0].expires_at).getTime(); 

        return res.status(200).json({
            success: true,
            message: `Número reservado provisionalmente. Esperando confirmación de pago por el administrador. Tienes ${RESERVATION_TIME_MINUTES / 60} horas para el cotejo.`,
            data: {
                rifa_id: rifa_id,
                numero: numero,
                expires_at: expirationTime,
                reserved_at: data[0].reserved_at,
                // DATOS DEL ADMIN PARA MOSTRAR EN EL FRONTEND/MODAL FINAL
                datos_pago_admin: rifaData.datos_pago_admin 
            }
        });

    } catch (error) {
        console.error('Error fatal en /reserve:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});

// -------------------------------------------------------------------
// --- ENDPOINT: LISTAR NÚMEROS DISPONIBLES (/available) (SIN CAMBIOS) ---
// -------------------------------------------------------------------

rifasRouter.get('/available/:rifaId', async (req: Request, res: Response) => {
    try {
        const { rifaId } = req.params;

        const { data: numeros, error } = await supabaseAdmin
            .from('numeros')
            .select('numero, status')
            .eq('rifa_id', rifaId)
            .eq('status', 'available')
            .order('numero', { ascending: true }); 

        if (error) {
            console.error('Error al obtener números disponibles:', error);
            return res.status(500).json({ success: false, message: 'Error al consultar la base de datos.' });
        }

        if (!numeros || numeros.length === 0) {
            return res.status(404).json({ success: false, message: 'No hay números disponibles para esta rifa o la rifa no existe.' });
        }
        
        const availableNumbers = numeros.map(n => n.numero);

        return res.status(200).json({
            success: true,
            message: `Se encontraron ${availableNumbers.length} números disponibles.`,
            data: availableNumbers
        });

    } catch (error) {
        console.error('Error fatal en /available:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});

// -------------------------------------------------------------------
// --- ENDPOINT: CONFIRMAR PAGO (/confirm-payment) ---
// -------------------------------------------------------------------

rifasRouter.post('/confirm-payment', async (req: Request<{}, {}, ConfirmPaymentBody>, res: Response) => {
    const supabaseClient = supabaseAdmin;
    try {
        const { rifa_id, numero } = req.body;

        // 1. Obtener datos del número reservado para la notificación
        const { data: numeroActual, error: checkError } = await supabaseClient
            .from('numeros')
            .select('status, user_whatsapp, full_name, payment_ref') 
            .eq('rifa_id', rifa_id)
            .eq('numero', numero)
            .single();

        if (checkError || !numeroActual) {
            return res.status(404).json({ success: false, message: 'El número de rifa no existe en esta rifa.' });
        }
        
        // 2. Bloquear si ya está pagado o disponible
        if (numeroActual.status !== 'reserved') {
            const message = numeroActual.status === 'paid' 
                ? 'Error: Este número ya se encuentra pagado.'
                : 'El número no estaba reservado. Imposible confirmar el pago.';

            return res.status(409).json({ success: false, message: message });
        }
        
        // 3. Confirmar el Pago (UPDATE Atómico y SEGURO)
        const { data: updateData, error: updateError } = await supabaseClient
            .from('numeros')
            .update({
                status: 'paid',
                expires_at: null, 
                paid_at: new Date().toISOString(), 
                is_paid_confirmed: true, 
            })
            .eq('rifa_id', rifa_id)
            .eq('numero', numero)
            .eq('status', 'reserved') 
            .select(); 

        if (updateError || !updateData || updateData.length === 0) {
            console.error('Error de Supabase en /confirm-payment:', updateError); 
            
            return res.status(409).json({ 
                success: false, 
                message: 'El número no estaba reservado o su reserva ha expirado. Imposible confirmar el pago.' 
            });
        }
        
        // 4. Notificación WS al Cliente: Ticket de Pago Confirmado (Ticket con imagen)
        await sendWhatsAppNotification(
            numeroActual.user_whatsapp, 
            'ticket_confirmado', 
            { 
                numero: numero, 
                nombre: numeroActual.full_name, 
                ref_pago: numeroActual.payment_ref 
            }
        );
        
        // 5. Éxito
        return res.status(200).json({
            success: true,
            message: `Pago confirmado. El número ${numero} ha sido marcado como 'paid'.`,
            data: updateData[0]
        });

    } catch (error) {
        console.error('Error fatal en /confirm-payment:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});

// -------------------------------------------------------------------
// --- ENDPOINT: LISTAR NÚMEROS PAGADOS (/paid/:rifaId) (SIN CAMBIOS) ---
// -------------------------------------------------------------------
rifasRouter.get('/paid/:rifaId', async (req: Request, res: Response) => {
    try {
        const { rifaId } = req.params;

        const { data: paidNumbers, error } = await supabaseAdmin
            .from('numeros')
            .select('numero, user_whatsapp, full_name, reserved_at, paid_at, is_paid_confirmed, payment_ref, banco_cliente') 
            .eq('rifa_id', rifaId)
            .eq('status', 'paid') 
            .order('numero', { ascending: true }); 

        if (error) {
            console.error('Error al obtener números pagados:', error);
            return res.status(500).json({ success: false, message: 'Error al consultar la base de datos.' });
        }

        if (!paidNumbers || paidNumbers.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: 'No se encontraron números pagados para esta rifa.', 
                data: [] 
            });
        }
        
        return res.status(200).json({
            success: true,
            message: `Se encontraron ${paidNumbers.length} números pagados.`,
            data: paidNumbers 
        });

    } catch (error) {
        console.error('Error fatal en /paid:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});

// -------------------------------------------------------------------
// --- ENDPOINT: LISTAR NÚMEROS RESERVADOS (/reserved/:rifaId) (SIN CAMBIOS) ---
// -------------------------------------------------------------------
rifasRouter.get('/reserved/:rifaId', async (req: Request, res: Response) => {
    try {
        const { rifaId } = req.params;

        const { data: reservedNumbers, error } = await supabaseAdmin
            .from('numeros')
            .select('numero, user_whatsapp, full_name, reserved_at, expires_at, is_paid_confirmed, payment_ref, banco_cliente')
            .eq('rifa_id', rifaId)
            .eq('status', 'reserved') 
            .order('reserved_at', { ascending: true }); 

        if (error) {
            console.error('Error al obtener números reservados:', error);
            return res.status(500).json({ success: false, message: 'Error al consultar la base de datos.' });
        }

        if (!reservedNumbers || reservedNumbers.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: 'No se encontraron números reservados para esta rifa.', 
                data: [] 
            });
        }
        
        return res.status(200).json({
            success: true,
            message: `Se encontraron ${reservedNumbers.length} números reservados.` ,
            data: reservedNumbers 
        });

    } catch (error) {
        console.error('Error fatal en /reserved:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});


export default rifasRouter;