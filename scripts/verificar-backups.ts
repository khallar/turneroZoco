// Script para verificar y crear backups automáticamente
// Se puede ejecutar manualmente o programar con cron

import { obtenerBackups, forzarBackupDiario, leerEstadoSistema, getTodayDateString } from "../lib/database"

async function verificarBackups() {
  try {
    console.log("🔍 Iniciando verificación de backups...")

    const fechaHoy = getTodayDateString()
    const fechaAyer = getYesterdayDateString()

    console.log(`📅 Fecha actual: ${fechaHoy}`)
    console.log(`📅 Fecha ayer: ${fechaAyer}`)

    // Obtener backups existentes
    const backups = await obtenerBackups()
    console.log(`📦 Total de backups encontrados: ${backups.length}`)

    // Verificar backup de hoy
    const backupHoy = backups.find((b) => b.fecha === fechaHoy)
    const backupAyer = backups.find((b) => b.fecha === fechaAyer)

    console.log(`📊 Backup de hoy (${fechaHoy}): ${backupHoy ? "✅ Existe" : "❌ No existe"}`)
    console.log(`📊 Backup de ayer (${fechaAyer}): ${backupAyer ? "✅ Existe" : "❌ No existe"}`)

    // Verificar si hay actividad hoy
    const estado = await leerEstadoSistema()
    console.log(`🎫 Tickets emitidos hoy: ${estado.totalAtendidos}`)

    // Si hay actividad pero no hay backup, crearlo
    if (estado.totalAtendidos > 0 && !backupHoy) {
      console.log("🔧 Creando backup para el día actual...")
      const resultado = await forzarBackupDiario()

      if (resultado.success) {
        console.log("✅ Backup creado exitosamente:", resultado.message)
      } else {
        console.error("❌ Error al crear backup:", resultado.message)
      }
    } else if (estado.totalAtendidos === 0) {
      console.log("ℹ️ No hay actividad hoy, no se requiere backup")
    } else {
      console.log("✅ Backup del día actual ya existe")
    }

    // Mostrar resumen de últimos backups
    console.log("\n📋 Últimos 5 backups:")
    backups.slice(0, 5).forEach((backup) => {
      console.log(`  - ${backup.fecha}: ${backup.resumen?.totalTicketsEmitidos || 0} tickets`)
    })

    console.log("\n✅ Verificación de backups completada")
  } catch (error) {
    console.error("❌ Error en verificación de backups:", error)
    process.exit(1)
  }
}

function getYesterdayDateString(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }
  const formatter = new Intl.DateTimeFormat("en-CA", options)
  return formatter.format(yesterday)
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verificarBackups()
}

export { verificarBackups }
