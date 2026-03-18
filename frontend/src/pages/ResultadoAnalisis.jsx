import { useState } from 'react'
import TablaFrecuencia from '../components/tables/TablaFrecuencia'
import GraficaFrecuencia from '../components/charts/GraficaFrecuencia'
import { analisisService } from '../services/api'
import toast from 'react-hot-toast'

const INDICES_INFO = {
  IL:  { titulo: 'Índice de Liquidez (Razón Corriente)', color: 'blue' },
  IE:  { titulo: 'Índice de Endeudamiento',              color: 'orange' },
  RCI: { titulo: 'Razón de Cobertura de Intereses',      color: 'purple' },
  RP:  { titulo: 'Rentabilidad del Patrimonio',          color: 'green' },
  RA:  { titulo: 'Rentabilidad del Activo',              color: 'teal' },
}

const COLOR_SIMILITUD = (similar, diff_pct) => {
  if (diff_pct <= 10)  return { bg: 'bg-green-50',  borde: 'border-green-400',  texto: 'text-green-800',  badge: 'bg-green-100 text-green-800' }
  if (diff_pct <= 25)  return { bg: 'bg-blue-50',   borde: 'border-blue-300',   texto: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700' }
  if (diff_pct <= 50)  return { bg: 'bg-yellow-50', borde: 'border-yellow-400', texto: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-800' }
  return                      { bg: 'bg-orange-50', borde: 'border-orange-400', texto: 'text-orange-800', badge: 'bg-orange-100 text-orange-800' }
}

export default function ResultadoAnalisis({ resultado }) {
  const [descargando, setDescargando] = useState(false)
  if (!resultado?.resultado_json) return null

  const { config, resumen, geografico, indices } = resultado.resultado_json
  const esModoB = config.modo === 'B'
  const resumenB = resumen?.resumen_modo_b

  const descargar = async (tipo) => {
    setDescargando(true)
    try {
      const blob = tipo === 'excel'
        ? await analisisService.descargarExcel(resultado.id)
        : await analisisService.descargarGraficas(resultado.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = tipo === 'excel' ? `analisis_${resultado.id}.xlsx` : `graficas_${resultado.id}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al descargar. Verifique su plan.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

      {/* Encabezado */}
      <div className="bg-[#1F4E8C] text-white rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-1">Análisis de Indicadores Financieros</h1>
        <p className="text-blue-200 text-sm">
          Modo: {esModoB ? 'Por objetivo de empresa' : 'Objetivo del sector'} &nbsp;·&nbsp;
          CIIUs: {config.ciius?.join(', ')} &nbsp;·&nbsp;
          Umbral Hi: {((config.hi_umbral || 0.59) * 100).toFixed(0)}%
        </p>

        <div className="grid grid-cols-3 gap-4 mt-4">
          {[
            { label: 'Población (sector)', value: resumen.n_poblacion },
            { label: esModoB ? 'Empresas seleccionadas' : 'Muestra analizada', value: resumen.n_muestra },
            { label: esModoB ? 'Empresas solicitadas' : '% de muestra',
              value: esModoB ? (config.n_empresas_b ?? resumen.n_muestra) : `${((config.porcentaje_muestra||0.03) * 100).toFixed(0)}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-blue-200 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={() => descargar('excel')} disabled={descargando}
            className="bg-white text-[#1F4E8C] font-semibold px-5 py-2 rounded-lg text-sm hover:bg-blue-50 transition disabled:opacity-50">
            ⬇ Descargar Excel
          </button>
          <button onClick={() => descargar('graficas')} disabled={descargando}
            className="bg-white/20 text-white font-semibold px-5 py-2 rounded-lg text-sm hover:bg-white/30 transition disabled:opacity-50">
            ⬇ Descargar Gráficas
          </button>
        </div>
      </div>

      {/* ── MODO B: Resumen de cercanía al objetivo ── */}
      {esModoB && resumenB && (
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Resumen — Cercanía al objetivo</h2>
          <p className="text-sm text-gray-500 mb-4">
            Se seleccionaron las {resumen.n_muestra} empresas del sector cuyo perfil financiero
            minimiza la distancia a los índices objetivo. La tabla muestra qué tan cerca quedó
            el promedio de cada índice respecto al valor solicitado.
          </p>

          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1F4E8C] text-white">
                  {['Índice', 'Índice empresa', 'Promedio del grupo', 'Diferencia', 'Similitud', 'Cumplen en el sector', 'Evaluación'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(resumenB).map(([idx, m], i) => {
                  const esMenor = idx === 'IE'
                  const col = COLOR_SIMILITUD(m.similar, m.diferencia_pct)
                  const fmt = (v) => idx === 'IE' || idx === 'RP' || idx === 'RA'
                    ? `${(v * 100).toFixed(1)}%` : v?.toFixed(2)
                  return (
                    <tr key={idx} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-100`}>
                      <td className="px-4 py-3 font-bold text-[#1F4E8C]">{idx}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-gray-800">
                        {fmt(m.objetivo)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold">
                        {fmt(m.promedio_grupo)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${col.badge}`}>
                          {m.diferencia_pct?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${m.similar ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {m.similar ? '✓ Similar' : '~ Diferente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">{m.n_pob_cumple ?? '—'}</span> empresas
                        {m.pct_pob_cumple != null && (
                          <span className="ml-1 text-gray-400">({(m.pct_pob_cumple*100).toFixed(1)}%)</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-xs ${col.texto}`}>
                        {m.evaluacion}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Semáforo de resultado global */}
          {(() => {
            const total = Object.keys(resumenB).length
            const cumplen = Object.values(resumenB).filter(m => m.similar).length
            const pct = (cumplen / total * 100).toFixed(0)
            const color = cumplen === total ? 'green' : cumplen >= total * 0.6 ? 'yellow' : 'red'
            const msg = cumplen === total
              ? 'El grupo seleccionado tiene un perfil muy similar al de la empresa en todos los índices.'
              : cumplen >= total * 0.6
              ? `El grupo es similar en ${cumplen} de ${total} índices. El sector tiene empresas con un perfil parecido.`
              : `El grupo difiere en varios índices. El sector puede tener un perfil financiero distinto al de la empresa.`
            return (
              <div className={`mt-4 p-4 rounded-xl border ${
                color === 'green' ? 'bg-green-50 border-green-200' :
                color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
              }`}>
                <p className={`font-semibold text-sm ${
                  color === 'green' ? 'text-green-800' :
                  color === 'yellow' ? 'text-yellow-800' : 'text-red-800'
                }`}>
                  {color === 'green' ? '✅' : color === 'yellow' ? '⚠️' : '❌'} {msg}
                </p>
              </div>
            )
          })()}
        </section>
      )}

      {/* ── MODO A: Resumen de índices recomendados ── */}
      {!esModoB && (
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Resumen de Índices Recomendados</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  {['Índice', 'Descripción', 'Valor recomendado', 'Dirección', '% sector cumple'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(indices).map(([idx, datos], i) => {
                  const esMenor = idx === 'IE'
                  return (
                    <tr key={idx} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-bold text-[#1F4E8C]">{idx}</td>
                      <td className="px-4 py-3 text-gray-700">{INDICES_INFO[idx]?.titulo}</td>
                      <td className="px-4 py-3 font-bold text-green-700 text-base">
                        {idx} {esMenor ? '≤' : '≥'} {datos.indice_recomendado}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {esMenor ? 'Menor es mejor' : 'Mayor es mejor'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                          {(datos.pct_cumplen * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Bloque por índice */}
      {Object.entries(indices).map(([idx, datos]) => (
        <section key={idx} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 shadow-sm">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-lg font-bold text-[#1F4E8C]">{INDICES_INFO[idx]?.titulo}</h2>
            {!esModoB && <p className="text-sm text-gray-600 mt-1">{datos.narrativa}</p>}
            {esModoB && datos.narrativa_b && (
              <p className="text-sm text-gray-600 mt-1">{datos.narrativa_b}</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TablaFrecuencia indice={idx} datos={datos} />
            <GraficaFrecuencia indice={idx} datos={datos} titulo={INDICES_INFO[idx]?.titulo} />
          </div>

          {/* Modo B: card de cercanía por índice */}
          {esModoB && resumenB?.[idx] && (() => {
            const m = resumenB[idx]
            const col = COLOR_SIMILITUD(m.similar, m.diferencia_pct)
            const esMenor = idx === 'IE'
            const fmt = (v) => (idx === 'IE' || idx === 'RP' || idx === 'RA') ? `${(v*100).toFixed(1)}%` : v?.toFixed(2)
            return (
              <div className={`${col.bg} border-l-4 ${col.borde} rounded-r-xl p-4`}>
                <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${col.texto}`}>
                  Cercanía al objetivo — {idx}
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Objetivo</p>
                    <p className="font-bold font-mono">{esMenor ? '≤' : '≥'} {fmt(m.objetivo)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Promedio del grupo</p>
                    <p className={`font-bold font-mono ${col.texto}`}>{fmt(m.promedio_grupo)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Diferencia</p>
                    <p className="font-bold">{m.diferencia_pct?.toFixed(1)}% — {m.similar ? '✓ Similar' : '~ Diferente'}</p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Modo A: narrativa de conclusión */}
          {!esModoB && (
            <div className="bg-blue-50 border-l-4 border-[#1F4E8C] rounded-r-lg p-4">
              <p className="text-sm text-gray-700">{datos.narrativa}</p>
            </div>
          )}
        </section>
      ))}

      {/* Distribución geográfica */}
      {geografico && (
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Distribución Geográfica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TablaGeo titulo="Población del sector" filas={geografico.poblacion} />
            <TablaGeo titulo={esModoB ? 'Grupo seleccionado' : 'Muestra seleccionada'} filas={geografico.muestra} />
          </div>
        </section>
      )}

      {/* Advertencias */}
      {resumen.advertencias?.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <p className="font-semibold text-yellow-800 mb-2">⚠ Advertencias</p>
          {resumen.advertencias.map((a, i) => (
            <p key={i} className="text-sm text-yellow-700">• {a}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function TablaGeo({ titulo, filas }) {
  if (!filas?.length) return null
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{titulo}</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Departamento</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">N empresas</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className={`${f.Departamento === 'Total general' ? 'bg-blue-50 font-bold' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="px-3 py-1.5">{f.Departamento}</td>
                <td className="px-3 py-1.5 text-right">{f['Número de Empresas']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}