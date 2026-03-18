import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { analisisService } from '../services/api'
import { PRIMARY, GRAY, SHADOW, DANGER } from '../theme'
import { Icon } from '../components/ui/Icons'

const MODOS = [
  { value: '',  label: 'Todos los modos' },
  { value: 'A', label: 'Modo A — Sector' },
  { value: 'B', label: 'Modo B — Empresa' },
]

function Badge({ children, color = PRIMARY[500], bg = PRIMARY[50] }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: '600', color, background: bg,
      padding: '2px 7px', borderRadius: '20px', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function FilaAnalisis({ a, onRename }) {
  const [hover, setHover]       = useState(false)
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre]     = useState(a.nombre || '')
  const modoColor = a.modo === 'A' ? PRIMARY[500] : '#8E44AD'

  const guardar = async () => {
    await onRename(a.id, nombre)
    setEditando(false)
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff',
        border: `1px solid ${hover ? PRIMARY[200] : GRAY[200]}`,
        borderRadius: '10px',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
        transition: 'all 0.15s',
        boxShadow: hover ? SHADOW.md : SHADOW.sm,
      }}
    >
      {/* Modo */}
      <div style={{
        width: '30px', height: '30px', borderRadius: '7px',
        background: a.modo === 'A' ? PRIMARY[50] : '#F5EEF8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: '800', color: modoColor, flexShrink: 0,
      }}>
        {a.modo}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editando ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              autoFocus
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') setEditando(false) }}
              placeholder="Nombre del análisis..."
              style={{
                fontSize: '13px', fontWeight: '500', color: GRAY[800],
                border: `1px solid ${PRIMARY[300]}`, borderRadius: '6px',
                padding: '3px 8px', outline: 'none', width: '100%', maxWidth: '300px',
              }}
            />
            <button onClick={guardar} style={{ fontSize: '11px', color: '#fff', background: PRIMARY[500], border: 'none', borderRadius: '5px', padding: '4px 10px', cursor: 'pointer', fontWeight: '600' }}>
              Guardar
            </button>
            <button onClick={() => setEditando(false)} style={{ fontSize: '11px', color: GRAY[500], background: GRAY[100], border: 'none', borderRadius: '5px', padding: '4px 8px', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: GRAY[800], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.nombre || (a.modo === 'A' ? 'Objetivo del sector' : 'Por objetivo empresa')}
            </span>
            {hover && (
              <button onClick={() => setEditando(true)} style={{
                fontSize: '10px', color: GRAY[400], background: 'none', border: 'none',
                cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', flexShrink: 0,
              }} title="Renombrar">
                ✎
              </button>
            )}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
          {a.ciius?.slice(0, 3).map(c => <Badge key={c}>{c}</Badge>)}
          {a.ciius?.length > 3 && <Badge>+{a.ciius.length - 3}</Badge>}
          <span style={{ fontSize: '11px', color: GRAY[400] }}>
            {a.n_muestra} empresas
          </span>
        </div>
      </div>

      {/* Fecha */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', color: GRAY[400] }}>
          {new Date(a.creado_en).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })}
        </div>
        <div style={{ fontSize: '11px', color: GRAY[300], marginTop: '1px' }}>
          {new Date(a.creado_en).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Acciones */}
      <Link to={`/analisis/${a.id}`} style={{
        fontSize: '12px', fontWeight: '600', color: PRIMARY[500],
        textDecoration: 'none', padding: '6px 12px',
        border: `1px solid ${PRIMARY[200]}`, borderRadius: '7px',
        flexShrink: 0, whiteSpace: 'nowrap',
        background: hover ? PRIMARY[50] : '#fff',
        transition: 'all 0.15s',
      }}>
        Ver →
      </Link>
    </div>
  )
}

export default function Historial() {
  const [analisis, setAnalisis]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [filtroModo, setFiltroModo] = useState('')
  const [pagina, setPagina]       = useState(0)
  const POR_PAGINA = 15

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const data = await analisisService.listar(0, 100)
      setAnalisis(data)
    } catch {
      setAnalisis([])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const renombrar = async (id, nombre) => {
    try {
      await analisisService.renombrar(id, nombre)
      setAnalisis(prev => prev.map(a => a.id === id ? { ...a, nombre } : a))
    } catch {}
  }

  // Filtros
  const filtrados = analisis.filter(a => {
    const matchModo   = !filtroModo || a.modo === filtroModo
    const matchBusq   = !busqueda || (
      a.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.ciius?.some(c => c.toLowerCase().includes(busqueda.toLowerCase()))
    )
    return matchModo && matchBusq
  })

  const paginas      = Math.ceil(filtrados.length / POR_PAGINA)
  const paginados    = filtrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)

  return (
    <div style={{ padding: '28px 32px', maxWidth: '960px', margin: '0 auto' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: GRAY[800], margin: 0 }}>Historial de análisis</h1>
          <p style={{ fontSize: '13px', color: GRAY[400], marginTop: '3px' }}>
            {analisis.length} análisis realizados
          </p>
        </div>
        <Link to="/nuevo" style={{
          background: PRIMARY[500], color: '#fff', fontWeight: '600',
          padding: '9px 18px', borderRadius: '9px', fontSize: '13px',
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          + Nuevo análisis
        </Link>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPagina(0) }}
          placeholder="Buscar por nombre o CIIU..."
          style={{
            flex: '1', minWidth: '200px',
            border: `1px solid ${GRAY[200]}`, borderRadius: '8px',
            padding: '8px 12px', fontSize: '13px', outline: 'none',
            background: '#fff', color: GRAY[800],
          }}
        />
        <select
          value={filtroModo}
          onChange={e => { setFiltroModo(e.target.value); setPagina(0) }}
          style={{
            border: `1px solid ${GRAY[200]}`, borderRadius: '8px',
            padding: '8px 12px', fontSize: '13px', background: '#fff',
            color: GRAY[700], cursor: 'pointer', outline: 'none',
          }}
        >
          {MODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* Lista */}
      {cargando ? (
        <div style={{ padding: '40px', textAlign: 'center', color: GRAY[400], fontSize: '13px' }}>
          Cargando historial...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{
          background: '#fff', border: `2px dashed ${GRAY[200]}`, borderRadius: '12px',
          padding: '40px', textAlign: 'center',
        }}>
          <div style={{ marginBottom: '10px', color: GRAY[300] }}><Icon.Search size={28} color={GRAY[300]} /></div>
          <p style={{ color: GRAY[400], fontSize: '13px' }}>
            {analisis.length === 0 ? 'Aún no tienes análisis.' : 'Sin resultados para esta búsqueda.'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {paginados.map(a => (
              <FilaAnalisis key={a.id} a={a} onRename={renombrar} />
            ))}
          </div>

          {/* Paginación */}
          {paginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '20px' }}>
              <button
                onClick={() => setPagina(p => Math.max(0, p - 1))}
                disabled={pagina === 0}
                style={{
                  padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: '600',
                  border: `1px solid ${GRAY[200]}`, background: '#fff', cursor: pagina === 0 ? 'not-allowed' : 'pointer',
                  color: pagina === 0 ? GRAY[300] : GRAY[600],
                }}>
                ← Anterior
              </button>
              <span style={{ fontSize: '12px', color: GRAY[400] }}>
                {pagina + 1} / {paginas}
              </span>
              <button
                onClick={() => setPagina(p => Math.min(paginas - 1, p + 1))}
                disabled={pagina === paginas - 1}
                style={{
                  padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: '600',
                  border: `1px solid ${GRAY[200]}`, background: '#fff', cursor: pagina === paginas - 1 ? 'not-allowed' : 'pointer',
                  color: pagina === paginas - 1 ? GRAY[300] : GRAY[600],
                }}>
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}