import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { analisisService, datosService } from '../services/api'
import toast from 'react-hot-toast'
import SelectorHi from '../components/ui/SelectorHi'

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
  const BORRADOR_KEY = 'finanalytics_borrador_analisis'
  const borrador = (() => {
    try { return JSON.parse(localStorage.getItem(BORRADOR_KEY) || 'null') } catch { return null }
  })()

  const [cargando, setCargando]             = useState(false)
  const [modo, setModo]                     = useState(borrador?.modo || 'A')
  const [ciius, setCiius]                   = useState(borrador?.ciius || [])
  const [busqueda, setBusqueda]             = useState('')
  const [opciones, setOpciones]             = useState([])
  const [cargandoCiiu, setCargandoCiiu]     = useState(false)
  const [mostrarDropdown, setMostrarDropdown] = useState(false)
  const [pctMuestra, setPctMuestra]         = useState(3)
  const [hiUmbral, setHiUmbral]             = useState(59)
  const [indicesEmpresa, setIndicesEmpresa] = useState(borrador?.indicesEmpresa || { IL: '', IE: '', RCI: '', RP: '', RA: '' })
  const [nEmpresasB, setNEmpresasB]         = useState(30)
  const [nombreAnalisis, setNombreAnalisis] = useState(borrador?.nombre || '')   // Modo B: número de empresas
  const [estadoDatos, setEstadoDatos] = useState(null)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    datosService.estado().then(setEstadoDatos).catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mostrarDropdown) buscarCiius(busqueda)
    }, 300)
    return () => clearTimeout(timer)
  }, [busqueda, mostrarDropdown])

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setMostrarDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const buscarCiius = async (texto) => {
    setCargandoCiiu(true)
    try {
      const resultados = await datosService.listarCIIU(texto)
      const seleccionados = ciius.map(c => c.codigo)
      setOpciones(resultados.filter(r => !seleccionados.includes(r.codigo)))
    } catch {
      setOpciones([])
    } finally {
      setCargandoCiiu(false)
    }
  }

  const abrirBuscador = () => {
    setMostrarDropdown(true)
    buscarCiius(busqueda)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const agregarCIIU = (ciiu) => {
    if (!ciius.find(c => c.codigo === ciiu.codigo)) {
      setCiius(prev => [...prev, ciiu])
    }
    setBusqueda('')
    setMostrarDropdown(false)
    setOpciones([])
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
        nombre: nombreAnalisis || null,
        porcentaje_muestra: pctMuestra / 100,
        hi_umbral: hiUmbral / 100,
        indices_empresa: modo === 'B'
          ? Object.fromEntries(INDICES.map(i => [i, parseFloat(indicesEmpresa[i])]))
          : null,
        n_empresas_b: modo === 'B' ? nEmpresasB : null,
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
      {borrador && (ciius.length > 0 || nombreAnalisis) && (
        <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'12px', color:'#92400E', background:'#FFFBEB', border:'1px solid #FCD34D', borderRadius:'8px', padding:'8px 12px', marginBottom:'8px' }}>
          <span>Borrador restaurado automáticamente.</span>
          <button onClick={() => { localStorage.removeItem(BORRADOR_KEY); window.location.reload() }}
            style={{ fontWeight:'600', textDecoration:'underline', background:'none', border:'none', cursor:'pointer', color:'#92400E' }}>
            Limpiar
          </button>
        </div>
      )}

      {estadoDatos ? (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800 mb-6">
          ✓ Datos actualizados al {new Date(estadoDatos.fecha_carga).toLocaleDateString('es-CO')}
          &nbsp;·&nbsp;{estadoDatos.n_empresas?.toLocaleString()} empresas &nbsp;·&nbsp;
          Fuente: Supersociedades
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800 mb-6">
          ⚠ No hay datos SIIS cargados.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-7">

        {/* Nombre del análisis */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nombre del análisis <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <input
            type="text"
            value={nombreAnalisis}
            onChange={e => setNombreAnalisis(e.target.value)}
            placeholder="ej: Sector construcción Huila 2024"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E8C]"
            maxLength={200}
          />
          <p className="text-xs text-gray-400 mt-1">Aparecerá en el historial para identificar el análisis fácilmente</p>
        </div>

        {/* Modo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Modo de análisis</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: 'A', titulo: 'Objetivo del sector', desc: 'El sistema determina los índices recomendados según la distribución real del sector' },
              { val: 'B', titulo: 'Por objetivo de empresa', desc: 'Ingresa los índices objetivo y el sistema ubica la empresa dentro de la distribución' },
            ].map(({ val, titulo, desc }) => (
              <button key={val} type="button" onClick={() => setModo(val)}
                className={`text-left p-4 rounded-xl border-2 transition ${modo === val ? 'border-[#1F4E8C] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className={`font-semibold text-sm ${modo === val ? 'text-[#1F4E8C]' : 'text-gray-700'}`}>
                  Modo {val} — {titulo}
                </p>
                <p className="text-xs text-gray-500 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Buscador CIIUs */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Códigos CIIU del sector
            {ciius.length > 0 && (
              <span className="ml-2 text-xs font-normal text-blue-600">
                {ciius.length} seleccionado{ciius.length > 1 ? 's' : ''}
              </span>
            )}
          </label>

          {/* Tags de CIIUs seleccionados */}
          {ciius.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              {ciius.map(c => (
                <span key={c.codigo}
                  className="flex items-center gap-1.5 bg-[#1F4E8C] text-white text-xs px-3 py-1.5 rounded-full">
                  <span className="font-mono font-bold">{c.codigo}</span>
                  <button type="button" onClick={() => quitarCIIU(c.codigo)}
                    className="hover:opacity-70 ml-1 leading-none">✕</button>
                </span>
              ))}
            </div>
          )}

          {/* Input + botón */}
          <div className="relative">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                onFocus={abrirBuscador}
                onKeyDown={e => {
                  if (e.key === 'Escape') setMostrarDropdown(false)
                  if (e.key === 'Enter') { e.preventDefault(); abrirBuscador() }
                }}
                placeholder="Buscar por código o descripción..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E8C]"
              />
              <button type="button" onClick={abrirBuscador}
                className="px-4 py-2.5 bg-[#1F4E8C] text-white rounded-lg text-sm hover:bg-[#163d70] transition whitespace-nowrap">
                + Agregar
              </button>
            </div>

            {/* Dropdown de resultados */}
            {mostrarDropdown && (
              <div ref={dropdownRef}
                className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto">

                {/* Buscador interno del dropdown */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-3 py-2">
                  <input
                    type="text"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Filtrar CIIUs..."
                    className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1F4E8C]"
                    autoFocus
                  />
                </div>

                {cargandoCiiu ? (
                  <div className="px-4 py-4 text-sm text-gray-500 text-center">Buscando...</div>
                ) : opciones.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-gray-500 text-center">
                    {busqueda ? `Sin resultados para "${busqueda}"` : 'Escribe para filtrar los 433 CIIUs disponibles'}
                  </div>
                ) : (
                  <>
                    <div className="px-3 py-1.5 text-xs text-gray-400 bg-gray-50">
                      {opciones.length} resultado{opciones.length !== 1 ? 's' : ''} — haz clic para agregar
                    </div>
                    {opciones.map(c => (
                      <button key={c.codigo} type="button" onClick={() => agregarCIIU(c)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 flex items-start gap-3 transition">
                        <span className="font-mono font-bold text-[#1F4E8C] text-sm w-14 flex-shrink-0 mt-0.5">
                          {c.codigo}
                        </span>
                        <span className="text-gray-700 text-xs leading-relaxed">{c.descripcion}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Puedes agregar múltiples CIIUs. Haz clic en ✕ para quitar uno.
          </p>
        </div>

        {/* Parámetros */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            {modo === 'B' ? (
              <>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Número de empresas a seleccionar
                </label>
                <input type="number" min={5} max={500} value={nEmpresasB}
                  onChange={e => setNEmpresasB(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                <p className="text-xs text-gray-500 mt-1">
                  El sistema seleccionará las N empresas cuyo promedio de índices sea más cercano a tu objetivo
                </p>
              </>
            ) : (
              <>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Porcentaje de muestra (%)</label>
                <input type="number" min={1} max={100} value={pctMuestra}
                  onChange={e => setPctMuestra(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E8C]" />
                <p className="text-xs text-gray-500 mt-1">
                  Valor recomendado: 3%. Para sectores pequeños (&lt;100 empresas) use 10-20%
                </p>
              </>
            )}
          </div>
          <SelectorHi
            value={hiUmbral}
            onChange={setHiUmbral}
            ciius={ciius.map(c => c.codigo)}
            pctMuestra={pctMuestra}
            disabled={cargando}
          />
        </div>

        {/* Índices Modo B */}
        {modo === 'B' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Índices objetivo de la empresa</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {INDICES.map(idx => (
                <div key={idx}>
                  <label className="block text-xs text-gray-600 mb-1">{INDICES_LABELS[idx]}</label>
                  <input type="number" step="0.01" value={indicesEmpresa[idx]}
                    onChange={e => setIndicesEmpresa(prev => ({ ...prev, [idx]: e.target.value }))}
                    placeholder={
                      idx === 'IE' ? 'ej: 0.70 (70%)' :
                      idx === 'RP' ? 'ej: 0.20 (20%)' :
                      idx === 'RA' ? 'ej: 0.10 (10%)' :
                      'ej: 2.0'
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              <strong>IL, RCI:</strong> número absoluto (ej: 2.0) &nbsp;·&nbsp;
              <strong>IE, RP, RA:</strong> proporción decimal (ej: 0.70 = 70%, 0.20 = 20%)
            </p>
          </div>
        )}

        {/* Botón ejecutar */}
        <button type="submit"
          disabled={cargando || !estadoDatos || ciius.length === 0}
          className="w-full bg-[#1F4E8C] text-white font-bold py-3.5 rounded-xl text-sm hover:bg-[#163d70] transition disabled:opacity-50 disabled:cursor-not-allowed">
          {cargando
            ? 'Ejecutando análisis...'
            : ciius.length > 0
              ? `Ejecutar análisis con ${ciius.length} CIIU${ciius.length > 1 ? 's' : ''}`
              : 'Seleccione al menos un CIIU para continuar'}
        </button>

      </form>
    </div>
  )
}