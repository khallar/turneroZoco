import type React from "react"

const CronPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-4">Admin Cron Jobs</h1>
      {/* rest of code here */}
      <footer className="text-center mt-8 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-400">
          <p>Develop by: Karim :) | Versión 7.0 | Gestión de Cron Jobs</p>
          <p>Backups Automáticos Diarios | Verificación de Variables de Entorno</p>
        </div>
      </footer>
    </div>
  )
}

export default CronPage
