interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 30000 // 30 segundos

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Limpiar entradas expiradas
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

export const cacheManager = new CacheManager()

// Limpiar cache cada 5 minutos
if (typeof window === "undefined") {
  setInterval(
    () => {
      cacheManager.cleanup()
    },
    5 * 60 * 1000,
  )
}
