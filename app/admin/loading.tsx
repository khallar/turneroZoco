export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Cargando panel de administración...</p>
        <p className="text-sm text-gray-500 mt-2">Verificando permisos y cargando datos</p>
      </div>
    </div>
  )
}
