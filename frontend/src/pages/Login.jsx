import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authService } from '../services/api'
import { PRIMARY, GRAY } from '../theme'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const login    = useAuthStore(s => s.login)
  const [form, setForm]       = useState({ email: '', password: '' })
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch {
      toast.error('Email o contraseña incorrectos')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: GRAY[50], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 8px 40px rgba(0,0,0,0.10)', padding: '40px', width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: PRIMARY[500] }}>
              Fin<span style={{ color: PRIMARY[300] }}>Analytics</span>
            </div>
          </Link>
          <p style={{ fontSize: '13px', color: GRAY[400], marginTop: '6px' }}>Inicia sesión en tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { label: 'Email', key: 'email', tipo: 'email' },
            { label: 'Contraseña', key: 'password', tipo: 'password' },
          ].map(({ label, key, tipo }) => (
            <div key={key}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: GRAY[600], display: 'block', marginBottom: '5px' }}>{label}</label>
              <input type={tipo} required value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                style={{ width: '100%', border: `1px solid ${GRAY[200]}`, borderRadius: '8px', padding: '10px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s' }}
                onFocus={e => e.currentTarget.style.borderColor = PRIMARY[400]}
                onBlur={e => e.currentTarget.style.borderColor = GRAY[200]}
              />
            </div>
          ))}

          <button type="submit" disabled={cargando} style={{
            width: '100%', background: cargando ? GRAY[300] : PRIMARY[500],
            color: '#fff', fontWeight: '700', fontSize: '14px',
            padding: '12px', borderRadius: '10px', border: 'none',
            cursor: cargando ? 'not-allowed' : 'pointer', marginTop: '4px',
            transition: 'background 0.15s',
          }}>
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', color: GRAY[400], marginTop: '20px' }}>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" style={{ color: PRIMARY[500], fontWeight: '600', textDecoration: 'none' }}>
            Regístrate gratis
          </Link>
        </p>
        <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '8px' }}>
          <Link to="/" style={{ color: GRAY[400], textDecoration: 'none' }}>← Volver al inicio</Link>
        </p>
      </div>
    </div>
  )
}