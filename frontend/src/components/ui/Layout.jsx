import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const nav = [
  { to: '/',      label: 'Dashboard',      icon: '⊞' },
  { to: '/nuevo', label: 'Nuevo análisis', icon: '+' },
]

export default function Layout() {
  const { pathname } = useLocation()
  const { user, logout } = useAuthStore()

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-[#1F4E8C] text-white flex flex-col">
        <div className="px-5 py-6 border-b border-white/10">
          <h1 className="text-lg font-bold">FinAnalytics</h1>
          <p className="text-blue-300 text-xs mt-0.5">Indicadores financieros</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, label, icon }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
                ${pathname === to ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}>
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-xs text-blue-300 truncate">{user?.email}</p>
          <button onClick={logout}
            className="text-xs text-blue-300 hover:text-white mt-2 transition">
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
