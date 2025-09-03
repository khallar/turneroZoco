// Script para verificar y crear backups automáticos
// Se puede ejecutar manualmente o programar con cron

import { getTodayDateString, obtenerBackups, forzarBackupDiario, leerEstadoSistema } from "@/lib/database"

async function verificarBackupsAutomaticos() {
  console.log("🔍 Iniciando verificación de backups automáticos...")

  try {
    // 1. Verificar backup del día actual
    console.log("📅 Verificando backup del día actual...")
    const fechaHoy = getTodayDateString()
    const estado = await leerEstadoSistema()

    if (estado.totalAtendidos > 0) {
      console.log(`✅ Día actual (${fechaHoy}) tiene ${estado.totalAtendidos} tickets`)

      // Si es tarde (después de las 22:00), crear backup automáticamente
      const horaActual = new Date().getHours()
      if (horaActual >= 22) {
        console.log(`🌙 Es tarde (${horaActual}:00), creando backup automático...`)
        const resultado = await forzarBackupDiario()
        console.log(resultado.success ? `✅ ${resultado.message}` : `❌ ${resultado.message}`)
      } else {
        console.log(`☀️ Aún es temprano (${horaActual}:00), backup programado para más tarde`)
      }
    } else {
      console.log(`⚠️ Día actual (${fechaHoy}) sin actividad aún`)
    }

    // 2. Verificar backups de días anteriores
    console.log("📋 Verificando historial de backups...")
    const backups = await obtenerBackups()
    console.log(`📊 Encontrados ${backups.length} backups en el historial`)

    // 3. Verificar continuidad (días faltantes)
    const fechasConBackup = backups.map((b) => b.fecha).sort()
    console.log("📅 Fechas con backup:", fechasConBackup.slice(0, 5), fechasConBackup.length > 5 ? "..." : "")

    // 4. Verificar si faltan días recientes
    const hoy = new Date()
    const diasAVerificar = 7 // Verificar últimos 7 días

    for (let i = 1; i <= diasAVerificar; i++) {
      const fecha = new Date(hoy)
      fecha.setDate(fecha.getDate() - i)
      const fechaStr = fecha.toISOString().split("T")[0]

      const tieneBackup = fechasConBackup.includes(fechaStr)

      if (!tieneBackup) {
        console.log(`⚠️ Falta backup para ${fechaStr}`)
        // Aquí podrías intentar recuperar datos si existen
      } else {
        console.log(`✅ Backup existe para ${fechaStr}`)
      }
    }

    // 5. Resumen final
    console.log("📊 Resumen de verificación:")
    console.log(`   - Backups totales: ${backups.length}`)
    console.log(`   - Tickets hoy: ${estado.totalAtendidos}`)
    console.log(`   - Hora actual: ${new Date().getHours()}:${new Date().getMinutes().toString().padStart(2, "0")}`)
    console.log(`   - Estado: ${estado.totalAtendidos > 0 ? "Activo" : "Sin actividad"}`)

    console.log("✅ Verificación de backups completada")
  } catch (error) {
    console.error("❌ Error en verificación de backups:", error)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verificarBackupsAutomaticos()
    .then(() => {
      console.log("🎉 Script completado")
      process.exit(0)
    })
    .catch((error) => {
      console.error("💥 Error fatal:", error)
      process.exit(1)
    })
}

export { verificarBackupsAutomaticos }
