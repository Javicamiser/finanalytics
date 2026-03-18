import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

// Inyectar token JWT en cada request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirigir a login si 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ───────────────────────────────────────────────────
export const authService = {
  login: (email, password) =>
    api.post('/api/auth/login', { email, password }).then(r => r.data),
  register: (data) =>
    api.post('/api/auth/register', data).then(r => r.data),
  me: () =>
    api.get('/api/auth/me').then(r => r.data),
}

// ── Análisis ───────────────────────────────────────────────
export const analisisService = {
  ejecutar: (config) =>
    api.post('/api/analisis/ejecutar', config).then(r => r.data),
  calcularHi: (ciius, porcentaje_muestra) =>
    api.post('/api/analisis/calcular-hi', { ciius, porcentaje_muestra }).then(r => r.data),
  listar: (skip = 0, limit = 20) =>
    api.get(`/api/analisis/?skip=${skip}&limit=${limit}`).then(r => r.data),
  obtener: (id) =>
    api.get(`/api/analisis/${id}`).then(r => r.data),
  descargarExcel: (id) =>
    api.get(`/api/analisis/${id}/excel`, { responseType: 'blob' }).then(r => r.data),
  descargarGraficas: (id) =>
    api.get(`/api/analisis/${id}/graficas`, { responseType: 'blob' }).then(r => r.data),
}

// ── Datos SIIS ─────────────────────────────────────────────
export const datosService = {
  estado: () =>
    api.get('/api/datos/estado').then(r => r.data),
  listarCIIU: (buscar = '') =>
    api.get(`/api/datos/ciiu?buscar=${buscar}`).then(r => r.data),
  cargarExcel: (año, archivo, notas = '') => {
    const fd = new FormData()
    fd.append('archivo', archivo)
    return api.post(`/api/datos/cargar?año=${año}&notas=${encodeURIComponent(notas)}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },
}

export default api