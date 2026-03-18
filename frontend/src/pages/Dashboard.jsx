import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { analisisService, datosService } from '../services/api'
import { PRIMARY, GRAY, SUCCESS, WARNING, DANGER, SHADOW } from '../theme'
import { Icon } from '../components/ui/Icons'

function StatCard({ label, value, sub, color, children }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '12px', padding: '18px 20px',
      border: `1px solid ${GRAY[200]}`, boxShadow: SHADOW.sm,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: GRAY[400] }}>
          {label}
        </span>
        <span style={{ color: color || PRIMARY[500], opacity: 0.7 }}>{children}</span>
      </div>
      <div style={{ fontSize: '22px', fontWeight: '700', color: color || PRIMARY[500] }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: GRAY[400], marginTop: '3px' }}>{sub}</div>}
    </div>
  )
}

function AccionRapida({ to, titulo, desc, color, children }) {
  const [hover, setHover] = useState(false)
  return (
    <Link to={to} style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{
        background: hover ? PRIMARY[50] : '#fff',
        border: `1px solid ${hover ? PRIMARY[300] : GRAY[200]}`,
        borderRadius: '12px', padding: '16px',
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        transition: 'all 0.15s', cursor: 'pointer',
        boxShadow: hover ? SHADOW.md : SHADOW.sm,
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '8px',
          background: color || PRIMARY[50],
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {children}
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: GRAY[800] }}>{titulo}</div>
          <div style={{ fontSize: '11px', color: GRAY[400], marginTop: '2px' }}>{desc}</div>
        </div>
      </div>
    </Link>
  )
}

function AnalisisCard({ analisis }) {
  const [hover, setHover] = useState(false)
  const modoColor = analisis.modo === 'A' ? PRIMARY[500] : '#8E44AD'
  const modoLabel = analisis.modo === 'A' ? 'Objetivo del sector' : 'Por objetivo empresa'
  return (
    <Link to={`/analisis/${analisis.id}`} style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{
        background: '#fff',
        border: `1px solid ${hover ? PRIMARY[300] : GRAY[200]}`,
        borderRadius: '12px', padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
        transition: 'all 0.15s', boxShadow: hover ? SHADOW.md : SHADOW.sm,
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: analisis.modo === 'A' ? PRIMARY[50] : '#F5EEF8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: '800', color: modoColor, flexShrink: 0,
        }}>
          {analisis.modo}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: GRAY[800], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {analisis.nombre || modoLabel}
          </div>
          <div style={{ fontSize: '11px', color: GRAY[400], marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {analisis.ciius?.join(', ')} · {analisis.n_muestra} empresas
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', color: GRAY[400] }}>
            {new Date(analisis.creado_en).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
          </div>
          <div style={{ fontSize: '11px', color: PRIMARY[500], fontWeight: '600', marginTop: '2px' }}>Ver →</div>
        </div>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const user = useAuthStore(s => s.user)
  const [historial, setHistorial]     = useState([])
  const [estadoDatos, setEstadoDatos] = useState(null)
  const [cargando, setCargando]       = useState(true)

  useEffect(() => {
    Promise.all([
      analisisService.listar(0, 5).catch(() => []),
      datosService.estado().catch(() => null),
    ]).then(([h, e]) => { setHistorial(h); setEstadoDatos(e) })
      .finally(() => setCargando(false))
  }, [])

  const creditos = user?.plan === 'free'
    ? Math.max(0, 2 - (user?.creditos_free_usados_este_mes || 0))
    : user?.plan === 'pro' ? '∞' : (user?.creditos || 0)

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  const planColor = user?.plan === 'pro' ? SUCCESS.base : user?.plan === 'creditos' ? WARNING.base : GRAY[500]
  const creditoColor = typeof creditos === 'number' && creditos === 0 ? DANGER.base : SUCCESS.dark

  return (
    <div style={{ padding: '28px 32px', maxWidth: '960px', margin: '0 auto' }}>

      {/* Encabezado */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: GRAY[800], margin: 0 }}>
          {saludo}, {user?.nombre?.split(' ')[0]}
        </h1>
        <p style={{ fontSize: '13px', color: GRAY[400], marginTop: '4px' }}>
          {user?.firma || 'Panel de análisis financiero sectorial'}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
        <StatCard label="Plan actual" color={planColor}
          value={{ free: 'Free', creditos: 'Créditos', pro: 'Pro' }[user?.plan] || 'Free'}
          sub="Ver opciones de actualización">
          <Icon.CreditCard size={16} color={planColor} />
        </StatCard>
        <StatCard label="Análisis disponibles" color={creditoColor}
          value={creditos}
          sub={user?.plan === 'free' ? 'Este mes' : user?.plan === 'pro' ? 'Sin límite' : 'Créditos restantes'}>
          <Icon.BarChart size={16} color={creditoColor} />
        </StatCard>
        <StatCard label="Empresas en BD" color={estadoDatos ? PRIMARY[500] : DANGER.base}
          value={estadoDatos ? estadoDatos.n_empresas?.toLocaleString('es-CO') : '—'}
          sub={estadoDatos ? `Actualizado ${new Date(estadoDatos.fecha_carga).toLocaleDateString('es-CO')}` : 'Sin datos cargados'}>
          <Icon.Database size={16} color={estadoDatos ? PRIMARY[500] : DANGER.base} />
        </StatCard>
      </div>

      {/* Acciones rápidas */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: '600', color: GRAY[500], marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Acciones rápidas
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <AccionRapida to="/nuevo" titulo="Nuevo análisis" desc="Modo A u objetivo de empresa" color={PRIMARY[50]}>
            <Icon.Plus size={17} color={PRIMARY[500]} />
          </AccionRapida>
          <AccionRapida to="/historial" titulo="Ver historial" desc="Todos tus análisis anteriores" color="#EBF5FB">
            <Icon.History size={17} color={PRIMARY[500]} />
          </AccionRapida>
          <AccionRapida to="/perfil" titulo="Configuración" desc="Perfil, plan y preferencias" color={GRAY[100]}>
            <Icon.Settings size={17} color={GRAY[500]} />
          </AccionRapida>
        </div>
      </div>

      {/* Análisis recientes */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: '600', color: GRAY[500], margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Análisis recientes
          </h2>
          <Link to="/historial" style={{ fontSize: '12px', color: PRIMARY[500], fontWeight: '600', textDecoration: 'none' }}>
            Ver todos →
          </Link>
        </div>

        {cargando ? (
          <div style={{ padding: '32px', textAlign: 'center', color: GRAY[400], fontSize: '13px' }}>Cargando...</div>
        ) : historial.length === 0 ? (
          <div style={{ background: '#fff', border: `2px dashed ${GRAY[200]}`, borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <Icon.FileText size={32} color={GRAY[300]} />
            </div>
            <p style={{ color: GRAY[400], fontSize: '13px', margin: '0 0 14px' }}>Aún no tienes análisis.</p>
            <Link to="/nuevo" style={{ display: 'inline-block', background: PRIMARY[500], color: '#fff', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
              Crear análisis
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {historial.map(a => <AnalisisCard key={a.id} analisis={a} />)}
          </div>
        )}
      </div>
    </div>
  )
}