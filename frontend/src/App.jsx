import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { useAuthStore } from './store/authStore'
import { analisisService } from './services/api'
import Login from './pages/Login'
import NuevoAnalisis from './pages/NuevoAnalisis'
import ResultadoAnalisis from './pages/ResultadoAnalisis'
import Dashboard from './pages/Dashboard'
import Layout from './components/ui/Layout'

function RequireAuth({ children }) {
  const token = useAuthStore(s => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

function AnalisisPage() {
  const { id } = useParams()
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    analisisService.obtener(id)
      .then(setResultado)
      .catch(() => setError('No se pudo cargar el análisis'))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">Cargando análisis...</p>
    </div>
  )
  if (error) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-red-500">{error}</p>
    </div>
  )
  return <ResultadoAnalisis resultado={resultado} />
}

export default function App() {
  const loadUser = useAuthStore(s => s.loadUser)
  useEffect(() => { loadUser() }, [])

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="nuevo" element={<NuevoAnalisis />} />
          <Route path="analisis/:id" element={<AnalisisPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}