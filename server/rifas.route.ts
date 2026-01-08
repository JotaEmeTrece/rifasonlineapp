// FILE: server/rifas.route.ts (VERSIÓN EXTENDIDA CON LOGIN ADMIN + JWT)

import express, { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabaseClient.js';

const rifasRouter: Router = express.Router();

// -----------------------------
// CONFIG JWT
// -----------------------------
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';
const JWT_EXPIRES_IN = '7d';

// -----------------------------
// UTILIDAD: Enviar WhatsApp
// -----------------------------
const sendWhatsAppNotification = async (to: string, templateId: string, data: any) => {
    console.log(`[WS_NOTIFICATION] Enviando mensaje '${templateId}' a ${to} con datos:`, data);
};

// -----------------------------
// INTERFACES
// -----------------------------
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
    rango_maximo: number;
    image_url?: string;
    moneda?: string;
}

interface ReservaBody {
    rifa_id: string;
    numero: string;
    user_whatsapp: string;
    full_name: string;
    payment_ref: string;
    banco_cliente: string;
}

interface ConfirmPaymentBody {
    rifa_id: string;
    numero: string;
}

// ======================================================
// =============== LOGIN ADMIN + JWT =====================
// ======================================================

/**
 * POST /admin/login
 * BODY: { email, password }
 * Devuelve: { token }
 */
rifasRouter.post('/admin/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email y password requeridos.' });
        }

        // Buscar admin en Supabase
        const { data: admin, error } = await supabaseAdmin
            .from('admins')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !admin) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
        }

        // Comparar password
        const isMatch = await bcrypt.compare(password, admin.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Password incorrecto.' });
        }

        // Generar JWT
        const token = jwt.sign({ admin_id: admin.id, email: admin.email }, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });

        return res.status(200).json({ success: true, token });
    } catch (err) {
        console.error('Error en /admin/login:', err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Middleware para validar token
const requireAdmin = (req: Request, res: Response, next: Function) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token no proporcionado.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        (req as any).admin = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token inválido o expirado.' });
    }
};

// ======================================================
// =============== RUTAS DEL SISTEMA =====================
// ======================================================

/** GET /api/rifas */
rifasRouter.get('/', async (_req: Request, res: Response) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('rifas')
            .select('id, nombre, precio_numero, rango_maximo, fecha_sorteo, datos_pago_admin, image_url, moneda')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: 'Error al listar rifas.' });
        }

        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error interno.' });
    }
});

/** GET /api/rifas/:rifaId */
rifasRouter.get('/:rifaId', async (req: Request, res: Response) => {
    try {
        const { rifaId } = req.params;
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

        if (!rifaId || !uuidRegex.test(rifaId)) {
            return res.status(400).json({ success: false, message: 'ID inválido.' });
        }

        const { data: rifa, error } = await supabaseAdmin
            .from('rifas')
            .select('id, nombre, precio_numero, rango_maximo, datos_pago_admin, fecha_sorteo, image_url, moneda')
            .eq('id', rifaId)
            .single();

        if (error || !rifa) {
            return res.status(404).json({ success: false, message: 'Rifa no encontrada.' });
        }

        return res.status(200).json({ success: true, data: { ...rifa, precio_numero: parseFloat(rifa.precio_numero) } });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error interno.' });
    }
});

// ======================================================
// =============== CREACIÓN DE RIFA ======================
// ======================================================

rifasRouter.post('/create', requireAdmin, async (req: Request<{}, {}, RifasBody>, res: Response) => {
    try {
        const { nombre, precio_numero, fecha_sorteo, datos_pago_admin, rango_maximo, image_url, moneda } = req.body;

        if (moneda && moneda !== 'USD' && moneda !== 'Bs') {
            return res.status(400).json({ error: 'Moneda inválida. Use USD o Bs.' });
        }

        const monedaValor = moneda === 'Bs' ? 'Bs' : 'USD';
        const imageUrlClean = image_url && image_url.trim().length > 0 ? image_url.trim() : null;

        if (rango_maximo <= 0 || !Number.isInteger(rango_maximo)) {
            return res.status(400).json({ error: 'El rango máximo debe ser un entero positivo.' });
        }

        const { data: rifa, error: rifaError } = await supabaseAdmin
            .from('rifas')
            .insert({ nombre, precio_numero, fecha_sorteo, datos_pago_admin, rango_maximo, image_url: imageUrlClean, moneda: monedaValor })
            .select()
            .single();

        if (rifaError) {
            return res.status(500).json({ error: 'Error al crear la rifa principal.' });
        }

        const rifaId = rifa.id;
        const padding = String(rango_maximo).length;
        const numerosToInsert = [];

        for (let i = 0; i <= rango_maximo; i++) {
            numerosToInsert.push({
                rifa_id: rifaId,
                numero: String(i).padStart(padding, '0'),
                status: 'available'
            });
        }

        const { error: numerosError } = await supabaseAdmin.from('numeros').insert(numerosToInsert);

        if (numerosError) {
            await supabaseAdmin.from('rifas').delete().eq('id', rifaId);
            return res.status(500).json({ error: 'Error al generar números.' });
        }

        return res.status(201).json({ message: 'Rifa creada correctamente.', rifaId });
    } catch (err) {
        return res.status(500).json({ error: 'Error interno.' });
    }
});

// ======================================================
// =============== RESERVA DE NÚMERO =====================
// ======================================================

rifasRouter.post('/reserve', async (req: Request<{}, {}, ReservaBody>, res: Response) => {
    try {
        const supabaseClient = supabaseAdmin;
        const { rifa_id, numero, user_whatsapp, full_name, payment_ref, banco_cliente } = req.body;

        const { data: numeroActual } = await supabaseClient
            .from('numeros')
            .select('status, expires_at')
            .eq('rifa_id', rifa_id)
            .eq('numero', numero)
            .single();

        if (!numeroActual) {
            return res.status(404).json({ success: false, message: 'Número inexistente.' });
        }

        const isExpired = numeroActual.status === 'reserved' && new Date(numeroActual.expires_at).getTime() < Date.now();

        if ((numeroActual.status === 'reserved' && !isExpired) || numeroActual.status === 'paid') {
            return res.status(409).json({ success: false, message: 'Número ya ocupado.' });
        }

        const expiresAtISO = new Date(Date.now() + 180 * 60000).toISOString();

        const { data, error } = await supabaseClient
            .from('numeros')
            .update({
                status: 'reserved',
                user_whatsapp,
                full_name,
                reserved_at: new Date().toISOString(),
                expires_at: expiresAtISO,
                payment_ref,
                banco_cliente,
            })
            .eq('rifa_id', rifa_id)
            .eq('numero', numero)
            .select();

        if (error) {
            return res.status(500).json({ success: false, message: 'Error al reservar.' });
        }

        await sendWhatsAppNotification(user_whatsapp, 'reserva_provisional', {
            numero,
            nombre: full_name,
            expires_at: expiresAtISO,
        });

        return res.status(200).json({ success: true, message: 'Reservado correctamente.', data: data[0] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error interno.' });
    }
});

// ======================================================
// =============== CONFIRMAR PAGO ========================
// ======================================================

rifasRouter.post('/confirm-payment', requireAdmin, async (req: Request<{}, {}, ConfirmPaymentBody>, res: Response) => {
    try {
        const supabaseClient = supabaseAdmin;
        const { rifa_id, numero } = req.body;

        const { data: numeroActual } = await supabaseClient
            .from('numeros')
            .select('status, user_whatsapp, full_name, payment_ref')
            .eq('rifa_id', rifa_id)
            .eq('numero', numero)
            .single();

        if (!numeroActual) {
            return res.status(404).json({ success: false, message: 'Número no existe.' });
        }

        if (numeroActual.status !== 'reserved') {
            return res.status(409).json({ success: false, message: 'No se puede confirmar.' });
        }

        const { data: updateData, error } = await supabaseClient
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

        if (error || !updateData) {
            return res.status(409).json({ success: false, message: 'No se pudo confirmar.' });
        }

        await sendWhatsAppNotification(numeroActual.user_whatsapp, 'ticket_confirmado', {
            numero,
            nombre: numeroActual.full_name,
            ref_pago: numeroActual.payment_ref,
        });

        return res.status(200).json({ success: true, message: 'Pago confirmado.', data: updateData[0] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error interno.' });
    }
});

// ======================================================
// =============== LISTAR ESTADOS ========================
// ======================================================

rifasRouter.get('/available/:rifaId', async (req: Request, res: Response) => {
    try {
        const { rifaId } = req.params;
        const { data } = await supabaseAdmin
            .from('numeros')
            .select('numero')
            .eq('rifa_id', rifaId)
            .eq('status', 'available')
            .order('numero');

        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false });
    }
});

rifasRouter.get('/paid/:rifaId', async (req: Request, res: Response) => {
    try {
        const { rifaId } = req.params;
        const { data } = await supabaseAdmin
            .from('numeros')
            .select('*')
            .eq('rifa_id', rifaId)
            .eq('status', 'paid');

        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false });
    }
});

rifasRouter.get('/reserved/:rifaId', async (req: Request, res: Response) => {
    try {
        const { rifaId } = req.params;
        const { data } = await supabaseAdmin
            .from('numeros')
            .select('*')
            .eq('rifa_id', rifaId)
            .eq('status', 'reserved');

        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false });
    }
});

export default rifasRouter;
