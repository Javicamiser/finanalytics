import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
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
          <Route path="analisis/:id" element={<AnalisisWrapper />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function AnalisisWrapper() {
  const { id } = require('react-router-dom').useParams()
  const [resultado, setResultado] = require('react').useState(null)
  const [cargando, setCargando] = require('react').useState(true)

  require('react').useEffect(() => {
    require('./services/api').analisisService.obtener(id)
      .then(setResultado).finally(() => setCargando(false))
  }, [id])

  if (cargando) return <div className="p-8 text-center text-gray-500">Cargando análisis...</div>
  if (!resultado) return <div className="p-8 text-center text-red-500">Análisis no encontrado</div>
  return <ResultadoAnalisis resultado={resultado} />
}
