# Reglas de trabajo para el agente

1. **Siempre se itera primero con el usuario antes de ejecutar cualquier acción.** Solo cuando toda la lógica esté discutida y aprobada por el usuario se ejecuta lo acordado.

2. **Registro de decisiones (ADR).** Existe un archivo `ADR.md` en la raíz del repo. Cada vez que se haga una implementación y el usuario la testee y la apruebe, se actualiza el `ADR.md`. El archivo se mantiene con la estructura estándar de Architecture Decision Records.

3. **Gestión del backlog en `PENDIENTES.md`.** Toda nueva tarea, corrección o idea detectada se anota en `PENDIENTES.md` con su estado (`[PENDIENTE]`, `[EN PROCESO]`, `[IMPLEMENTADA]`). Ningún agente debe intentar rehacer tareas marcadas como implementadas ni descartar tareas abiertas sin autorización del usuario.

4. **Flujo de verificación y despliegue continuo.** Cualquier cambio en el código debe compilarse localmente (`pnpm build`) antes de enviarse a producción, luego desplegarse a Vercel con el token correspondiente y verificar la salud del microservicio Gateway en Railway (`/status`) antes de dar por cerrada la tarea.

5. **Arquitectura Multi-Vendedor (Multi-tenant).** Toda lógica conversacional, de base de datos o administrativa debe contemplar la independencia total de cada vendedor: número de bot propio, cuenta de Nequi, titular, lotería y hora de sorteo independientes en Supabase. Nunca se hardcodean datos de un vendedor en el código general.
