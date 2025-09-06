interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  key: string
}

interface CacheStats {
  totalEntries: number
  entries: Array<{
    key: string
    age: number
    ttl: number
    fresh: boolean
  }>
  subscribers: number
}

class CacheManager {
  private cache = new Map<string, CacheEntry>()
  private subscribers = new Set<() => void>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Limpiar cache cada 5 minutos
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup()
      },
      5 * 60 * 1000,
    )
  }

  set<T>(key: string, data: T, ttlSeconds = 300): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
      key,
    }

    this.cache.set(key, entry)
    this.notifySubscribers()
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    const age = now - entry.timestamp

    if (age > entry.ttl) {
      this.cache.delete(key)
      this.notifySubscribers()
      return null
    }

    return entry.data as T
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const now = Date.now()
    const age = now - entry.timestamp

    if (age > entry.ttl) {
      this.cache.delete(key)
      this.notifySubscribers()
      return false
    }

    return true
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.notifySubscribers()
    }
    return deleted
  }

  clear(): void {
    this.cache.clear()
    this.notifySubscribers()
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.clear()
      return
    }

    const keysToDelete: string[] = []
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key))
    if (keysToDelete.length > 0) {
      this.notifySubscribers()
    }
  }

  getStats(): CacheStats {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => {
      const age = Math.floor((now - entry.timestamp) / 1000)
      const ttl = Math.floor(entry.ttl / 1000)
      const fresh = age < ttl

      return {
        key,
        age,
        ttl,
        fresh,
      }
    })

    return {
      totalEntries: this.cache.size,
      entries,
      subscribers: this.subscribers.size,
    }
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp
      if (age > entry.ttl) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key))
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cache cleanup: removed ${keysToDelete.length} expired entries`)
      this.notifySubscribers()
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => {
      try {
        callback()
      } catch (error) {
        console.error("Error in cache subscriber:", error)
      }
    })
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
    this.subscribers.clear()
  }
}

// Singleton instance
export const cacheManager = new CacheManager()

// Hook para usar el cache en componentes React
export function useCache() {
  return cacheManager
}
