import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { analisisService, datosService } from '../services/api'

export default function Dashboard() {
  const user = useAuthStore(s => s.user)
  const [historial, setHistorial] = useState([])
  const [estadoDatos, setEstadoDatos] = useState(null)

  useEffect(() => {
    analisisService.listar(0, 10).then(setHistorial).catch(() => {})
    datosService.estado().then(setEstadoDatos).catch(() => {})
  }, [])

  const creditosRestantes = user?.plan === 'free'
    ? `${2 - (user?.creditos_free_usados_este_mes || 0)} / 2 este mes`
    : user?.plan === 'pro' ? 'Ilimitados' : `${user?.creditos || 0} créditos`

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* Bienvenida */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido, {user?.nombre}</h1>
          <p className="text-gray-500 text-sm mt-1">{user?.firma || 'FinAnalytics'}</p>
        </div>
        <Link to="/nuevo"
          className="bg-[#1F4E8C] text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-[#163d70] transition">
          + Nuevo análisis
        </Link>
      </div>

      {/* Tarjetas de estado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Plan actual</p>
          <p className="text-xl font-bold text-[#1F4E8C] mt-1 capitalize">{user?.plan || 'Free'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Créditos disponibles</p>
          <p className="text-xl font-bold text-green-700 mt-1">{creditosRestantes}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Datos SIIS</p>
          {estadoDatos ? (
            <p className="text-sm font-semibold text-gray-800 mt-1">
              Actualizados {new Date(estadoDatos.fecha_carga).toLocaleDateString('es-CO')}
            </p>
          ) : (
            <p className="text-sm text-red-500 mt-1">Sin datos cargados</p>
          )}
        </div>
      </div>

      {/* Historial */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">Análisis recientes</h2>
        {historial.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-3">Aún no tienes análisis</p>
            <Link to="/nuevo" className="text-[#1F4E8C] font-semibold text-sm hover:underline">
              Crear tu primer análisis →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {historial.map(a => (
              <Link key={a.id} to={`/analisis/${a.id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-[#1F4E8C] hover:shadow-sm transition">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">
                    Modo {a.modo} &nbsp;·&nbsp;
                    <span className="text-[#1F4E8C]">{a.ciius?.join(', ')}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.n_muestra} empresas &nbsp;·&nbsp;
                    {new Date(a.creado_en).toLocaleString('es-CO')}
                  </p>
                </div>
                <span className="text-[#1F4E8C] text-sm font-semibold">Ver →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
