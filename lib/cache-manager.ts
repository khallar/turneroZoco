"use client"

// Sistema de cache inteligente para el sistema de turnos
interface CacheItem<T = any> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  keys: string[]
}

class CacheManager {
  private cache = new Map<string, CacheItem>()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    keys: [],
  }

  // Configuración de TTL por defecto (en milisegundos)
  private defaultTTL = 300000 // 5 minutos

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    }

    this.cache.set(key, item)
    this.updateStats()
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)

    if (!item) {
      this.stats.misses++
      return null
    }

    // Verificar si el item ha expirado
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      this.updateStats()
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return item.data as T
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false

    // Verificar si ha expirado
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      this.updateStats()
      return false
    }

    return true
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key)
    this.updateStats()
    return result
  }

  clear(): void {
    this.cache.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      keys: [],
    }
  }

  // Verificar si un item está fresco (no ha expirado)
  isFresh(key: string, maxAge?: number): boolean {
    const item = this.cache.get(key)
    if (!item) return false

    const age = Date.now() - item.timestamp
    const threshold = maxAge || item.ttl

    return age < threshold
  }

  // Invalidar items que coincidan con un patrón
  invalidatePattern(pattern: string): number {
    let count = 0
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
        count++
      }
    }
    this.updateStats()
    return count
  }

  // Invalidar un key específico
  invalidate(key: string): boolean {
    return this.delete(key)
  }

  // Limpiar items expirados
  cleanup(): number {
    let count = 0
    const now = Date.now()

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
        count++
      }
    }

    this.updateStats()
    return count
  }

  // Obtener estadísticas del cache
  getStats(): CacheStats {
    return { ...this.stats }
  }

  // Obtener información detallada de un item
  getItemInfo(key: string): { exists: boolean; age?: number; ttl?: number; fresh?: boolean } {
    const item = this.cache.get(key)
    if (!item) {
      return { exists: false }
    }

    const age = Date.now() - item.timestamp
    return {
      exists: true,
      age,
      ttl: item.ttl,
      fresh: age < item.ttl,
    }
  }

  private updateStats(): void {
    this.stats.size = this.cache.size
    this.stats.keys = Array.from(this.cache.keys())
  }
}

// Instancia singleton del cache manager
export const cacheManager = new CacheManager()

// Keys de cache predefinidas
export const CACHE_KEYS = {
  ESTADO_SISTEMA: "sistema:estado",
  ESTADISTICAS: "sistema:estadisticas",
  DEBUG_INFO: "sistema:debug",
  BACKUPS: "sistema:backups",
  HEALTH_CHECK: "sistema:health",
} as const

// Utilidades específicas para el sistema de turnos
export const cacheUtils = {
  // Guardar estado del sistema con TTL personalizado
  setEstadoSistema: (estado: any, ttl = 300000) => {
    cacheManager.set(CACHE_KEYS.ESTADO_SISTEMA, estado, ttl)

    // Notificar a otros componentes del cambio
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("estadoSistemaUpdated", { detail: estado }))
    }
  },

  // Obtener estado del sistema
  getEstadoSistema: () => {
    return cacheManager.get(CACHE_KEYS.ESTADO_SISTEMA)
  },

  // Verificar si el estado está fresco
  isEstadoFresh: (maxAge = 60000) => {
    return cacheManager.isFresh(CACHE_KEYS.ESTADO_SISTEMA, maxAge)
  },

  // Suscribirse a cambios en el estado (para componentes)
  subscribeToEstado: (callback: (estado: any) => void) => {
    if (typeof window === "undefined") return () => {}

    const handler = (event: CustomEvent) => {
      callback(event.detail)
    }

    window.addEventListener("estadoSistemaUpdated", handler as EventListener)

    return () => {
      window.removeEventListener("estadoSistemaUpdated", handler as EventListener)
    }
  },

  // Invalidar todo el cache relacionado con el sistema
  invalidateAll: () => {
    Object.values(CACHE_KEYS).forEach((key) => {
      cacheManager.invalidate(key)
    })
  },

  // Limpiar cache expirado automáticamente
  startAutoCleanup: (interval = 300000) => {
    // 5 minutos
    if (typeof window === "undefined") return

    const cleanup = () => {
      const cleaned = cacheManager.cleanup()
      if (cleaned > 0) {
        console.log(`🧹 Cache cleanup: ${cleaned} items removed`)
      }
    }

    // Limpiar inmediatamente
    cleanup()

    // Configurar limpieza periódica
    const intervalId = setInterval(cleanup, interval)

    return () => clearInterval(intervalId)
  },
}

// Auto-iniciar limpieza en el cliente
if (typeof window !== "undefined") {
  cacheUtils.startAutoCleanup()
}
