/**
 * SelectorHi — permite al usuario elegir entre:
 *   A) Umbral Hi personalizado (campo numérico)
 *   B) Calculado automáticamente por el sistema (segunda derivada)
 *
 * Props:
 *   value        — valor actual de Hi (0-100, como entero para mostrar)
 *   onChange     — callback(nuevoValor) cuando cambia
 *   ciius        — array de códigos CIIU seleccionados
 *   pctMuestra   — porcentaje de muestra (0-100, como entero)
 *   disabled     — deshabilitar el componente
 */
import { useState } from 'react'
import { analisisService } from '../../services/api'
import toast from 'react-hot-toast'

const COLORES_INDICE = {
  IL:  { bg: '#EBF5FB', borde: '#2E86C1', texto: '#1A5276' },
  IE:  { bg: '#FEF9E7', borde: '#F39C12', texto: '#7D6608' },
  RCI: { bg: '#EAF4FB', borde: '#1ABC9C', texto: '#0E6655' },
  RP:  { bg: '#F5EEF8', borde: '#8E44AD', texto: '#6C3483' },
  RA:  { bg: '#EAFAF1', borde: '#27AE60', texto: '#1E8449' },
}

const DESCRIPCION_INDICE = {
  IL:  'Índice de Liquidez',
  IE:  'Índice de Endeudamiento',
  RCI: 'Razón de Cobertura de Intereses',
  RP:  'Rentabilidad del Patrimonio',
  RA:  'Rentabilidad del Activo',
}

export default function SelectorHi({ value, onChange, ciius, pctMuestra, disabled }) {
  const [modo, setModo] = useState('personalizado')   // 'personalizado' | 'automatico'
  const [calculando, setCalculando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState('IL')

  const calcular = async () => {
    if (!ciius || ciius.length === 0) {
      toast.error('Seleccione al menos un CIIU antes de calcular el Hi óptimo')
      return
    }
    setCalculando(true)
    setMostrarModal(true)
    try {
      const res = await analisisService.calcularHi(ciius, pctMuestra / 100)
      setResultado(res)
      // Aplicar el Hi global sugerido automáticamente
      onChange(Math.round(res.hi_global_sugerido * 100))
      setModo('automatico')
    } catch (err) {
      toast.error('Error al calcular el Hi óptimo')
      setMostrarModal(false)
    } finally {
      setCalculando(false)
    }
  }

  const aplicarHiIndice = (indice) => {
    const hi = resultado?.por_indice?.[indice]?.hi_optimo
    if (hi) {
      onChange(Math.round(hi * 100))
      toast.success(`Hi ajustado a ${Math.round(hi * 100)}% según ${indice}`)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-gray-700">
          Umbral de concentración Hi (%)
        </label>
        {/* Botón de info */}
        <button
          type="button"
          onClick={() => setMostrarModal(true)}
          className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200 transition flex items-center justify-center"
          title="¿Qué es el umbral Hi?"
        >
          ?
        </button>
      </div>

      {/* Selector de modo */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setModo('personalizado')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition ${
            modo === 'personalizado'
              ? 'bg-[#1F4E8C] text-white border-[#1F4E8C]'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          }`}
        >
          Personalizado
        </button>
        <button
          type="button"
          onClick={calcular}
          disabled={calculando || disabled}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition ${
            modo === 'automatico'
              ? 'bg-[#1F4E8C] text-white border-[#1F4E8C]'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {calculando ? 'Calculando...' : modo === 'automatico' ? '✓ Calculado por sistema' : 'Calcular automáticamente'}
        </button>
      </div>

      {/* Input numérico */}
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={50} max={90}
          value={value}
          onChange={e => { setModo('personalizado'); onChange(Number(e.target.value)) }}
          disabled={disabled}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E8C]"
        />
        {modo === 'automatico' && resultado && (
          <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1 whitespace-nowrap">
            ✓ Sistema
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500">
        {modo === 'automatico' && resultado
          ? `Hi calculado por segunda derivada de la curva acumulada del sector (${resultado.n_muestra} empresas de muestra)`
          : 'Valor estándar en análisis de sector colombiano'}
      </p>

      {/* Modal */}
      {mostrarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setMostrarModal(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-[#1F4E8C] text-white p-5 rounded-t-2xl flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold">¿Qué es el umbral Hi?</h2>
                <p className="text-blue-200 text-sm mt-1">
                  Frecuencia relativa acumulada — criterio de concentración sectorial
                </p>
              </div>
              <button type="button" onClick={() => setMostrarModal(false)}
                className="text-white hover:opacity-70 text-xl font-bold ml-4">✕</button>
            </div>

            <div className="p-5 space-y-5">
              {/* Explicación */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 space-y-2">
                <p><strong>Hi</strong> es el porcentaje de empresas del sector que tienen un indicador financiero <strong>igual o mejor</strong> que el límite de cada rango.</p>
                <p>Por ejemplo, Hi = 59% en el rango 1.5–1.99 de IL significa que <strong>el 59% de las empresas del sector tiene IL ≥ 1.5</strong>.</p>
                <p>El umbral Hi define cuándo un rango es suficientemente representativo — <strong>el rango donde Hi cruza ese umbral es el rango concentrado</strong>, y su límite superior se convierte en el índice recomendado.</p>
              </div>

              {/* Sin resultado aún */}
              {calculando && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">⏳</div>
                  <p className="text-gray-600 font-semibold">Calculando el Hi óptimo para tu sector...</p>
                  <p className="text-gray-500 text-sm mt-1">Procesando la distribución de {ciius?.length} CIIU(s)</p>
                </div>
              )}

              {/* Resultado del cálculo */}
              {resultado && !calculando && (
                <>
                  {/* Hi global */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Hi óptimo sugerido</p>
                        <p className="text-3xl font-bold text-green-800 mt-1">{resultado.hi_global_sugerido_pct}</p>
                        <p className="text-xs text-green-700 mt-1">
                          Promedio de los puntos de inflexión de los 5 índices
                          · {resultado.n_muestra} empresas analizadas de {resultado.n_poblacion} en el sector
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { onChange(Math.round(resultado.hi_global_sugerido * 100)); setMostrarModal(false) }}
                        className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 transition"
                      >
                        Usar este Hi
                      </button>
                    </div>
                  </div>

                  {/* Tabs por índice */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Hi óptimo por índice</p>
                    <div className="flex gap-1 flex-wrap mb-3">
                      {Object.keys(resultado.por_indice).map(idx => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setIndiceActivo(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                            indiceActivo === idx
                              ? 'text-white border-transparent'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                          }`}
                          style={indiceActivo === idx
                            ? { background: COLORES_INDICE[idx]?.borde || '#1F4E8C' }
                            : {}}
                        >
                          {idx}
                        </button>
                      ))}
                    </div>

                    {resultado.por_indice[indiceActivo] && (() => {
                      const datos = resultado.por_indice[indiceActivo]
                      const color = COLORES_INDICE[indiceActivo] || {}
                      return (
                        <div className="border rounded-xl overflow-hidden" style={{ borderColor: color.borde }}>
                          {/* Header del índice */}
                          <div className="px-4 py-3 flex justify-between items-center"
                            style={{ background: color.bg }}>
                            <div>
                              <p className="text-xs font-semibold" style={{ color: color.texto }}>
                                {DESCRIPCION_INDICE[indiceActivo]}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                Punto de inflexión: <strong>{datos.hi_optimo_pct}</strong>
                                &nbsp;·&nbsp; Rango: <strong>{datos.rango_concentrado}</strong>
                                &nbsp;·&nbsp; Índice recomendado: <strong>
                                  {indiceActivo === 'IE' ? '≤' : '≥'} {datos.indice_recomendado}
                                </strong>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => aplicarHiIndice(indiceActivo)}
                              className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition"
                              style={{ background: color.borde }}
                            >
                              Usar {datos.hi_optimo_pct}
                            </button>
                          </div>

                          {/* Tabla de curva Hi */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="px-3 py-2 text-left text-gray-600">Rango</th>
                                  <th className="px-3 py-2 text-center text-gray-600">Empresas</th>
                                  <th className="px-3 py-2 text-center text-gray-600">Hi</th>
                                  <th className="px-3 py-2 text-center text-gray-600">Punto de inflexión</th>
                                </tr>
                              </thead>
                              <tbody>
                                {datos.curva_hi.map((fila, i) => (
                                  <tr key={i}
                                    className={fila.es_optimo ? 'font-semibold' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                    style={fila.es_optimo ? { background: color.bg } : {}}
                                  >
                                    <td className="px-3 py-2 font-mono" style={fila.es_optimo ? { color: color.texto } : {}}>
                                      {fila.rango}
                                    </td>
                                    <td className="px-3 py-2 text-center text-gray-600">{fila.freq}</td>
                                    <td className="px-3 py-2 text-center font-mono"
                                      style={fila.es_optimo ? { color: color.borde, fontWeight: 700 } : {}}>
                                      {fila.hi_pct}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {fila.es_optimo && (
                                        <span className="px-2 py-0.5 rounded-full text-white text-xs"
                                          style={{ background: color.borde }}>
                                          ← inflexión
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Explicación técnica */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-600">
                    <p className="font-semibold text-gray-700 mb-1">Método de cálculo</p>
                    <p>{resultado.explicacion}</p>
                    <p className="mt-2 text-gray-500">
                      Puedes usar el Hi global sugerido ({resultado.hi_global_sugerido_pct}) o ajustarlo manualmente.
                      Valor estándar en análisis de sector colombiano como referencia estándar.
                    </p>
                  </div>
                </>
              )}

              {/* Sin resultado y sin calculando — solo info */}
              {!resultado && !calculando && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                    <p className="font-semibold mb-1">¿Cuándo usar el cálculo automático?</p>
                    <p>Cuando quieres que el umbral refleje la distribución <strong>real de tu sector específico</strong> en lugar del 59% estándar. El sistema analiza la curva Hi de los CIIUs seleccionados y encuentra el punto donde la distribución cambia de concentrada a dispersa.</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
                    <p className="font-semibold mb-1">¿Cuándo usar 59% (por defecto)?</p>
                    <p>En la mayoría de procesos de contratación pública colombiana el 59% es un valor técnicamente aceptable en procesos de contratación pública bajo el Decreto 1082/2015.</p>
                  </div>
                  <button
                    type="button"
                    onClick={calcular}
                    disabled={!ciius || ciius.length === 0 || disabled}
                    className="w-full bg-[#1F4E8C] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#163d70] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!ciius || ciius.length === 0
                      ? 'Seleccione CIIUs primero para calcular'
                      : `Calcular Hi óptimo para ${ciius.length} CIIU(s) seleccionado(s)`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}