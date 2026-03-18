import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { useAuthStore } from './store/authStore'
import { analisisService } from './services/api'
import Login from './pages/Login'
import NuevoAnalisis from './pages/NuevoAnalisis'
import ResultadoAnalisis from './pages/ResultadoAnalisis'
import Dashboard from './pages/Dashboard'
import Historial from './pages/Historial'
import Layout from './components/ui/Layout'

function RequireAuth({ children }) {
  const token = useAuthStore(s => s.token)
  if (!token) return <Navigate to="/login" replace />
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
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="nuevo" element={<NuevoAnalisis />} />
          <Route path="historial" element={<Historial />} />
          <Route path="analisis/:id" element={<AnalisisPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}