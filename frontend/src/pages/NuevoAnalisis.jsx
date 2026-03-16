/**
 * NuevoAnalisis — formulario para configurar y ejecutar un análisis
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { analisisService, datosService } from '../services/api'
import toast from 'react-hot-toast'

const INDICES = ['IL', 'IE', 'RCI', 'RP', 'RA']
const INDICES_LABELS = {
  IL:  'Índice de Liquidez (IL)',
  IE:  'Índice de Endeudamiento (IE)',
  RCI: 'Razón Cobertura Intereses (RCI)',
  RP:  'Rentabilidad Patrimonio (RP)',
  RA:  'Rentabilidad Activo (RA)',
}

export default function NuevoAnalisis() {
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(false)
  const [modo, setModo] = useState('A')
  const [ciius, setCiius] = useState([])
  const [busquedaCiiu, setBusquedaCiiu] = useState('')
  const [ciuuOpciones, setCiuuOpciones] = useState([])
  const [pctMuestra, setPctMuestra] = useState(3)
  const [hiUmbral, setHiUmbral] = useState(59)
  const [indicesEmpresa, setIndicesEmpresa] = useState({ IL: '', IE: '', RCI: '', RP: '', RA: '' })
  const [estadoDatos, setEstadoDatos] = useState(null)

  useEffect(() => {
    datosService.estado().then(setEstadoDatos).catch(() => {})
  }, [])

  useEffect(() => {
    if (busquedaCiiu.length < 1) { setCiuuOpciones([]); return }
    datosService.listarCIIU(busquedaCiiu).then(setCiuuOpciones).catch(() => {})
  }, [busquedaCiiu])

  const agregarCIIU = (ciiu) => {
    if (!ciius.find(c => c.codigo === ciiu.codigo)) {
      setCiius(prev => [...prev, ciiu])
    }
    setBusquedaCiiu('')
    setCiuuOpciones([])
  }

  const quitarCIIU = (codigo) => setCiius(prev => prev.filter(c => c.codigo !== codigo))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!ciius.length) { toast.error('Seleccione al menos un CIIU'); return }
    if (modo === 'B') {
      const vacios = INDICES.filter(i => indicesEmpresa[i] === '')
      if (vacios.length) { toast.error(`Complete los índices: ${vacios.join(', ')}`); return }
    }
    setCargando(true)
    try {
      const config = {
        ciius: ciius.map(c => c.codigo),
        modo,
        porcentaje_muestra: pctMuestra / 100,
        hi_umbral: hiUmbral / 100,
        indices_empresa: modo === 'B'
          ? Object.fromEntries(INDICES.map(i => [i, parseFloat(indicesEmpresa[i])]))
          : null,
      }
      const resultado = await analisisService.ejecutar(config)
      toast.success('Análisis completado')
      navigate(`/analisis/${resultado.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al ejecutar el análisis')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Nuevo Análisis</h1>

      {/* Estado de datos */}
      {estadoDatos ? (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800 mb-6">
          ✓ Datos actualizados al {new Date(estadoDatos.fecha_carga).toLocaleDateString('es-CO')}
          &nbsp;·&nbsp;{estadoDatos.n_empresas.toLocaleString()} empresas &nbsp;·&nbsp;
          Fuente: Supersociedades
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800 mb-6">
          ⚠ No hay datos SIIS cargados. Contacte al administrador.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-7">

        {/* Modo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Modo de análisis</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: 'A', titulo: 'Objetivo del sector', desc: 'El sistema determina los índices recomendados según la distribución real del sector' },
              { val: 'B', titulo: 'Por objetivo de empresa', desc: 'Ingresa los índices objetivo y el sistema ubica la empresa dentro de la distribución del sector' },
            ].map(({ val, titulo, desc }) => (
              <button
                key={val}
                type="button"
                onClick={() => setModo(val)}
                className={`text-left p-4 rounded-xl border-2 transition ${modo === val ? 'border-[#1F4E8C] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <p className={`font-semibold text-sm ${modo === val ? 'text-[#1F4E8C]' : 'text-gray-700'}`}>
                  Modo {val} — {titulo}
                </p>
                <p className="text-xs text-gray-500 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Selección de CIIUs */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Códigos CIIU del sector
          </label>
          <div className="relative">
            <input
              type="text"
              value={busquedaCiiu}
              onChange={e => setBusquedaCiiu(e.target.value)}
              placeholder="Buscar por código o descripción (ej: F4290, construcción...)"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E8C]"
            />
            {ciuuOpciones.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {ciuuOpciones.map(c => (
                  <button
                    key={c.codigo}
                    type="button"
                    onClick={() => agregarCIIU(c)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                  >
                    <span className="font-mono font-semibold text-[#1F4E8C]">{c.codigo}</span>
                    <span className="text-gray-600 ml-2 text-xs">{c.descripcion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CIIUs seleccionados */}
          {ciius.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {ciius.map(c => (
                <span key={c.codigo} className="flex items-center gap-1.5 bg-[#1F4E8C] text-white text-xs px-3 py-1.5 rounded-full">
                  <span className="font-mono font-bold">{c.codigo}</span>
                  <span className="opacity-80 max-w-32 truncate">{c.descripcion}</span>
                  <button type="button" onClick={() => quitarCIIU(c.codigo)} className="hover:opacity-70 ml-1">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Parámetros */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Porcentaje de muestra (%)
            </label>
            <input
              type="number" min={1} max={100} value={pctMuestra}
              onChange={e => setPctMuestra(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E8C]"
            />
            <p className="text-xs text-gray-500 mt-1">El documento SETP usa 3%</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Umbral de concentración Hi (%)
            </label>
            <input
              type="number" min={50} max={90} value={hiUmbral}
              onChange={e => setHiUmbral(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E8C]"
            />
            <p className="text-xs text-gray-500 mt-1">El documento SETP usa 59%</p>
          </div>
        </div>

        {/* Índices empresa (Modo B) */}
        {modo === 'B' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Índices objetivo de la empresa
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {INDICES.map(idx => (
                <div key={idx}>
                  <label className="block text-xs text-gray-600 mb-1">{INDICES_LABELS[idx]}</label>
                  <input
                    type="number" step="0.01"
                    value={indicesEmpresa[idx]}
                    onChange={e => setIndicesEmpresa(prev => ({ ...prev, [idx]: e.target.value }))}
                    placeholder={idx === 'IE' ? 'ej: 0.70' : 'ej: 2.0'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              IE: proporción (0.70 = 70%) · IL, RCI: número absoluto · RP, RA: proporción (0.05 = 5%)
            </p>
          </div>
        )}

        {/* Botón */}
        <button
          type="submit"
          disabled={cargando || !estadoDatos}
          className="w-full bg-[#1F4E8C] text-white font-bold py-3.5 rounded-xl text-sm hover:bg-[#163d70] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cargando ? 'Ejecutando análisis...' : 'Ejecutar análisis'}
        </button>
      </form>
    </div>
  )
}
