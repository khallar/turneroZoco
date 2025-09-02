interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  key: string
  fresh: boolean
}

interface CacheStats {
  totalEntries: number
  freshEntries: number
  expiredEntries: number
  entries: Array<{
    key: string
    age: number
    fresh: boolean
    size: number
  }>
}

class CacheManager {
  private cache = new Map<string, CacheEntry>()
  private defaultTTL = 2 * 60 * 1000 // 2 minutos por defecto

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      key,
      fresh: true,
    }

    this.cache.set(key, entry)
    console.log(`📦 Cache SET: ${key} (TTL: ${entry.ttl}ms)`)
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      console.log(`📦 Cache MISS: ${key}`)
      return null
    }

    const age = Date.now() - entry.timestamp
    const isExpired = age > entry.ttl

    if (isExpired) {
      this.cache.delete(key)
      console.log(`📦 Cache EXPIRED: ${key} (age: ${age}ms)`)
      return null
    }

    // Marcar como no fresh si está cerca de expirar (últimos 30 segundos)
    entry.fresh = age < entry.ttl - 30000

    console.log(`📦 Cache HIT: ${key} (age: ${age}ms, fresh: ${entry.fresh})`)
    return entry.data as T
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const age = Date.now() - entry.timestamp
    const isExpired = age > entry.ttl

    if (isExpired) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      console.log(`📦 Cache DELETE: ${key}`)
    }
    return deleted
  }

  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    console.log(`📦 Cache CLEAR: ${size} entries removed`)
  }

  invalidate(pattern?: string): number {
    let removed = 0

    if (pattern) {
      const regex = new RegExp(pattern)
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key)
          removed++
        }
      }
      console.log(`📦 Cache INVALIDATE pattern "${pattern}": ${removed} entries removed`)
    } else {
      removed = this.cache.size
      this.cache.clear()
      console.log(`📦 Cache INVALIDATE all: ${removed} entries removed`)
    }

    return removed
  }

  getStats(): CacheStats {
    const now = Date.now()
    const entries = Array.from(this.cache.values())

    const stats: CacheStats = {
      totalEntries: entries.length,
      freshEntries: 0,
      expiredEntries: 0,
      entries: [],
    }

    entries.forEach((entry) => {
      const age = now - entry.timestamp
      const isExpired = age > entry.ttl
      const isFresh = age < entry.ttl - 30000

      if (isExpired) {
        stats.expiredEntries++
      } else if (isFresh) {
        stats.freshEntries++
      }

      stats.entries.push({
        key: entry.key,
        age,
        fresh: isFresh && !isExpired,
        size: JSON.stringify(entry.data).length,
      })
    })

    return stats
  }

  // Limpieza automática de entradas expiradas
  cleanup(): number {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache) {
      const age = now - entry.timestamp
      if (age > entry.ttl) {
        this.cache.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      console.log(`📦 Cache CLEANUP: ${removed} expired entries removed`)
    }

    return removed
  }
}

// Instancia singleton del cache
const cacheManager = new CacheManager()

// Limpieza automática cada 5 minutos
if (typeof window === "undefined") {
  // Solo en el servidor
  setInterval(
    () => {
      cacheManager.cleanup()
    },
    5 * 60 * 1000,
  )
}

// Funciones de conveniencia
export function setCache<T>(key: string, data: T, ttl?: number): void {
  cacheManager.set(key, data, ttl)
}

export function getCache<T>(key: string): T | null {
  return cacheManager.get<T>(key)
}

export function hasCache(key: string): boolean {
  return cacheManager.has(key)
}

export function deleteCache(key: string): boolean {
  return cacheManager.delete(key)
}

export function clearCache(): void {
  cacheManager.clear()
}

export function invalidateCache(pattern?: string): number {
  return cacheManager.invalidate(pattern)
}

export function getCacheStats(): CacheStats {
  return cacheManager.getStats()
}

export default cacheManager
