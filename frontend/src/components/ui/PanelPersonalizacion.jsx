/**
 * PanelPersonalizacion — panel lateral para personalizar gráficas antes de descargar
 * Props:
 *   analisisId   — id del análisis
 *   indices      — objeto con datos de índices { IL: {...}, IE: {...}, ... }
 *   onClose      — callback para cerrar el panel
 */
import { useState } from 'react'
import { analisisService } from '../../services/api'
import { PRIMARY, GRAY, SHADOW, CHART_PALETTES } from '../../theme'
import { Icon } from './Icons'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import toast from 'react-hot-toast'

const INDICES_LABELS = {
  IL: 'Índice de Liquidez (IL)',
  IE: 'Índice de Endeudamiento (IE)',
  RCI: 'Razón Cobertura de Intereses (RCI)',
  RP: 'Rentabilidad del Patrimonio (RP)',
  RA: 'Rentabilidad del Activo (RA)',
}

const PALETAS = [
  { id: 'corporativo', nombre: 'Corporativo', activa: '#1F4E8C', normal: '#AED6F1', linea: '#F39C12' },
  { id: 'ocean',       nombre: 'Océano',      activa: '#0077B6', normal: '#90E0EF', linea: '#F77F00' },
  { id: 'forest',      nombre: 'Bosque',      activa: '#2D6A4F', normal: '#95D5B2', linea: '#E9C46A' },
  { id: 'slate',       nombre: 'Pizarra',     activa: '#2C3E50', normal: '#95A5A6', linea: '#E67E22' },
  { id: 'wine',        nombre: 'Vino',        activa: '#6D2B6D', normal: '#C9A0C9', linea: '#F4A261' },
  { id: 'carbon',      nombre: 'Carbón',      activa: '#1A1A2E', normal: '#8B8FA8', linea: '#FFB347' },
]

function MiniGrafica({ datos, paleta, indicePreview }) {
  if (!datos) return null
  const tabla = datos.tabla_frecuencias || []
  const conc   = datos.rango_concentrado

  const chartData = tabla.map(f => ({
    rango: f.Rango?.replace(' y mayor', '+').replace(' - ', '-').substring(0, 7),
    freq:  f.Frecuencia,
    esConc: f.Rango === conc,
  }))

  return (
    <ResponsiveContainer width="100%" height={120}>
      <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="rango" tick={{ fontSize: 8 }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 8 }} />
        <Bar dataKey="freq" name="Freq.">
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.esConc ? paleta.activa : paleta.normal} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export default function PanelPersonalizacion({ analisisId, indices, onClose }) {
  const [paleta, setPaleta]           = useState('corporativo')
  const [usarCustom, setUsarCustom]   = useState(false)
  const [colorActiva, setColorActiva] = useState('#1F4E8C')
  const [colorNormal, setColorNormal] = useState('#AED6F1')
  const [colorLinea, setColorLinea]   = useState('#F39C12')
  const [conClusion, setConClusion]   = useState(true)
  const [indicesSelec, setIndicesSelec] = useState(Object.keys(indices || {}))
  const [indicePreview, setIndicePreview] = useState(Object.keys(indices || {})[0] || 'IL')
  const [descargando, setDescargando] = useState(false)
  const [marcaAgua, setMarcaAgua]     = useState(null)   // File object
  const [marcaPreview, setMarcaPreview] = useState(null) // URL preview

  const paletaActual = usarCustom
    ? { activa: colorActiva, normal: colorNormal, linea: colorLinea }
    : PALETAS.find(p => p.id === paleta) || PALETAS[0]

  const toggleIndice = (idx) => {
    setIndicesSelec(prev =>
      prev.includes(idx)
        ? prev.length > 1 ? prev.filter(i => i !== idx) : prev  // mínimo 1
        : [...prev, idx]
    )
  }

  const descargar = async () => {
    setDescargando(true)
    try {
      const params = new URLSearchParams({
        paleta: usarCustom ? 'corporativo' : paleta,
        incluir_conclusion: conClusion,
        indices: indicesSelec.join(','),
        ...(usarCustom && {
          color_activa: colorActiva,
          color_normal: colorNormal,
          color_linea:  colorLinea,
        }),
      })
      const formData = new FormData()
      if (marcaAgua) formData.append('marca_agua', marcaAgua)

      const blob = await analisisService.descargarGraficasPersonalizadas(analisisId, params.toString(), formData)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `graficas_${analisisId}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Gráficas descargadas')
      onClose()
    } catch {
      toast.error('Error al descargar. Verifique su plan.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 40, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '420px', background: '#fff', zIndex: 50,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px', borderBottom: `1px solid ${GRAY[200]}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: GRAY[800], margin: 0 }}>
              Personalizar gráficas
            </h2>
            <p style={{ fontSize: '11px', color: GRAY[400], marginTop: '2px' }}>
              Configura el estilo antes de descargar
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GRAY[400], padding: '4px' }}>
            <Icon.Close size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Vista previa */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: GRAY[500], marginBottom: '10px' }}>
              Vista previa — {INDICES_LABELS[indicePreview] || indicePreview}
            </div>
            <div style={{ background: GRAY[50], borderRadius: '10px', padding: '12px', border: `1px solid ${GRAY[200]}` }}>
              <MiniGrafica datos={indices[indicePreview]} paleta={paletaActual} indicePreview={indicePreview} />
              {/* Selector de índice para preview */}
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                {Object.keys(indices).map(idx => (
                  <button key={idx} onClick={() => setIndicePreview(idx)} style={{
                    fontSize: '10px', fontWeight: '600', padding: '3px 8px', borderRadius: '5px',
                    border: `1px solid ${indicePreview === idx ? PRIMARY[400] : GRAY[200]}`,
                    background: indicePreview === idx ? PRIMARY[50] : '#fff',
                    color: indicePreview === idx ? PRIMARY[600] : GRAY[500],
                    cursor: 'pointer',
                  }}>
                    {idx}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Paleta de colores */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: GRAY[500], marginBottom: '10px' }}>
              Paleta de colores
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {PALETAS.map(p => (
                <button key={p.id} onClick={() => { setPaleta(p.id); setUsarCustom(false) }} style={{
                  padding: '8px', borderRadius: '8px', cursor: 'pointer',
                  border: `2px solid ${!usarCustom && paleta === p.id ? PRIMARY[500] : GRAY[200]}`,
                  background: !usarCustom && paleta === p.id ? PRIMARY[50] : '#fff',
                  display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start',
                }}>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '3px', background: p.activa }} />
                    <div style={{ width: '16px', height: '16px', borderRadius: '3px', background: p.normal }} />
                    <div style={{ width: '16px', height: '16px', borderRadius: '3px', background: p.linea }} />
                  </div>
                  <span style={{ fontSize: '10px', color: GRAY[600], fontWeight: '500' }}>{p.nombre}</span>
                </button>
              ))}
            </div>

            {/* Colores personalizados */}
            <button onClick={() => setUsarCustom(c => !c)} style={{
              width: '100%', padding: '8px 12px', borderRadius: '8px',
              border: `1px dashed ${usarCustom ? PRIMARY[400] : GRAY[300]}`,
              background: usarCustom ? PRIMARY[50] : '#fff',
              cursor: 'pointer', fontSize: '12px', fontWeight: '500',
              color: usarCustom ? PRIMARY[600] : GRAY[500], textAlign: 'left',
            }}>
              {usarCustom ? '✓' : '+'} Colores personalizados
            </button>

            {usarCustom && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Barra principal', val: colorActiva, set: setColorActiva },
                  { label: 'Barra secundaria', val: colorNormal, set: setColorNormal },
                  { label: 'Línea Hi', val: colorLinea, set: setColorLinea },
                ].map(({ label, val, set }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="color" value={val} onChange={e => set(e.target.value)}
                      style={{ width: '32px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '2px' }} />
                    <span style={{ fontSize: '12px', color: GRAY[600] }}>{label}</span>
                    <code style={{ fontSize: '11px', color: GRAY[400], marginLeft: 'auto' }}>{val}</code>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opciones de contenido */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: GRAY[500], marginBottom: '10px' }}>
              Contenido a incluir
            </div>

            {/* Con/sin conclusión */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
              <input type="checkbox" checked={conClusion} onChange={e => setConClusion(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: PRIMARY[500], cursor: 'pointer' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: GRAY[700] }}>Incluir panel de conclusión</div>
                <div style={{ fontSize: '11px', color: GRAY[400] }}>Texto interpretativo junto a la gráfica</div>
              </div>
            </label>

            {/* Índices a incluir */}
            <div style={{ fontSize: '12px', color: GRAY[600], marginBottom: '6px' }}>Índices a descargar:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.keys(indices).map(idx => (
                <button key={idx} onClick={() => toggleIndice(idx)} style={{
                  padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                  border: `1px solid ${indicesSelec.includes(idx) ? PRIMARY[400] : GRAY[200]}`,
                  background: indicesSelec.includes(idx) ? PRIMARY[500] : '#fff',
                  color: indicesSelec.includes(idx) ? '#fff' : GRAY[500],
                  transition: 'all 0.15s',
                }}>
                  {idx}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Marca de agua */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: GRAY[500], marginBottom: '10px' }}>
              Marca de agua (opcional)
            </div>
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              padding: '16px', borderRadius: '10px', cursor: 'pointer',
              border: `2px dashed ${marcaAgua ? PRIMARY[400] : GRAY[200]}`,
              background: marcaAgua ? PRIMARY[50] : '#fff',
              transition: 'all 0.15s',
            }}>
              {marcaPreview ? (
                <img src={marcaPreview} alt="preview" style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain', opacity: 0.5 }} />
              ) : (
                <Icon.Download size={20} color={GRAY[300]} />
              )}
              <span style={{ fontSize: '12px', color: GRAY[500] }}>
                {marcaAgua ? marcaAgua.name : 'Subir logo PNG o JPG'}
              </span>
              <input type="file" accept="image/png,image/jpeg" style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setMarcaAgua(f)
                    setMarcaPreview(URL.createObjectURL(f))
                  }
                }} />
            </label>
            {marcaAgua && (
              <button onClick={() => { setMarcaAgua(null); setMarcaPreview(null) }}
                style={{ fontSize: '11px', color: GRAY[400], background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}>
                ✕ Quitar marca de agua
              </button>
            )}
            <p style={{ fontSize: '10px', color: GRAY[300], marginTop: '4px' }}>
              Se mostrará semitransparente en la esquina inferior derecha de cada gráfica
            </p>
          </div>

        {/* Footer con botón de descarga */}
        <div style={{
          padding: '16px 20px', borderTop: `1px solid ${GRAY[200]}`,
          position: 'sticky', bottom: 0, background: '#fff',
        }}>
          <button onClick={descargar} disabled={descargando} style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            background: descargando ? GRAY[300] : PRIMARY[500],
            color: '#fff', border: 'none', cursor: descargando ? 'not-allowed' : 'pointer',
            fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '8px', transition: 'background 0.15s',
          }}>
            <Icon.Download size={16} color="#fff" />
            {descargando ? 'Descargando...' : `Descargar ${indicesSelec.length} gráfica${indicesSelec.length > 1 ? 's' : ''}`}
          </button>
          <p style={{ fontSize: '11px', color: GRAY[400], textAlign: 'center', marginTop: '8px' }}>
            Se descargará un .zip con las gráficas en PNG de alta resolución
          </p>
        </div>
      </div>
    </>
  )
}