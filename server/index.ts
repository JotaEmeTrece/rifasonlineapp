// FILE: server/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import rifasRouter from './rifas.route.js';
import adminRouter from './admin.route.js'; // 👈 Importamos el router de admins
import { supabaseAdmin } from './supabaseClient.js';

// Inicialización
const app = express();
const PORT = process.env.PORT || 3001;

// ====== 🔥 CORS CONFIG (AGREGADO) ======
app.use(
  cors({
    origin: "http://localhost:3000", // frontend
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
// =======================================

// Middlewares
app.use(express.json());

// Ruta base de prueba
app.get('/', (req: Request, res: Response) => {
  res.send('API de AppRifas activa. Puerto: ' + PORT);
});

// Rutas de negocio
app.use('/api/rifas', rifasRouter);
app.use('/api/admins', adminRouter); // 👈 Nueva ruta para autenticación de admin

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`⚡️[server]: Servidor corriendo en http://localhost:${PORT}`);
});
