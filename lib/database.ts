import { Redis } from "@upstash/redis"

// Prefijos para las claves de Redis
export const TICKETS_LIST_KEY_PREFIX = "sistemaTurnosZOCO:tickets:" // sistemaTurnosZOCO:tickets:YYYY-MM-DD
export const COUNTER_KEY_PREFIX = "sistemaTurnosZOCO:counter:" // Para el contador atómico de número de ticket

// Validación de variables de entorno para producción
if (!process.env.KV_REST_API_URL) {
  throw new Error("KV_REST_API_URL no está configurada. Es necesaria para la conexión a Upstash Redis.")
}
if (!process.env.KV_REST_API_TOKEN) {
  throw new Error("KV_REST_API_TOKEN no está configurada. Es necesaria para la conexión a Upstash Redis.")
}

// Inicializar cliente de Upstash Redis
export const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})
</generated_code>
