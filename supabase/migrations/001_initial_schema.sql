-- ==============================================================
-- MIGRACIÓN 001: ESQUEMA INICIAL DE RIFAS DIARIAS VÍA WHATSAPP
-- ==============================================================

-- 1. Tabla de Vendedores
CREATE TABLE IF NOT EXISTS public.vendedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    telefono_bot TEXT UNIQUE NOT NULL,      -- Número de WhatsApp donde corre el bot del vendedor (ej: 573019314319)
    nequi_numero TEXT NOT NULL,             -- Número de Nequi donde pagan los clientes
    nequi_titular TEXT NOT NULL,            -- Nombre del titular de Nequi
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de Rifas
CREATE TABLE IF NOT EXISTS public.rifas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id UUID NOT NULL REFERENCES public.vendedores(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    loteria TEXT NOT NULL DEFAULT 'Sinuano Noche',
    hora_sorteo TEXT NOT NULL DEFAULT '22:30',
    precio_numero INTEGER NOT NULL DEFAULT 2000,
    premio INTEGER NOT NULL DEFAULT 100000,
    total_numeros INTEGER NOT NULL DEFAULT 100,
    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'reprogramada', 'finalizada', 'cancelada')),
    numero_ganador VARCHAR(2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabla de Números (100 números por rifa)
CREATE TABLE IF NOT EXISTS public.numeros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rifa_id UUID NOT NULL REFERENCES public.rifas(id) ON DELETE CASCADE,
    numero VARCHAR(2) NOT NULL,
    estado TEXT NOT NULL DEFAULT 'available' CHECK (estado IN ('available', 'reserved', 'paid')),
    cliente_telefono TEXT,
    cliente_nombre TEXT,
    reservado_en TIMESTAMPTZ,
    expira_en TIMESTAMPTZ,
    comprobante_url TEXT,
    pagado_en TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_rifa_numero UNIQUE (rifa_id, numero)
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_numeros_rifa_estado ON public.numeros(rifa_id, estado);
CREATE INDEX IF NOT EXISTS idx_numeros_expira_en ON public.numeros(expira_en) WHERE estado = 'reserved';
CREATE INDEX IF NOT EXISTS idx_numeros_cliente ON public.numeros(cliente_telefono);

-- 4. Tabla de Sesiones de Conversación del Bot
CREATE TABLE IF NOT EXISTS public.sesiones_bot (
    cliente_telefono TEXT NOT NULL,
    vendedor_id UUID NOT NULL REFERENCES public.vendedores(id) ON DELETE CASCADE,
    rifa_id UUID REFERENCES public.rifas(id) ON DELETE SET NULL,
    paso TEXT NOT NULL DEFAULT 'inicio',
    datos JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (cliente_telefono, vendedor_id)
);

-- ==============================================================
-- FUNCIONES ATÓMICAS EN BASE DE DATOS
-- ==============================================================

-- Función para liberar números con reservas que pasaron de 15 minutos
CREATE OR REPLACE FUNCTION public.liberar_reservas_expiradas()
RETURNS integer AS $$
DECLARE
    afectados integer;
BEGIN
    UPDATE public.numeros
    SET estado = 'available',
        cliente_telefono = NULL,
        cliente_nombre = NULL,
        reservado_en = NULL,
        expira_en = NULL,
        comprobante_url = NULL,
        updated_at = now()
    WHERE estado = 'reserved'
      AND expira_en < now();

    GET DIAGNOSTICS afectados = ROW_COUNT;
    RETURN afectados;
END;
$$ LANGUAGE plpgsql;

-- Función para crear una rifa y generar automáticamente sus 100 números (00 a 99)
CREATE OR REPLACE FUNCTION public.crear_rifa_con_numeros(
    p_vendedor_id UUID,
    p_fecha DATE DEFAULT CURRENT_DATE,
    p_loteria TEXT DEFAULT 'Sinuano Noche',
    p_hora_sorteo TEXT DEFAULT '22:30',
    p_precio INTEGER DEFAULT 2000,
    p_premio INTEGER DEFAULT 100000
)
RETURNS UUID AS $$
DECLARE
    v_rifa_id UUID;
    i INTEGER;
BEGIN
    -- Crear la rifa
    INSERT INTO public.rifas (
        vendedor_id, fecha, loteria, hora_sorteo, precio_numero, premio, total_numeros, estado
    ) VALUES (
        p_vendedor_id, p_fecha, p_loteria, p_hora_sorteo, p_precio, p_premio, 100, 'activa'
    ) RETURNING id INTO v_rifa_id;

    -- Generar los números del 00 al 99
    FOR i IN 0..99 LOOP
        INSERT INTO public.numeros (
            rifa_id, numero, estado
        ) VALUES (
            v_rifa_id, LPAD(i::text, 2, '0'), 'available'
        );
    END LOOP;

    RETURN v_rifa_id;
END;
$$ LANGUAGE plpgsql;

-- Función para reservar números de forma atómica (previene doble venta simultánea)
CREATE OR REPLACE FUNCTION public.reservar_numeros_atomica(
    p_rifa_id UUID,
    p_numeros TEXT[],
    p_cliente_telefono TEXT,
    p_cliente_nombre TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_ocupados TEXT[];
    v_num TEXT;
    v_expira TIMESTAMPTZ := now() + interval '15 minutes';
BEGIN
    -- Primero liberamos cualquier reserva vieja expirada
    PERFORM public.liberar_reservas_expiradas();

    -- Revisar si alguno de los números solicitados ya está ocupado (pagado o reservado vigente)
    SELECT array_agg(numero) INTO v_ocupados
    FROM public.numeros
    WHERE rifa_id = p_rifa_id
      AND numero = ANY(p_numeros)
      AND (estado = 'paid' OR (estado = 'reserved' AND expira_en >= now()));

    IF v_ocupados IS NOT NULL AND array_length(v_ocupados, 1) > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Uno o más números ya están ocupados',
            'ocupados', to_jsonb(v_ocupados)
        );
    END IF;

    -- Si todos están libres, reservamos con lock
    UPDATE public.numeros
    SET estado = 'reserved',
        cliente_telefono = p_cliente_telefono,
        cliente_nombre = p_cliente_nombre,
        reservado_en = now(),
        expira_en = v_expira,
        updated_at = now()
    WHERE rifa_id = p_rifa_id
      AND numero = ANY(p_numeros);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Números reservados exitosamente',
        'numeros', to_jsonb(p_numeros),
        'expira_en', v_expira
    );
END;
$$ LANGUAGE plpgsql;
