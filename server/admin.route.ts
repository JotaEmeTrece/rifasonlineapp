// FILE: server/admin.route.ts
import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from './supabaseClient.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'clave_super_secreta_cambia_esto';

router.get('/me', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role?: string };
    return res.status(200).json({ admin: decoded });
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt:", email, password);

    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const { data, error } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();

    console.log("Admin from DB:", data, "Error:", error);

    if (error || !data) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordMatch = await bcrypt.compare(password, data.password_hash);

    console.log("Password match:", passwordMatch);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: data.id, email: data.email, role: data.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      admin: {
        id: data.id,
        email: data.email,
        role: data.role,
        created_at: data.created_at,
      },
    });
  } catch (err) {
    console.error('Error en /api/admins/login:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
