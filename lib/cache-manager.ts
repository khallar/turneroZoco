"use client"

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live en milisegundos
}

interface EstadoSistemaCache {
  numeroActual: number
  ultimoNumero: number
  totalAtendidos: number
  numerosLlamados: number
  fechaInicio: string
  ultimoReinicio: string
  tickets: any[]
  lastSync?: number
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>()
  private subscribers = new Map<string, Set<(data: any) => void>>()

  // TTL por defecto: 45 segundos (menos que el intervalo más frecuente)
  private defaultTTL = 45000

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })

    // Notificar a los suscriptores
    const keySubscribers = this.subscribers.get(key)
    if (keySubscribers) {
      keySubscribers.forEach((callback) => callback(data))
    }

    console.log(`📦 Cache actualizado: ${key} (TTL: ${ttl}ms)`)
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    const isExpired = now - entry.timestamp > entry.ttl

    if (isExpired) {
      this.cache.delete(key)
      console.log(`🗑️ Cache expirado y eliminado: ${key}`)
      return null
    }

    console.log(`✅ Cache hit: ${key} (edad: ${Math.round((now - entry.timestamp) / 1000)}s)`)
    return entry.data
  }

  // Verificar si el cache está fresco (no necesita actualización)
  isFresh(key: string, maxAge = 30000): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const age = Date.now() - entry.timestamp
    return age < maxAge
  }

  // Suscribirse a cambios en una clave específica
  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set())
    }
    this.subscribers.get(key)!.add(callback)

    // Retornar función de desuscripción
    return () => {
      const keySubscribers = this.subscribers.get(key)
      if (keySubscribers) {
        keySubscribers.delete(callback)
        if (keySubscribers.size === 0) {
          this.subscribers.delete(key)
        }
      }
    }
  }

  // Limpiar cache expirado
  cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cache limpiado: ${cleaned} entradas eliminadas`)
    }
  }

  // Obtener estadísticas del cache
  getStats() {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Math.round((now - entry.timestamp) / 1000),
      ttl: Math.round(entry.ttl / 1000),
      fresh: now - entry.timestamp < entry.ttl,
    }))

    return {
      totalEntries: this.cache.size,
      subscribers: this.subscribers.size,
      entries,
    }
  }

  // Invalidar cache específico
  invalidate(key: string): void {
    this.cache.delete(key)
    console.log(`❌ Cache invalidado: ${key}`)
  }

  // Limpiar todo el cache
  clear(): void {
    this.cache.clear()
    this.subscribers.clear()
    console.log("🗑️ Todo el cache limpiado")
  }
}

// Instancia singleton del cache manager
export const cacheManager = new CacheManager()

// Limpiar cache expirado cada 2 minutos
if (typeof window !== "undefined") {
  setInterval(() => {
    cacheManager.cleanup()
  }, 120000) // 2 minutos
}

// Claves de cache predefinidas
export const CACHE_KEYS = {
  ESTADO_SISTEMA: "estado_sistema",
  ESTADISTICAS: "estadisticas",
  BACKUPS: "backups",
  DEBUG_INFO: "debug_info",
} as const

// Utilidades para trabajar con el cache
export const cacheUtils = {
  // Obtener estado del sistema con cache
  getEstadoSistema: (): EstadoSistemaCache | null => {
    return cacheManager.get<EstadoSistemaCache>(CACHE_KEYS.ESTADO_SISTEMA)
  },

  // Establecer estado del sistema en cache
  setEstadoSistema: (estado: EstadoSistemaCache, ttl?: number): void => {
    cacheManager.set(CACHE_KEYS.ESTADO_SISTEMA, estado, ttl)
  },

  // Verificar si el estado está fresco
  isEstadoFresh: (maxAge?: number): boolean => {
    return cacheManager.isFresh(CACHE_KEYS.ESTADO_SISTEMA, maxAge)
  },

  // Suscribirse a cambios del estado
  subscribeToEstado: (callback: (estado: EstadoSistemaCache) => void) => {
    return cacheManager.subscribe(CACHE_KEYS.ESTADO_SISTEMA, callback)
  },
}
