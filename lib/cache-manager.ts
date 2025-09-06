import { redis } from "./database"

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export class CacheManager {
  private static instance: CacheManager
  private defaultTTL = 300 // 5 minutos por defecto

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    }

    await redis.setex(`cache:${key}`, entry.ttl, JSON.stringify(entry))
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(`cache:${key}`)
      if (!cached) return null

      const entry: CacheEntry<T> = JSON.parse(cached)

      // Verificar si el cache ha expirado
      const now = Date.now()
      if (now - entry.timestamp > entry.ttl * 1000) {
        await this.delete(key)
        return null
      }

      return entry.data
    } catch (error) {
      console.error("Error al obtener del cache:", error)
      return null
    }
  }

  async delete(key: string): Promise<void> {
    await redis.del(`cache:${key}`)
  }

  async clear(pattern?: string): Promise<void> {
    const keys = await redis.keys(pattern ? `cache:${pattern}*` : "cache:*")
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(`cache:${key}`)
    return result === 1
  }

  async ttl(key: string): Promise<number> {
    return await redis.ttl(`cache:${key}`)
  }

  // Métodos específicos para el sistema de colas
  async cacheEstadoSistema(estado: any): Promise<void> {
    await this.set("estado_sistema", estado, 30) // Cache por 30 segundos
  }

  async getCachedEstadoSistema(): Promise<any> {
    return await this.get("estado_sistema")
  }

  async cacheEstadisticas(stats: any): Promise<void> {
    await this.set("estadisticas_diarias", stats, 300) // Cache por 5 minutos
  }

  async getCachedEstadisticas(): Promise<any> {
    return await this.get("estadisticas_diarias")
  }
}

export const cacheManager = CacheManager.getInstance()
