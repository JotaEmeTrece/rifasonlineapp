# 🎟️ Rifas Online App

Plataforma web completa para la creación y venta de rifas en línea, con panel de administración y confirmación automática vía WhatsApp.

## ✨ Funcionalidades

### Cliente
- Visualización de rifas activas
- Selección de números en grilla interactiva
- Flujo de compra con registro de nombre, teléfono y referencia/captura de pago
- Recepción automática de ticket de confirmación vía **WhatsApp** al momento de aprobación

### Administrador
- Panel privado con autenticación protegida
- Creación y gestión completa de rifas
- Visualización de transacciones en tiempo real
- Confirmación y aprobación de pagos
- Dashboard con estadísticas de ventas e ingresos
- Disparo automático de ticket al cliente tras aprobación

## 🛠️ Tech Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js, TypeScript |
| Base de datos | Supabase (PostgreSQL) |
| Despliegue | Vercel |

## 📁 Estructura del proyecto

```
rifasonlineapp/
├── app/                  # Páginas Next.js (App Router)
│   ├── raffle/[id]/      # Vista de rifa individual
│   ├── raffles/          # Listado de rifas
│   └── admin/            # Panel de administración
├── components/           # Componentes reutilizables
├── server/               # API REST con Express
│   ├── rifas.route.ts    # Endpoints de rifas
│   ├── admin.route.ts    # Endpoints de administración
│   └── middleware/       # Autenticación de admin
├── context/              # Estado global (Auth)
└── lib/                  # Utilidades y cliente API
```

## 🚀 Correr localmente

### Prerrequisitos
- Node.js 18+
- pnpm
- Cuenta en Supabase

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/JotaEmeTrece/rifasonlineapp.git
cd rifasonlineapp

# Instalar dependencias del frontend
pnpm install

# Instalar dependencias del servidor
cd server
pnpm install
```

### Variables de entorno

Crea un archivo `.env` en la raíz y otro en `/server` con las siguientes variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Ejecutar

```bash
# Frontend (desde la raíz)
pnpm dev

# Backend (desde /server)
pnpm dev
```

## 📄 Licencia

MIT
