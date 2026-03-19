import { useState, useEffect } from 'react'
import { datosService, authService } from '../services/api'
import { PRIMARY, GRAY, SUCCESS, WARNING, DANGER, SHADOW } from '../theme'
import { Icon } from '../components/ui/Icons'
import { useAuthStore } from '../store/authStore'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'

function StatAdmin({ label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: '10px', padding: '16px 18px', border: `1px solid ${GRAY[200]}`, boxShadow: SHADOW.sm }}>
      <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: GRAY[400] }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: '800', color: color || PRIMARY[500], marginTop: '4px' }}>{value}</div>
    </div>
  )
}

export default function Admin() {
  const user = useAuthStore(s => s.user)
  if (!user?.es_admin) return <Navigate to="/dashboard" replace />

  const [estadoDatos, setEstadoDatos]   = useState(null)
  const [usuarios, setUsuarios]         = useState([])
  const [cargando, setCargando]         = useState(true)
  const [subiendo, setSubiendo]         = useState(false)
  const [archivo, setArchivo]           = useState(null)
  const [año, setAño]                   = useState(new Date().getFullYear())
  const [notas, setNotas]               = useState('')
  const [progreso, setProgreso]         = useState('')
  const [tabActiva, setTabActiva]       = useState('datos')

  useEffect(() => {
    Promise.all([
      datosService.estado().catch(() => null),
      authService.listarUsuarios?.().catch(() => []),
    ]).then(([e, u]) => {
      setEstadoDatos(e)
      setUsuarios(u || [])
    }).finally(() => setCargando(false))
  }, [])

  const subirSIIS = async () => {
    if (!archivo) { toast.error('Selecciona un archivo Excel'); return }
    setSubiendo(true)
    setProgreso('Subiendo archivo...')
    try {
      const resultado = await datosService.cargarExcel(año, archivo, notas)
      setProgreso('')
      toast.success(`✅ ${resultado.n_empresas?.toLocaleString()} empresas cargadas`)
      setArchivo(null)
      const e = await datosService.estado()
      setEstadoDatos(e)
    } catch (e) {
      setProgreso('')
      toast.error(e.response?.data?.detail || 'Error al cargar el archivo')
    } finally {
      setSubiendo(false)
    }
  }

  const toggleAdmin = async (uid, esAdmin) => {
    try {
      await authService.actualizarUsuario(uid, { es_admin: !esAdmin })
      setUsuarios(prev => prev.map(u => u.id === uid ? { ...u, es_admin: !esAdmin } : u))
      toast.success('Actualizado')
    } catch { toast.error('Error') }
  }

  const cambiarPlan = async (uid, plan) => {
    try {
      await authService.actualizarUsuario(uid, { plan })
      setUsuarios(prev => prev.map(u => u.id === uid ? { ...u, plan } : u))
      toast.success('Plan actualizado')
    } catch { toast.error('Error') }
  }

  const planColor = { free: GRAY[400], creditos: WARNING.base, pro: SUCCESS.base }

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1100px', margin: '0 auto' }}>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: GRAY[800], margin: 0 }}>Panel de administración</h1>
        <p style={{ fontSize: '13px', color: GRAY[400], marginTop: '3px' }}>Gestión de datos y usuarios</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <StatAdmin label="Empresas en BD" value={estadoDatos?.n_empresas?.toLocaleString('es-CO') || '—'} />
        <StatAdmin label="CIIUs activos" value={estadoDatos?.n_ciius || '—'} color="#8E44AD" />
        <StatAdmin label="Usuarios registrados" value={usuarios.length} color={SUCCESS.base} />
        <StatAdmin label="Período datos" value={estadoDatos?.periodo_datos || '—'} color={WARNING.base} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: GRAY[100], borderRadius: '10px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
        {[
          { id: 'datos',    label: 'Datos SIIS' },
          { id: 'usuarios', label: 'Usuarios' },
        ].map(t => (
          <button key={t.id} onClick={() => setTabActiva(t.id)} style={{
            padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontWeight: '600', fontSize: '13px',
            background: tabActiva === t.id ? '#fff' : 'transparent',
            color: tabActiva === t.id ? PRIMARY[600] : GRAY[500],
            boxShadow: tabActiva === t.id ? SHADOW.sm : 'none',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Datos SIIS */}
      {tabActiva === 'datos' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: `1px solid ${GRAY[200]}`, boxShadow: SHADOW.sm, padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: GRAY[800], margin: '0 0 16px' }}>Cargar nuevo Excel de Supersociedades</h3>

          {estadoDatos && (
            <div style={{ background: GRAY[50], borderRadius: '8px', padding: '12px 14px', marginBottom: '20px', fontSize: '12px', color: GRAY[600] }}>
              Última carga: <strong>{new Date(estadoDatos.fecha_carga).toLocaleString('es-CO')}</strong>
              {' · '}{estadoDatos.n_empresas?.toLocaleString()} empresas
              {estadoDatos.periodo_datos && ` · Período: ${estadoDatos.periodo_datos}`}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '500px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: GRAY[600], display: 'block', marginBottom: '6px' }}>
                Año del reporte
              </label>
              <input type="number" value={año} onChange={e => setAño(parseInt(e.target.value))}
                style={{ width: '120px', border: `1px solid ${GRAY[200]}`, borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none' }} />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: GRAY[600], display: 'block', marginBottom: '6px' }}>
                Archivo Excel (.xlsx)
              </label>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
                border: `2px dashed ${archivo ? PRIMARY[400] : GRAY[200]}`,
                borderRadius: '10px', cursor: 'pointer',
                background: archivo ? PRIMARY[50] : '#fff',
              }}>
                <Icon.Download size={18} color={archivo ? PRIMARY[500] : GRAY[300]} />
                <span style={{ fontSize: '13px', color: archivo ? PRIMARY[600] : GRAY[400] }}>
                  {archivo ? archivo.name : 'Seleccionar archivo Excel de Supersociedades'}
                </span>
                <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                  onChange={e => setArchivo(e.target.files?.[0] || null)} />
              </label>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: GRAY[600], display: 'block', marginBottom: '6px' }}>
                Notas (opcional)
              </label>
              <input type="text" value={notas} onChange={e => setNotas(e.target.value)}
                placeholder="ej: Actualización Q4 2024"
                style={{ width: '100%', border: `1px solid ${GRAY[200]}`, borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none' }} />
            </div>

            <button onClick={subirSIIS} disabled={subiendo || !archivo} style={{
              padding: '12px', borderRadius: '10px', border: 'none',
              background: subiendo || !archivo ? GRAY[200] : PRIMARY[500],
              color: subiendo || !archivo ? GRAY[400] : '#fff',
              fontWeight: '700', fontSize: '13px', cursor: subiendo || !archivo ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              <Icon.Download size={15} color={subiendo || !archivo ? GRAY[400] : '#fff'} />
              {subiendo ? (progreso || 'Procesando...') : 'Cargar datos SIIS'}
            </button>
          </div>
        </div>
      )}

      {/* Tab Usuarios */}
      {tabActiva === 'usuarios' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: `1px solid ${GRAY[200]}`, boxShadow: SHADOW.sm, overflow: 'hidden' }}>
          {cargando ? (
            <div style={{ padding: '40px', textAlign: 'center', color: GRAY[400], fontSize: '13px' }}>Cargando usuarios...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: GRAY[50] }}>
                  {['Usuario', 'Email', 'Plan', 'Créditos', 'Admin', 'Registro'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: '600', color: GRAY[600], fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${GRAY[200]}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, i) => (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : GRAY[50], borderBottom: `1px solid ${GRAY[100]}` }}>
                    <td style={{ padding: '10px 14px', fontWeight: '500', color: GRAY[800] }}>{u.nombre}</td>
                    <td style={{ padding: '10px 14px', color: GRAY[500] }}>{u.email}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <select value={u.plan} onChange={e => cambiarPlan(u.id, e.target.value)}
                        style={{ fontSize: '11px', fontWeight: '600', padding: '3px 6px', borderRadius: '6px', border: `1px solid ${GRAY[200]}`, background: '#fff', color: planColor[u.plan], cursor: 'pointer' }}>
                        <option value="free">Free</option>
                        <option value="creditos">Créditos</option>
                        <option value="pro">Pro</option>
                      </select>
                    </td>
                    <td style={{ padding: '10px 14px', color: GRAY[600] }}>
                      {u.plan === 'pro' ? '∞' : u.creditos || 0}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => toggleAdmin(u.id, u.es_admin)} style={{
                        fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        background: u.es_admin ? PRIMARY[500] : GRAY[100],
                        color: u.es_admin ? '#fff' : GRAY[500],
                      }}>
                        {u.es_admin ? 'Admin' : 'User'}
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px', color: GRAY[400], fontSize: '11px' }}>
                      {new Date(u.creado_en).toLocaleDateString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}