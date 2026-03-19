import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { PRIMARY, GRAY, SIDEBAR } from '../../theme'
import { Icon } from './Icons'

const Icons = {
  dashboard: <Icon.Dashboard />,
  nuevo:     <Icon.Plus />,
  historial: <Icon.History />,
  perfil:    <Icon.User />,
  logout:    <Icon.Logout size={14} />,
  menu:      <Icon.Menu />,
}

const NAV = [
  { section: 'Análisis', items: [
    { to: '/dashboard',           label: 'Dashboard',      icon: Icons.dashboard },
    { to: '/dashboard/nuevo',     label: 'Nuevo análisis', icon: Icons.nuevo },
    { to: '/dashboard/historial', label: 'Historial',      icon: Icons.historial },
  ]},
  { section: 'Cuenta', items: [
    { to: '/dashboard/admin',  label: 'Administración',   icon: <Icon.Settings />, soloAdmin: true },
    { to: '/dashboard/planes', label: 'Planes y créditos', icon: <Icon.CreditCard /> },
    { to: '/dashboard/perfil', label: 'Mi perfil',         icon: <Icon.User /> },
  ]},
]

function NavItem({ to, label, icon, collapsed, soloAdmin }) {
  const { user } = useAuthStore()
  const { pathname } = useLocation()
  const active = pathname === to || (to !== '/dashboard' && pathname.startsWith(to))
  const [hover, setHover] = useState(false)

  // Return condicional DESPUÉS de todos los hooks
  if (soloAdmin && !user?.es_admin) return null

  return (
    <Link to={to} title={collapsed ? label : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center',
        gap: '10px',
        padding: collapsed ? '9px 0' : '9px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: active ? '600' : '400',
        color: active ? '#fff' : hover ? '#fff' : 'rgba(255,255,255,0.65)',
        background: active ? 'rgba(255,255,255,0.18)' : hover ? 'rgba(255,255,255,0.10)' : 'transparent',
        textDecoration: 'none',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        marginBottom: '2px',
      }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      {!collapsed && label}
    </Link>
  )
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  const creditosTexto = user?.plan === 'free'
    ? `${Math.max(0, 2 - (user?.creditos_free_usados_este_mes || 0))}/2`
    : user?.plan === 'pro' ? '∞' : `${user?.creditos || 0}`

  const planLabel = { free: 'Free', creditos: 'Créditos', pro: 'Pro' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: GRAY[50] }}>

      {/* Sidebar */}
      <aside style={{
        width: collapsed ? '56px' : '220px',
        minWidth: collapsed ? '56px' : '220px',
        background: PRIMARY[500],
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s, min-width 0.2s',
        overflow: 'hidden',
        position: 'sticky', top: 0, height: '100vh',
      }}>

        {/* Header */}
        <div style={{
          padding: collapsed ? '16px 0' : '16px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          {!collapsed && (
            <div>
              <div style={{ color: '#fff', fontWeight: '700', fontSize: '15px', letterSpacing: '-0.3px' }}>FinAnalytics</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', marginTop: '1px' }}>Indicadores financieros</div>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)} style={{
            background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: '6px',
            padding: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}>
            <Icon.Menu />
          </button>
        </div>

        {/* Plan badge */}
        {!collapsed && (
          <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontSize: '11px', fontWeight: '600', color: '#fff',
                background: 'rgba(255,255,255,0.12)', padding: '2px 8px', borderRadius: '20px',
              }}>Plan {planLabel[user?.plan] || 'Free'}</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                {creditosTexto} análisis
              </span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: collapsed ? '10px 6px' : '10px 8px', overflowY: 'auto' }}>
          {NAV.map(({ section, items }) => (
            <div key={section} style={{ marginBottom: '14px' }}>
              {!collapsed && (
                <div style={{
                  fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)',
                  padding: '0 12px 4px',
                }}>
                  {section}
                </div>
              )}
              {items.map(item => <NavItem key={item.to} {...item} collapsed={collapsed} />)}
            </div>
          ))}
        </nav>

        {/* Usuario */}
        <div style={{ padding: collapsed ? '10px 6px' : '10px 8px', borderTop: '1px solid rgba(255,255,255,0.10)' }}>
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0,
              }}>
                {user?.nombre?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.nombre}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
              </div>
              <button onClick={logout} title="Cerrar sesión"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px', borderRadius: '4px', display: 'flex' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
              >
                <Icon.Logout size={14} />
              </button>
            </div>
          ) : (
            <button onClick={logout} title="Cerrar sesión" style={{
              width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none',
              borderRadius: '6px', padding: '7px', cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'center',
            }}>
              <Icon.Logout size={14} />
            </button>
          )}
        </div>
      </aside>

      {/* Contenido */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  )
}