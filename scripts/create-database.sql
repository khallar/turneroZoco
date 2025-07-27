-- Crear base de datos sistemaTurnosZOCO
-- Script para inicializar las tablas del sistema de turnos

-- Tabla principal del estado del sistema
CREATE TABLE IF NOT EXISTS sistema_estado (
    id SERIAL PRIMARY KEY,
    numero_actual INTEGER NOT NULL DEFAULT 1,
    ultimo_numero INTEGER NOT NULL DEFAULT 0,
    total_atendidos INTEGER NOT NULL DEFAULT 0,
    numeros_llamados INTEGER NOT NULL DEFAULT 0,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    ultimo_reinicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_sync BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabla de tickets/turnos
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    numero INTEGER NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    fecha VARCHAR(100) NOT NULL,
    timestamp_ticket BIGINT NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente', -- pendiente, llamado, atendido
    UNIQUE(numero, fecha_inicio)
);

-- Tabla de backups diarios
CREATE TABLE IF NOT EXISTS backups_diarios (
    id SERIAL PRIMARY KEY,
    fecha_backup DATE NOT NULL UNIQUE,
    estado_final JSONB NOT NULL,
    resumen JSONB NOT NULL,
    tickets_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabla de logs del sistema
CREATE TABLE IF NOT EXISTS sistema_logs (
    id SERIAL PRIMARY KEY,
    accion VARCHAR(100) NOT NULL,
    detalles JSONB,
    timestamp_log BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_tickets_numero ON tickets(numero);
CREATE INDEX IF NOT EXISTS idx_tickets_fecha ON tickets(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets(estado);
CREATE INDEX IF NOT EXISTS idx_backups_fecha ON backups_diarios(fecha_backup);
CREATE INDEX IF NOT EXISTS idx_sistema_logs_accion ON sistema_logs(accion);
CREATE INDEX IF NOT EXISTS idx_sistema_logs_timestamp ON sistema_logs(timestamp_log);

-- Insertar estado inicial si no existe
INSERT INTO sistema_estado (
    numero_actual, 
    ultimo_numero, 
    total_atendidos, 
    numeros_llamados, 
    fecha_inicio, 
    ultimo_reinicio,
    last_sync
) 
SELECT 1, 0, 0, 0, CURRENT_DATE, NOW(), EXTRACT(EPOCH FROM NOW()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM sistema_estado WHERE fecha_inicio = CURRENT_DATE);

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_sistema_estado_updated_at ON sistema_estado;
CREATE TRIGGER update_sistema_estado_updated_at
    BEFORE UPDATE ON sistema_estado
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para limpiar datos antiguos (más de 30 días)
CREATE OR REPLACE FUNCTION limpiar_datos_antiguos()
RETURNS void AS $$
BEGIN
    -- Limpiar backups antiguos
    DELETE FROM backups_diarios 
    WHERE fecha_backup < CURRENT_DATE - INTERVAL '30 days';
    
    -- Limpiar logs antiguos
    DELETE FROM sistema_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Log de limpieza
    INSERT INTO sistema_logs (accion, detalles, timestamp_log)
    VALUES ('LIMPIEZA_AUTOMATICA', '{"descripcion": "Limpieza de datos antiguos"}', EXTRACT(EPOCH FROM NOW()) * 1000);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE sistema_estado IS 'Estado principal del sistema de turnos';
COMMENT ON TABLE tickets IS 'Tickets/turnos generados por los clientes';
COMMENT ON TABLE backups_diarios IS 'Backups automáticos diarios del sistema';
COMMENT ON TABLE sistema_logs IS 'Logs de acciones del sistema';
