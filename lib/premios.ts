import { redis } from "./database"

export interface Premio {
  id: string
  mensaje: string
  tipo: "aleatorio" | "numero_especifico"
  numeroEspecifico?: number
  activo: boolean
  orden: number // 1, 2, o 3
}

export interface ConfiguracionPremios {
  fecha: string // YYYY-MM-DD
  premios: Premio[]
  numerosGanadores: number[] // Números que ya ganaron
}

const PREMIOS_KEY_PREFIX = "TURNOS_ZOCO:premios:"

// Obtener configuración de premios del día
export async function obtenerPremiosDia(fecha: string): Promise<ConfiguracionPremios> {
  try {
    const key = PREMIOS_KEY_PREFIX + fecha
    const config = await redis.get<ConfiguracionPremios>(key)

    if (config) {
      return config
    }

    // Crear configuración por defecto
    const configDefault: ConfiguracionPremios = {
      fecha,
      premios: [
        {
          id: "premio-1",
          mensaje: "🎉 ¡Felicitaciones! Ganaste un 10% de descuento en TODA tu compra",
          tipo: "aleatorio",
          activo: true,
          orden: 1,
        },
        {
          id: "premio-2",
          mensaje: "🎁 ¡Sorpresa! Llevate un Regalito gratis, Mostrale este Ticket al cajero para que te lo entregue.",
          tipo: "aleatorio",
          activo: true,
          orden: 2,
        },
        {
          id: "premio-3",
          mensaje: "⭐ ¡Sos el cliente del día! Disfrutá de un 20% de descuento en el TOTAL de tu compra",
          tipo: "aleatorio",
          activo: true,
          orden: 3,
        },
      ],
      numerosGanadores: [],
    }

    await redis.set(key, configDefault, { ex: 48 * 60 * 60 })
    return configDefault
  } catch (error) {
    console.error("Error al obtener premios del día:", error)
    throw error
  }
}

// Guardar configuración de premios
export async function guardarPremiosDia(config: ConfiguracionPremios): Promise<void> {
  try {
    const key = PREMIOS_KEY_PREFIX + config.fecha
    await redis.set(key, config, { ex: 48 * 60 * 60 })
  } catch (error) {
    console.error("Error al guardar premios del día:", error)
    throw error
  }
}

// Verificar si un número gana un premio
export async function verificarPremio(
  numeroTicket: number,
  fecha: string,
): Promise<{ ganador: boolean; premio?: Premio }> {
  try {
    const config = await obtenerPremiosDia(fecha)

    // Verificar si ya ganó
    if (config.numerosGanadores.includes(numeroTicket)) {
      return { ganador: false }
    }

    // Verificar premios por número específico
    for (const premio of config.premios) {
      if (premio.activo && premio.tipo === "numero_especifico" && premio.numeroEspecifico === numeroTicket) {
        // Marcar como ganador
        config.numerosGanadores.push(numeroTicket)
        await guardarPremiosDia(config)
        return { ganador: true, premio }
      }
    }

    // Verificar premios aleatorios (probabilidad del 5%)
    const premiosAleatoriosActivos = config.premios.filter((p) => p.activo && p.tipo === "aleatorio")

    if (premiosAleatoriosActivos.length > 0) {
      const probabilidad = Math.random()

      // 5% de probabilidad de ganar
      if (probabilidad < 0.05) {
        // Seleccionar un premio aleatorio de los disponibles
        const premioGanador = premiosAleatoriosActivos[Math.floor(Math.random() * premiosAleatoriosActivos.length)]

        // Marcar como ganador
        config.numerosGanadores.push(numeroTicket)
        await guardarPremiosDia(config)

        return { ganador: true, premio: premioGanador }
      }
    }

    return { ganador: false }
  } catch (error) {
    console.error("Error al verificar premio:", error)
    return { ganador: false }
  }
}

// Obtener estadísticas de premios del día
export async function obtenerEstadisticasPremios(fecha: string) {
  try {
    const config = await obtenerPremiosDia(fecha)

    return {
      totalPremiosConfigurados: config.premios.filter((p) => p.activo).length,
      totalGanadores: config.numerosGanadores.length,
      numerosGanadores: config.numerosGanadores,
      premiosActivos: config.premios.filter((p) => p.activo),
    }
  } catch (error) {
    console.error("Error al obtener estadísticas de premios:", error)
    return {
      totalPremiosConfigurados: 0,
      totalGanadores: 0,
      numerosGanadores: [],
      premiosActivos: [],
    }
  }
}
