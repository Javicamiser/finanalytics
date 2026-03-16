/**
 * TablаFrecuencia — reproduce exactamente la tabla del documento SETP
 * Rango | Frecuencia | % | Hi | Empresas
 * La fila del rango concentrado se resalta en azul.
 */
export default function TablaFrecuencia({ indice, datos }) {
  if (!datos) return null
  const { tabla_frecuencias, rango_concentrado, indice_recomendado,
          pct_cumplen, objetivo_empresa, pct_sector_cumple } = datos

  const esMenorMejor = indice === 'IE'
  const simbolo = esMenorMejor ? '≤' : '≥'

  return (
    <div className="space-y-4">
      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1F4E8C] text-white">
              {['RANGO', 'FRECUENCIA', '%', 'Hi', 'EMPRESAS'].map(h => (
                <th key={h} className="px-4 py-3 text-center font-semibold tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabla_frecuencias?.map((fila, i) => {
              const esConcentrado = fila.Rango === rango_concentrado
              return (
                <tr
                  key={i}
                  className={
                    esConcentrado
                      ? 'bg-blue-100 font-semibold border-l-4 border-[#2E86C1]'
                      : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }
                >
                  <td className="px-4 py-2 text-left">{fila.Rango}</td>
                  <td className="px-4 py-2 text-center">{fila.Frecuencia}</td>
                  <td className="px-4 py-2 text-center">{fila['%']}</td>
                  <td className={`px-4 py-2 text-center font-mono ${esConcentrado ? 'text-[#1F4E8C] font-bold' : ''}`}>
                    {fila.Hi}
                  </td>
                  <td className="px-4 py-2 text-center">{fila['Empresas acumuladas']}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Resultado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">
            Índice recomendado (objetivo)
          </p>
          <p className="text-2xl font-bold text-[#1F4E8C]">
            {indice} {simbolo} {indice_recomendado}
          </p>
          <p className="text-sm text-blue-700 mt-1">
            Cubre el <span className="font-bold">{(pct_cumplen * 100).toFixed(0)}%</span> del sector
          </p>
        </div>

        {objetivo_empresa != null && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-xs text-red-600 font-semibold uppercase tracking-wide mb-1">
              Objetivo empresa
            </p>
            <p className="text-2xl font-bold text-red-700">
              {indice} {simbolo} {objetivo_empresa}
            </p>
            <p className="text-sm text-red-700 mt-1">
              Cubre el <span className="font-bold">{(pct_sector_cumple * 100).toFixed(0)}%</span> del sector
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
