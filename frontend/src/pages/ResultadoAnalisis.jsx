/**
 * ResultadoAnalisis — página que muestra el análisis completo
 * con tablas y gráficas igual al documento SETP
 */
import { useState } from 'react'
import TablaFrecuencia from '../components/tables/TablaFrecuencia'
import GraficaFrecuencia from '../components/charts/GraficaFrecuencia'
import { analisisService } from '../services/api'
import toast from 'react-hot-toast'

const INDICES_INFO = {
  IL:  { titulo: 'Índice de Liquidez (Razón Corriente)',       color: 'blue' },
  IE:  { titulo: 'Índice de Endeudamiento',                    color: 'orange' },
  RCI: { titulo: 'Razón de Cobertura de Intereses',            color: 'purple' },
  RP:  { titulo: 'Rentabilidad del Patrimonio',                 color: 'green' },
  RA:  { titulo: 'Rentabilidad del Activo',                    color: 'teal' },
}

export default function ResultadoAnalisis({ resultado }) {
  const [descargando, setDescargando] = useState(false)
  if (!resultado?.resultado_json) return null

  const { config, resumen, geografico, indices } = resultado.resultado_json

  const descargarExcel = async () => {
    setDescargando(true)
    try {
      const blob = await analisisService.descargarExcel(resultado.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analisis_${resultado.id}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al descargar. Verifique su plan.')
    } finally {
      setDescargando(false)
    }
  }

  const descargarGraficas = async () => {
    setDescargando(true)
    try {
      const blob = await analisisService.descargarGraficas(resultado.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `graficas_${resultado.id}.zip`
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
          Modo: {config.modo === 'A' ? 'Objetivo del sector' : 'Por objetivo de empresa'} &nbsp;·&nbsp;
          CIIUs: {config.ciius?.join(', ')} &nbsp;·&nbsp;
          Umbral Hi: {(config.hi_umbral * 100).toFixed(0)}%
        </p>

        {/* Resumen poblacional */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          {[
            { label: 'Población (sector)', value: resumen.n_poblacion },
            { label: 'Muestra analizada', value: resumen.n_muestra },
            { label: '% de muestra', value: `${(config.porcentaje_muestra * 100).toFixed(0)}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-blue-200 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Botones de descarga */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={descargarExcel}
            disabled={descargando}
            className="bg-white text-[#1F4E8C] font-semibold px-5 py-2 rounded-lg text-sm hover:bg-blue-50 transition disabled:opacity-50"
          >
            ⬇ Descargar Excel
          </button>
          <button
            onClick={descargarGraficas}
            disabled={descargando}
            className="bg-white/20 text-white font-semibold px-5 py-2 rounded-lg text-sm hover:bg-white/30 transition disabled:opacity-50"
          >
            ⬇ Descargar Gráficas
          </button>
        </div>
      </div>

      {/* Resumen de conclusiones — tabla rápida */}
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

      {/* Un bloque por índice — igual que el documento SETP */}
      {Object.entries(indices).map(([idx, datos]) => (
        <section key={idx} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 shadow-sm">

          {/* Título del índice */}
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-lg font-bold text-[#1F4E8C]">{INDICES_INFO[idx]?.titulo}</h2>
            <p className="text-sm text-gray-600 mt-1">{datos.narrativa}</p>
          </div>

          {/* Tabla + Gráfica lado a lado (igual al documento) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <TablaFrecuencia indice={idx} datos={datos} />
            </div>
            <div>
              <GraficaFrecuencia
                indice={idx}
                datos={datos}
                titulo={INDICES_INFO[idx]?.titulo}
              />
            </div>
          </div>

          {/* Narrativa de conclusión */}
          <div className="bg-blue-50 border-l-4 border-[#1F4E8C] rounded-r-lg p-4">
            <p className="text-sm text-gray-700">{datos.narrativa}</p>
          </div>

          {/* Modo B: narrativa adicional */}
          {datos.narrativa_b && (
            <div className="bg-orange-50 border-l-4 border-orange-400 rounded-r-lg p-4">
              <p className="text-xs font-semibold text-orange-700 mb-1 uppercase">
                Análisis por objetivo de empresa
              </p>
              <p className="text-sm text-gray-700">{datos.narrativa_b}</p>
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
            <TablaGeo titulo="Muestra seleccionada" filas={geografico.muestra} />
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
              <tr key={i}
                className={`${f.Departamento === 'Total general' ? 'bg-blue-50 font-bold' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
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
