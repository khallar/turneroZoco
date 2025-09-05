interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly defaultTTL = 60000 // 1 minuto por defecto

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
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
    const isExpired = now - entry.timestamp > entry.ttl

    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)

    if (!entry) {
      return false
    }

    const now = Date.now()
    const isExpired = now - entry.timestamp > entry.ttl

    if (isExpired) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  getStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0

    for (const [key, entry] of this.cache.entries()) {
      const isExpired = now - entry.timestamp > entry.ttl
      if (isExpired) {
        expiredEntries++
        this.cache.delete(key) // Limpiar entradas expiradas
      } else {
        validEntries++
      }
    }

    return {
      totalEntries: validEntries,
      expiredEntries,
      cacheSize: this.cache.size,
    }
  }

  // Limpiar entradas expiradas
  cleanup(): void {
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      const isExpired = now - entry.timestamp > entry.ttl
      if (isExpired) {
        this.cache.delete(key)
      }
    }
  }
}

// Instancia singleton del cache
export const cacheManager = new CacheManager()

// Limpiar cache cada 5 minutos
if (typeof window !== "undefined") {
  setInterval(
    () => {
      cacheManager.cleanup()
    },
    5 * 60 * 1000,
  )
}
