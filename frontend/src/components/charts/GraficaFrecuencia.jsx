/**
 * GraficaFrecuencia — reproduce las gráficas del documento SETP
 * Barras azules (Frecuencia) + línea amarilla (Empresas acumuladas Hi)
 */
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'

export default function GraficaFrecuencia({ indice, datos, titulo }) {
  if (!datos?.tabla_frecuencias) return null

  const { tabla_frecuencias, rango_concentrado, indice_recomendado, hi_umbral = 0.59 } = datos

  // Datos para Recharts
  const chartData = tabla_frecuencias.map(f => ({
    rango: f.Rango.replace(' y mayor', '+').replace(' - ', '-'),
    frecuencia: f.Frecuencia,
    empresas: f['Empresas acumuladas'],
    hi: parseFloat(f.Hi) || 0,
    esConcentrado: f.Rango === rango_concentrado,
  }))

  // Color personalizado por barra
  const BarConColor = (props) => {
    const { x, y, width, height, esConcentrado } = props
    return (
      <rect
        x={x} y={y} width={width} height={height}
        fill={esConcentrado ? '#1F4E8C' : '#AED6F1'}
        rx={2}
      />
    )
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-center text-gray-700 mb-3">{titulo}</h4>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="rango"
            tick={{ fontSize: 11, fill: '#555' }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            tick={{ fontSize: 11 }}
            label={{ value: 'N empresas', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            label={{ value: 'Acumuladas', angle: 90, position: 'insideRight', offset: 10, fontSize: 11 }}
          />
          <Tooltip
            formatter={(value, name) => [value, name === 'frecuencia' ? 'Frecuencia' : 'Empresas acum.']}
            labelFormatter={(l) => `Rango: ${l}`}
          />
          <Legend
            verticalAlign="top"
            formatter={(v) => v === 'frecuencia' ? 'FRECUENCIA' : 'EMPRESAS'}
          />
          <Bar
            yAxisId="left"
            dataKey="frecuencia"
            shape={<BarConColor />}
            name="frecuencia"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="empresas"
            stroke="#F39C12"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="empresas"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-center text-gray-500 mt-1">
        Rango concentrado: <span className="font-semibold text-[#1F4E8C]">{rango_concentrado}</span>
        {' '}→ Índice recomendado: <span className="font-bold text-green-700">{indice_recomendado}</span>
      </p>
    </div>
  )
}
