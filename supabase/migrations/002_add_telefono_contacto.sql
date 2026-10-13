-- ==============================================================
-- MIGRACIÓN 002: AGREGAR TELÉFONO DE CONTACTO PERSONAL DEL VENDEDOR
-- ==============================================================

ALTER TABLE public.vendedores 
ADD COLUMN IF NOT EXISTS telefono_contacto TEXT;

COMMENT ON COLUMN public.vendedores.telefono_contacto IS 'Número de WhatsApp personal de contacto del vendedor (opcional, para soporte o aclaraciones directas con clientes). Si no se define, se usa telefono_bot.';
