import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authService } from '../services/api'
import { PRIMARY, GRAY } from '../theme'
import toast from 'react-hot-toast'

export default function Registro() {
  const navigate = useNavigate()
  const login    = useAuthStore(s => s.login)
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmar: '', firma: '' })
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmar) { toast.error('Las contraseñas no coinciden'); return }
    if (form.password.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return }
    setCargando(true)
    try {
      await authService.register({
        nombre: form.nombre,
        email:  form.email,
        password: form.password,
        firma: form.firma || null,
      })
      // Auto-login después del registro
      await login(form.email, form.password)
      toast.success('¡Bienvenido a FinAnalytics!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear la cuenta')
    } finally {
      setCargando(false)
    }
  }

  const campos = [
    { label: 'Nombre completo',        key: 'nombre',    tipo: 'text',     required: true,  placeholder: 'Juan Pérez' },
    { label: 'Email',                  key: 'email',     tipo: 'email',    required: true,  placeholder: 'juan@empresa.com' },
    { label: 'Empresa / Firma',        key: 'firma',     tipo: 'text',     required: false, placeholder: 'Opcional — aparece en el perfil' },
    { label: 'Contraseña',             key: 'password',  tipo: 'password', required: true,  placeholder: 'Mínimo 8 caracteres' },
    { label: 'Confirmar contraseña',   key: 'confirmar', tipo: 'password', required: true,  placeholder: '' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: GRAY[50], display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 8px 40px rgba(0,0,0,0.10)', padding: '40px', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: PRIMARY[500] }}>
              Fin<span style={{ color: PRIMARY[300] }}>Analytics</span>
            </div>
          </Link>
          <p style={{ fontSize: '13px', color: GRAY[400], marginTop: '6px' }}>Crea tu cuenta gratis</p>
          <div style={{ marginTop: '10px', background: PRIMARY[50], borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: PRIMARY[600], fontWeight: '500' }}>
            Plan Free: 1 análisis/mes sin costo · Sin tarjeta de crédito
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {campos.map(({ label, key, tipo, required, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: GRAY[600], display: 'block', marginBottom: '4px' }}>
                {label} {!required && <span style={{ fontWeight: '400', color: GRAY[400] }}>(opcional)</span>}
              </label>
              <input type={tipo} required={required} value={form[key]} placeholder={placeholder}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                style={{ width: '100%', border: `1px solid ${GRAY[200]}`, borderRadius: '8px', padding: '9px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.currentTarget.style.borderColor = PRIMARY[400]}
                onBlur={e => e.currentTarget.style.borderColor = GRAY[200]}
              />
            </div>
          ))}

          <button type="submit" disabled={cargando} style={{
            width: '100%', background: cargando ? GRAY[300] : PRIMARY[500],
            color: '#fff', fontWeight: '700', fontSize: '14px',
            padding: '12px', borderRadius: '10px', border: 'none',
            cursor: cargando ? 'not-allowed' : 'pointer', marginTop: '6px',
          }}>
            {cargando ? 'Creando cuenta...' : 'Crear cuenta gratis'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', color: GRAY[400], marginTop: '20px' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: PRIMARY[500], fontWeight: '600', textDecoration: 'none' }}>
            Iniciar sesión
          </Link>
        </p>
        <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '8px' }}>
          <Link to="/" style={{ color: GRAY[400], textDecoration: 'none' }}>← Volver al inicio</Link>
        </p>
      </div>
    </div>
  )
}