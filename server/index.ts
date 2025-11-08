// FILE: server/index.ts
import rifasRouter from './rifas.route.js';
import express, { Request, Response } from 'express';
import { supabaseAdmin } from './supabaseClient.js';


// Middlewares y configuración
const app = express();
const PORT = process.env.PORT || 3001;
app.use(express.json());


// Ruta de prueba
app.get('/', (req: Request, res: Response) => {
res.send('API de AppRifas activa. Puerto: ' + PORT);
});


// Rutas de negocio
app.use('/api/rifas', rifasRouter);


// Iniciar servidor
app.listen(PORT, () => {
console.log(`⚡️[server]: Servidor corriendo en http://localhost:${PORT}`);
});