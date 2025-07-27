// Script para configurar la base de datos sistemaTurnosZOCO
const { Pool } = require("pg")
const fs = require("fs")
const path = require("path")

async function setupDatabase() {
  console.log("🚀 Configurando sistemaTurnosZOCO...")

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  })

  try {
    // Leer el script SQL
    const sqlScript = fs.readFileSync(path.join(__dirname, "create-database.sql"), "utf8")

    // Ejecutar el script
    await pool.query(sqlScript)

    console.log("✅ sistemaTurnosZOCO configurado exitosamente")
    console.log("📊 Tablas creadas:")
    console.log("   - sistema_estado (estado principal)")
    console.log("   - tickets (turnos de clientes)")
    console.log("   - backups_diarios (respaldos automáticos)")
    console.log("   - sistema_logs (auditoría)")

    // Verificar que todo esté funcionando
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM sistema_estado) as estados,
        (SELECT COUNT(*) FROM tickets) as tickets,
        (SELECT COUNT(*) FROM backups_diarios) as backups,
        (SELECT COUNT(*) FROM sistema_logs) as logs
    `)

    console.log("📈 Estado inicial:", result.rows[0])
  } catch (error) {
    console.error("❌ Error al configurar sistemaTurnosZOCO:", error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupDatabase()
}

module.exports = { setupDatabase }
