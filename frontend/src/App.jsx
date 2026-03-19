import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { useAuthStore } from './store/authStore'
import { analisisService } from './services/api'

// Páginas públicas
import Landing  from './pages/Landing'
import Login    from './pages/Login'
import Registro from './pages/Registro'
import ResultadoPago from './pages/ResultadoPago'

// Páginas del dashboard (requieren auth)
import Layout          from './components/ui/Layout'
import Dashboard       from './pages/Dashboard'
import NuevoAnalisis   from './pages/NuevoAnalisis'
import ResultadoAnalisis from './pages/ResultadoAnalisis'
import Historial       from './pages/Historial'
import Planes          from './pages/Planes'
import Perfil          from './pages/Perfil'
import Admin           from './pages/Admin'

function RequireAuth({ children }) {
  const token = useAuthStore(s => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

function RedirectIfAuth({ children }) {
  const token = useAuthStore(s => s.token)
  if (token) return <Navigate to="/dashboard" replace />
  return children
}

function AnalisisPage() {
  const { id } = useParams()
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    analisisService.obtener(id)
      .then(setResultado)
      .catch(() => setError('No se pudo cargar el análisis'))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ color: '#888', fontSize: '14px' }}>Cargando análisis...</p>
    </div>
  )
  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ color: '#e74c3c', fontSize: '14px' }}>{error}</p>
    </div>
  )
  return <ResultadoAnalisis resultado={resultado} />
}

export default function App() {
  const loadUser = useAuthStore(s => s.loadUser)
  useEffect(() => { loadUser() }, [])

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { fontSize: '13px' } }} />
      <Routes>
        {/* Páginas públicas */}
        <Route path="/" element={<Landing />} />
        <Route path="/login"    element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
        <Route path="/registro" element={<RedirectIfAuth><Registro /></RedirectIfAuth>} />
        <Route path="/pago/resultado" element={<ResultadoPago />} />

        {/* Dashboard — requiere autenticación */}
        <Route path="/dashboard" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="nuevo"          element={<NuevoAnalisis />} />
          <Route path="historial"      element={<Historial />} />
          <Route path="planes"         element={<Planes />} />
          <Route path="perfil"         element={<Perfil />} />
          <Route path="admin"          element={<Admin />} />
          <Route path="analisis/:id"   element={<AnalisisPage />} />
        </Route>

        {/* Redirecciones de compatibilidad */}
        <Route path="/nuevo"          element={<Navigate to="/dashboard/nuevo" replace />} />
        <Route path="/historial"      element={<Navigate to="/dashboard/historial" replace />} />
        <Route path="/planes"         element={<Navigate to="/dashboard/planes" replace />} />
        <Route path="/perfil"         element={<Navigate to="/dashboard/perfil" replace />} />
        <Route path="/admin"          element={<Navigate to="/dashboard/admin" replace />} />
        <Route path="/analisis/:id"   element={<Navigate to="/dashboard/analisis/:id" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}