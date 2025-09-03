// Script para verificar y crear backups automáticamente
// Se puede ejecutar manualmente o programar con cron

import { forzarBackupDiario, obtenerBackups, leerEstadoSistema } from "../lib/database"

async function verificarBackups() {
  try {
    console.log("🔍 Iniciando verificación de backups...")

    // Obtener fecha actual
    const fechaHoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    const fechaAyer = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    })

    console.log(`📅 Verificando backups para hoy (${fechaHoy}) y ayer (${fechaAyer})`)

    // Obtener lista de backups existentes
    const backups = await obtenerBackups()
    console.log(`📦 Total de backups encontrados: ${backups.length}`)

    // Verificar si existe backup para hoy
    const backupHoy = backups.find((b) => b.fecha === fechaHoy)
    const backupAyer = backups.find((b) => b.fecha === fechaAyer)

    console.log(`📊 Backup hoy (${fechaHoy}): ${backupHoy ? "✅ Existe" : "❌ No existe"}`)
    console.log(`📊 Backup ayer (${fechaAyer}): ${backupAyer ? "✅ Existe" : "❌ No existe"}`)

    // Verificar si hay actividad hoy
    const estadoActual = await leerEstadoSistema()
    console.log(`🎫 Actividad hoy: ${estadoActual.totalAtendidos} tickets emitidos`)

    // Crear backup si hay actividad y no existe
    if (estadoActual.totalAtendidos > 0 && !backupHoy) {
      console.log("🔧 Creando backup para hoy...")
      const resultado = await forzarBackupDiario()

      if (resultado.success) {
        console.log("✅ Backup creado exitosamente:", resultado.message)
      } else {
        console.error("❌ Error al crear backup:", resultado.message)
      }
    } else if (estadoActual.totalAtendidos === 0) {
      console.log("ℹ️ No hay actividad hoy, no se requiere backup")
    } else if (backupHoy) {
      console.log("ℹ️ Backup de hoy ya existe")
    }

    // Mostrar resumen de backups recientes
    console.log("\n📋 Resumen de backups recientes:")
    backups.slice(0, 7).forEach((backup) => {
      console.log(`  - ${backup.fecha}: ${backup.resumen?.totalTicketsEmitidos || 0} tickets`)
    })

    console.log("✅ Verificación de backups completada")
  } catch (error) {
    console.error("❌ Error en verificación de backups:", error)
    process.exit(1)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verificarBackups()
    .then(() => {
      console.log("🎉 Script completado exitosamente")
      process.exit(0)
    })
    .catch((error) => {
      console.error("💥 Script falló:", error)
      process.exit(1)
    })
}

export { verificarBackups }
