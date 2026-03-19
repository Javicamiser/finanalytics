import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { authService, analisisService } from '../services/api'
import { PRIMARY, GRAY, SUCCESS, WARNING, DANGER, SHADOW } from '../theme'
import { Icon } from '../components/ui/Icons'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

const fmt = (n) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(n)

function SeccionCard({ titulo, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: `1px solid ${GRAY[200]}`, boxShadow: SHADOW.sm, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${GRAY[100]}`, background: GRAY[50] }}>
        <h3 style={{ fontSize: '13px', fontWeight: '700', color: GRAY[700], margin: 0 }}>{titulo}</h3>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )
}

function Campo({ label, value, onEdit, editando, onChange, onSave, onCancel, tipo = 'text' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${GRAY[100]}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '11px', color: GRAY[400], marginBottom: '2px' }}>{label}</div>
        {editando ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
            <input type={tipo} value={value} onChange={e => onChange(e.target.value)}
              style={{ fontSize: '13px', border: `1px solid ${PRIMARY[300]}`, borderRadius: '6px', padding: '5px 10px', outline: 'none', width: '260px' }} />
            <button onClick={onSave} style={{ fontSize: '11px', fontWeight: '600', background: PRIMARY[500], color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer' }}>Guardar</button>
            <button onClick={onCancel} style={{ fontSize: '11px', color: GRAY[400], background: 'none', border: 'none', cursor: 'pointer' }}>Cancelar</button>
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: GRAY[800], marginTop: '1px' }}>{value || '—'}</div>
        )}
      </div>
      {!editando && onEdit && (
        <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GRAY[400], padding: '4px' }}
          onMouseEnter={e => e.currentTarget.style.color = PRIMARY[500]}
          onMouseLeave={e => e.currentTarget.style.color = GRAY[400]}>
          <Icon.Edit size={14} />
        </button>
      )}
    </div>
  )
}

export default function Perfil() {
  const { user, loadUser } = useAuthStore()
  const [historialPagos, setHistorialPagos] = useState([])
  const [cargandoPagos, setCargandoPagos]   = useState(true)

  // Campos editables
  const [editNombre, setEditNombre]     = useState(false)
  const [editFirma, setEditFirma]       = useState(false)
  const [editPass, setEditPass]         = useState(false)
  const [nombre, setNombre]             = useState(user?.nombre || '')
  const [firma, setFirma]               = useState(user?.firma || '')
  const [passActual, setPassActual]     = useState('')
  const [passNueva, setPassNueva]       = useState('')
  const [passConfirm, setPassConfirm]   = useState('')
  const [guardando, setGuardando]       = useState(false)

  useEffect(() => {
    analisisService.historialPagos?.()
      .then(setHistorialPagos)
      .catch(() => {})
      .finally(() => setCargandoPagos(false))
  }, [])

  const guardarCampo = async (campo, valor) => {
    setGuardando(true)
    try {
      await authService.actualizarPerfil({ [campo]: valor })
      await loadUser()
      toast.success('Actualizado correctamente')
      if (campo === 'nombre') setEditNombre(false)
      if (campo === 'firma')  setEditFirma(false)
    } catch {
      toast.error('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const cambiarPassword = async () => {
    if (passNueva !== passConfirm) { toast.error('Las contraseñas no coinciden'); return }
    if (passNueva.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return }
    setGuardando(true)
    try {
      await authService.cambiarPassword({ password_actual: passActual, password_nuevo: passNueva })
      toast.success('Contraseña actualizada')
      setEditPass(false); setPassActual(''); setPassNueva(''); setPassConfirm('')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al cambiar la contraseña')
    } finally {
      setGuardando(false)
    }
  }

  const planLabel   = { free: 'Free', creditos: 'Créditos', pro: 'Pro' }
  const planColor   = { free: GRAY[500], creditos: WARNING.base, pro: SUCCESS.base }
  const creditosDisp = user?.plan === 'free'
    ? Math.max(0, 1 - (user?.creditos_free_usados_este_mes || 0))
    : user?.plan === 'pro' ? '∞' : (user?.creditos || 0)

  return (
    <div style={{ padding: '28px 32px', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Encabezado */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: GRAY[800], margin: 0 }}>Mi perfil</h1>
        <p style={{ fontSize: '13px', color: GRAY[400], marginTop: '3px' }}>Gestiona tu información y plan</p>
      </div>

      {/* Avatar + plan */}
      <div style={{ background: '#fff', borderRadius: '12px', border: `1px solid ${GRAY[200]}`, boxShadow: SHADOW.sm, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: PRIMARY[500], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
          {user?.nombre?.[0]?.toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: '700', color: GRAY[800] }}>{user?.nombre}</div>
          <div style={{ fontSize: '12px', color: GRAY[400], marginTop: '2px' }}>{user?.email}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: planColor[user?.plan] || GRAY[500], background: `${planColor[user?.plan]}15`, padding: '4px 12px', borderRadius: '20px' }}>
            Plan {planLabel[user?.plan] || 'Free'}
          </span>
          <div style={{ fontSize: '11px', color: GRAY[400], marginTop: '4px' }}>
            {user?.plan === 'pro'
              ? `Activo hasta ${new Date(user.suscripcion_hasta).toLocaleDateString('es-CO')}`
              : user?.plan === 'free'
              ? `${creditosDisp} análisis restante este mes`
              : `${creditosDisp} créditos disponibles`}
          </div>
          <Link to="/dashboard/planes" style={{ fontSize: '11px', color: PRIMARY[500], fontWeight: '600', textDecoration: 'none', marginTop: '4px', display: 'block' }}>
            {user?.plan === 'free' ? 'Actualizar plan →' : 'Gestionar plan →'}
          </Link>
        </div>
      </div>

      {/* Datos personales */}
      <SeccionCard titulo="Datos personales">
        <Campo label="Nombre completo" value={nombre}
          editando={editNombre} onEdit={() => setEditNombre(true)}
          onChange={setNombre}
          onSave={() => guardarCampo('nombre', nombre)}
          onCancel={() => { setEditNombre(false); setNombre(user?.nombre || '') }} />
        <Campo label="Correo electrónico" value={user?.email} />
        <Campo label="Firma / Empresa" value={firma}
          editando={editFirma} onEdit={() => setEditFirma(true)}
          onChange={setFirma}
          onSave={() => guardarCampo('firma', firma)}
          onCancel={() => { setEditFirma(false); setFirma(user?.firma || '') }} />
        <div style={{ padding: '10px 0' }}>
          <div style={{ fontSize: '11px', color: GRAY[400], marginBottom: '6px' }}>Contraseña</div>
          {editPass ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '300px' }}>
              {[
                { label: 'Contraseña actual', val: passActual, set: setPassActual },
                { label: 'Nueva contraseña', val: passNueva, set: setPassNueva },
                { label: 'Confirmar nueva', val: passConfirm, set: setPassConfirm },
              ].map(({ label, val, set }) => (
                <input key={label} type="password" placeholder={label} value={val} onChange={e => set(e.target.value)}
                  style={{ fontSize: '13px', border: `1px solid ${PRIMARY[300]}`, borderRadius: '6px', padding: '7px 10px', outline: 'none' }} />
              ))}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button onClick={cambiarPassword} disabled={guardando}
                  style={{ fontSize: '12px', fontWeight: '600', background: PRIMARY[500], color: '#fff', border: 'none', borderRadius: '7px', padding: '7px 16px', cursor: 'pointer' }}>
                  Cambiar
                </button>
                <button onClick={() => setEditPass(false)}
                  style={{ fontSize: '12px', color: GRAY[500], background: 'none', border: 'none', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: GRAY[800] }}>••••••••</span>
              <button onClick={() => setEditPass(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: GRAY[400] }}>
                <Icon.Edit size={14} />
              </button>
            </div>
          )}
        </div>
      </SeccionCard>

      {/* Historial de pagos */}
      <SeccionCard titulo="Historial de pagos">
        {cargandoPagos ? (
          <p style={{ fontSize: '13px', color: GRAY[400] }}>Cargando...</p>
        ) : historialPagos.length === 0 ? (
          <p style={{ fontSize: '13px', color: GRAY[400] }}>No hay pagos registrados.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {historialPagos.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${GRAY[100]}`, fontSize: '12px' }}>
                <div>
                  <div style={{ fontWeight: '600', color: GRAY[800] }}>
                    {t.tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <div style={{ color: GRAY[400], marginTop: '1px' }}>
                    {new Date(t.creado_en).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '700', color: GRAY[800] }}>{fmt(t.monto_cop)}</div>
                  <span style={{
                    fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '12px',
                    background: t.estado === 'aprobado' ? SUCCESS.light : t.estado === 'pendiente' ? WARNING.light : DANGER.light,
                    color:      t.estado === 'aprobado' ? SUCCESS.dark  : t.estado === 'pendiente' ? WARNING.dark  : DANGER.dark,
                  }}>
                    {t.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SeccionCard>

      {/* Último acceso */}
      {user?.ultimo_login && (
        <div style={{ fontSize: '11px', color: GRAY[300], textAlign: 'center' }}>
          Último acceso: {new Date(user.ultimo_login).toLocaleString('es-CO')}
          {user.ultimo_ip && ` · IP: ${user.ultimo_ip}`}
        </div>
      )}
    </div>
  )
}