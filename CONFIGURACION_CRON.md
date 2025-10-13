# Configuración de Backup Automático Diario

## 🤖 Backup Automático a las 21:00 hs (Lunes a Sábado)

Este sistema tiene configurado un backup automático que se ejecuta todos los días de lunes a sábado a las 21:00 hs (hora de Argentina).

### 📋 Cómo funciona

1. **Cron Job de Vercel**: Utiliza la función Cron Jobs de Vercel
2. **Horario**: 21:00 hs todos los días de lunes a sábado
3. **Zona Horaria**: America/Argentina/Buenos_Aires (UTC-3)
4. **Endpoint**: `/api/cron/backup-diario`

### 🔧 Configuración

El cron job está configurado en `vercel.json`:

\`\`\`json
{
  "crons": [
    {
      "path": "/api/cron/backup-diario",
      "schedule": "0 21 * * 1-6"
    }
  ]
}
\`\`\`

**Explicación del schedule:**
- `0` - Minuto 0
- `21` - Hora 21 (9 PM)
- `*` - Cualquier día del mes
- `*` - Cualquier mes
- `1-6` - Lunes (1) a Sábado (6)

### 🔐 Seguridad (Opcional pero Recomendado)

Para mayor seguridad, puedes agregar una variable de entorno `CRON_SECRET`:

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega: `CRON_SECRET` con un valor secreto (ej: un UUID)
4. El endpoint verificará este token antes de ejecutarse

### 📊 Qué hace el backup automático

1. **Lee el estado actual del sistema** con todos los tickets del día
2. **Verifica si hay datos** (si hay 0 tickets, no crea backup)
3. **Crea un backup completo** con:
   - Todos los tickets emitidos
   - Estadísticas del día
   - Métricas de rendimiento
   - Distribución por hora
   - Nombres más comunes
   - Tiempo promedio de espera
   - Y más métricas detalladas

4. **Guarda el backup en Upstash Redis** con una expiración de 60 días

### ✅ Verificación

Puedes verificar que el cron job funciona correctamente:

1. **En Vercel Dashboard**:
   - Ve a tu proyecto
   - Click en "Cron Jobs"
   - Verás el historial de ejecuciones

2. **En los logs**:
   - Vercel → Tu Proyecto → Deployments
   - Selecciona el deployment actual
   - Ve a "Functions" → Busca `/api/cron/backup-diario`
   - Revisa los logs de ejecución

3. **Prueba manual**:
   \`\`\`bash
   curl https://tu-dominio.vercel.app/api/cron/backup-diario
   \`\`\`

### 📅 Horarios y Zona Horaria

**IMPORTANTE**: Los cron jobs de Vercel usan **UTC** por defecto.

- **21:00 hs Argentina (UTC-3)** = **00:00 UTC del día siguiente**
- Por eso el schedule es `0 21 * * 1-6` que se ejecuta en horario local del servidor

Si necesitas ajustar la hora:
- Para 22:00 hs: `0 22 * * 1-6`
- Para 20:00 hs: `0 20 * * 1-6`

### 🔄 Múltiples Backups

Si deseas crear múltiples backups en diferentes horarios:

\`\`\`json
{
  "crons": [
    {
      "path": "/api/cron/backup-diario",
      "schedule": "0 21 * * 1-6"
    },
    {
      "path": "/api/cron/backup-diario",
      "schedule": "0 12 * * 1-6"
    }
  ]
}
\`\`\`

### 🚨 Solución de Problemas

**El cron job no se ejecuta:**
1. Verifica que `vercel.json` esté en la raíz del proyecto
2. Asegúrate de hacer deploy después de agregar el archivo
3. Verifica que el endpoint `/api/cron/backup-diario` funcione manualmente
4. Revisa los logs en Vercel Dashboard

**Error de autenticación:**
- Si configuraste `CRON_SECRET`, asegúrate de que esté en las variables de entorno de producción

**No se crean backups:**
- Verifica que haya tickets emitidos ese día
- Revisa los logs del endpoint para ver errores específicos
- Verifica la conexión a Upstash Redis

### 📞 Notificaciones (Opcional)

Si deseas recibir notificaciones cuando se crea el backup, puedes:

1. Agregar un webhook
2. Enviar un email con un servicio como Resend
3. Usar Slack/Discord webhooks

Ejemplo básico con fetch:
\`\`\`typescript
await fetch('https://tu-webhook.com/notificar', {
  method: 'POST',
  body: JSON.stringify({
    mensaje: `Backup creado: ${ticketsRespaldados} tickets`,
    fecha: fecha
  })
})
\`\`\`

### 🎯 Ventajas de este Sistema

✅ **Automático**: No requiere intervención manual
✅ **Confiable**: Se ejecuta siempre a la misma hora
✅ **Completo**: Guarda todas las métricas y estadísticas
✅ **Eficiente**: Solo crea backup si hay datos
✅ **Histórico**: Los backups se mantienen 60 días
✅ **Sin Domingos**: No se ejecuta los domingos (día de cierre)

---

**Desarrollado por: Karim**
**Versión: 6.2 - Backup Automático Programado**
