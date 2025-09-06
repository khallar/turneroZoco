import { redis } from "@/lib/database"

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export class CacheManager {
  private static instance: CacheManager
  private localCache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  async get<T>(key: string, fallback?: () => Promise<T>, ttl?: number): Promise<T | null> {
    try {
      // Verificar cache local primero
      const localEntry = this.localCache.get(key)
      if (localEntry && Date.now() - localEntry.timestamp < localEntry.ttl) {
        console.log(`📋 Cache hit (local): ${key}`)
        return localEntry.data
      }

      // Verificar Redis
      const redisValue = await redis.get(key)
      if (redisValue !== null) {
        console.log(`📋 Cache hit (Redis): ${key}`)
        // Actualizar cache local
        this.localCache.set(key, {
          data: redisValue,
          timestamp: Date.now(),
          ttl: ttl || this.DEFAULT_TTL,
        })
        return redisValue
      }

      // Si hay fallback, ejecutarlo
      if (fallback) {
        console.log(`📋 Cache miss, ejecutando fallback: ${key}`)
        const data = await fallback()
        await this.set(key, data, ttl)
        return data
      }

      return null
    } catch (error) {
      console.error(`Error en cache get para ${key}:`, error)

      // Intentar fallback si hay error
      if (fallback) {
        try {
          return await fallback()
        } catch (fallbackError) {
          console.error(`Error en fallback para ${key}:`, fallbackError)
        }
      }

      return null
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const effectiveTtl = ttl || this.DEFAULT_TTL

      // Guardar en Redis con expiración
      await redis.set(key, value, { ex: Math.floor(effectiveTtl / 1000) })

      // Actualizar cache local
      this.localCache.set(key, {
        data: value,
        timestamp: Date.now(),
        ttl: effectiveTtl,
      })

      console.log(`📋 Cache set: ${key} (TTL: ${effectiveTtl}ms)`)
    } catch (error) {
      console.error(`Error en cache set para ${key}:`, error)
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      // Eliminar de Redis
      await redis.del(key)

      // Eliminar de cache local
      this.localCache.delete(key)

      console.log(`📋 Cache invalidated: ${key}`)
    } catch (error) {
      console.error(`Error invalidando cache para ${key}:`, error)
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Eliminar de Redis usando pattern
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }

      // Eliminar de cache local
      for (const [key] of this.localCache) {
        if (key.includes(pattern.replace("*", ""))) {
          this.localCache.delete(key)
        }
      }

      console.log(`📋 Cache pattern invalidated: ${pattern} (${keys.length} keys)`)
    } catch (error) {
      console.error(`Error invalidando pattern ${pattern}:`, error)
    }
  }

  // Limpiar cache local de entradas expiradas
  cleanupLocalCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.localCache) {
      if (now - entry.timestamp >= entry.ttl) {
        this.localCache.delete(key)
      }
    }
  }

  // Obtener estadísticas del cache
  getStats() {
    return {
      localCacheSize: this.localCache.size,
      localCacheKeys: Array.from(this.localCache.keys()),
    }
  }
}

// Instancia singleton
export const cacheManager = CacheManager.getInstance()

// Limpiar cache local cada 5 minutos
if (typeof window === "undefined") {
  // Solo en servidor
  setInterval(
    () => {
      cacheManager.cleanupLocalCache()
    },
    5 * 60 * 1000,
  )
}
