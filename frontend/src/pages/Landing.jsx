import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { PRIMARY, GRAY, SUCCESS, WARNING, SHADOW } from '../theme'

const fmt = (n) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(n)

// ── Datos de planes ────────────────────────────────────────────────
const CREDITOS = [
  { nombre: 'Pack 5',  precio: 120000, creditos: 5,  por: 24000 },
  { nombre: 'Pack 15', precio: 300000, creditos: 15, por: 20000, popular: true },
  { nombre: 'Pack 30', precio: 480000, creditos: 30, por: 16000 },
]
const SUSCRIPCIONES = [
  { nombre: 'Mensual',    precio: 180000, periodo: 'mes',       ahorro: null },
  { nombre: 'Trimestral', precio: 450000, periodo: 'trimestre', ahorro: '17%', popular: true },
  { nombre: 'Anual',      precio: 1560000, periodo: 'año',      ahorro: '28%' },
]

// ── Estilos base ───────────────────────────────────────────────────
const S = {
  hero: {
    background: `linear-gradient(135deg, ${PRIMARY[900]} 0%, ${PRIMARY[600]} 60%, ${PRIMARY[400]} 100%)`,
    minHeight: '100vh',
    display: 'flex', flexDirection: 'column',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    position: 'relative', overflow: 'hidden',
  },
  section: { padding: '80px 24px', maxWidth: '1100px', margin: '0 auto', width: '100%' },
}

function Navbar({ token }) {
  const navigate = useNavigate()
  const [scroll, setScroll] = useState(false)
  useEffect(() => {
    const h = () => setScroll(window.scrollY > 20)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 32px', height: '60px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: scroll ? 'rgba(15,45,92,0.95)' : 'transparent',
      backdropFilter: scroll ? 'blur(12px)' : 'none',
      borderBottom: scroll ? '1px solid rgba(255,255,255,0.08)' : 'none',
      transition: 'all 0.3s',
    }}>
      <div style={{ color: '#fff', fontWeight: '800', fontSize: '18px', letterSpacing: '-0.5px' }}>
        Fin<span style={{ color: '#7EC8E3' }}>Analytics</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {['Características', 'Precios'].map(label => (
          <a key={label} href={`#${label.toLowerCase()}`} style={{
            color: 'rgba(255,255,255,0.75)', fontSize: '13px', fontWeight: '500',
            textDecoration: 'none', padding: '6px 12px', borderRadius: '6px',
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
          >{label}</a>
        ))}
        {token ? (
          <Link to="/dashboard" style={{
            background: '#fff', color: PRIMARY[600], fontWeight: '700',
            fontSize: '13px', padding: '7px 18px', borderRadius: '8px', textDecoration: 'none',
          }}>
            Ir al dashboard
          </Link>
        ) : (
          <>
            <Link to="/login" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '500', textDecoration: 'none', padding: '7px 14px' }}>
              Iniciar sesión
            </Link>
            <Link to="/registro" style={{
              background: '#fff', color: PRIMARY[600], fontWeight: '700',
              fontSize: '13px', padding: '7px 18px', borderRadius: '8px', textDecoration: 'none',
            }}>
              Registrarse gratis
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

function Hero({ token }) {
  return (
    <section style={{ ...S.hero }}>
      {/* Decoración de fondo */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(126,200,227,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', left: '-5%',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 60px', textAlign: 'center' }}>
        <div style={{ maxWidth: '760px' }}>
          <div style={{
            display: 'inline-block', background: 'rgba(126,200,227,0.15)',
            border: '1px solid rgba(126,200,227,0.3)', borderRadius: '20px',
            padding: '5px 14px', marginBottom: '24px',
            fontSize: '12px', fontWeight: '600', color: '#7EC8E3', letterSpacing: '0.05em',
          }}>
            ANÁLISIS FINANCIERO SECTORIAL · COLOMBIA
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 58px)', fontWeight: '800',
            color: '#fff', margin: '0 0 20px', lineHeight: '1.1',
            letterSpacing: '-1px',
          }}>
            Requisitos habilitantes<br />
            <span style={{ color: '#7EC8E3' }}>en 2 minutos,</span> no en 4 horas
          </h1>

          <p style={{
            fontSize: '17px', color: 'rgba(255,255,255,0.70)',
            margin: '0 0 36px', lineHeight: '1.6', maxWidth: '580px', marginLeft: 'auto', marginRight: 'auto',
          }}>
            Calcula automáticamente los índices financieros sectoriales para estudios de mercado y pliegos de contratación pública en Colombia. Datos de Supersociedades, resultados listos para descargar.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={token ? "/dashboard" : "/registro"} style={{
              background: '#fff', color: PRIMARY[600],
              fontWeight: '800', fontSize: '15px', padding: '14px 32px',
              borderRadius: '12px', textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              transition: 'transform 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {token ? 'Ir al dashboard' : 'Empezar gratis'}
            </Link>
            <a href="#precios" style={{
              background: 'rgba(255,255,255,0.10)', color: '#fff',
              fontWeight: '600', fontSize: '15px', padding: '14px 32px',
              borderRadius: '12px', textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              Ver precios →
            </a>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', marginTop: '56px', flexWrap: 'wrap' }}>
            {[
              { n: '22.689', label: 'empresas en la base de datos' },
              { n: '2 min', label: 'tiempo promedio por análisis' },
              { n: '5', label: 'índices financieros calculados' },
            ].map(({ n, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#fff' }}>{n}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Caracteristicas() {
  const items = [
    { icon: '⚡', titulo: 'Modo A — Objetivo del sector', desc: 'Determina automáticamente el valor recomendado para cada índice basado en la distribución real del sector. Incluye tablas Hi, rango concentrado y narrativa lista para el pliego.' },
    { icon: '🎯', titulo: 'Modo B — Por objetivo de empresa', desc: 'Ingresa los índices de tu empresa y el sistema selecciona las empresas del sector con perfil más similar, demostrando que los requisitos son inclusivos.' },
    { icon: '📊', titulo: 'Gráficas personalizables', desc: 'Descarga las gráficas en PNG con tu paleta de colores, logo de la entidad como marca de agua, con o sin panel de conclusión. Listas para incluir en el documento.' },
    { icon: '📥', titulo: 'Excel completo descargable', desc: 'Archivo Excel con tablas de frecuencia, distribución geográfica, resumen de índices recomendados y muestra de empresas con NIT y razón social.' },
    { icon: '🔒', titulo: 'Datos de Supersociedades', desc: 'Base de datos actualizada directamente desde el reporte oficial de Supersociedades. Filtro por código CIIU, deduplicación por NIT y filtro de período actual.' },
    { icon: '📋', titulo: 'Historial de análisis', desc: 'Todos tus análisis guardados con nombre personalizable. Búsqueda por nombre o CIIU, filtro por modo, acceso instantáneo a resultados anteriores.' },
  ]

  return (
    <section id="características" style={{ background: GRAY[50], padding: '80px 24px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', color: GRAY[800], margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            Todo lo que necesitas para el estudio de mercado
          </h2>
          <p style={{ fontSize: '16px', color: GRAY[400], maxWidth: '520px', margin: '0 auto' }}>
            Diseñado específicamente para contratación pública en Colombia
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {items.map(({ icon, titulo, desc }) => (
            <div key={titulo} style={{
              background: '#fff', borderRadius: '14px', padding: '24px',
              border: `1px solid ${GRAY[200]}`, boxShadow: SHADOW.sm,
              transition: 'box-shadow 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = SHADOW.lg; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = SHADOW.sm; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{icon}</div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: GRAY[800], margin: '0 0 8px' }}>{titulo}</h3>
              <p style={{ fontSize: '13px', color: GRAY[500], lineHeight: '1.6', margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Precios() {
  const [tab, setTab] = useState('creditos')

  return (
    <section id="precios" style={{ background: '#fff', padding: '80px 24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', color: GRAY[800], margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            Precios simples y transparentes
          </h2>
          <p style={{ fontSize: '15px', color: GRAY[400] }}>
            Empieza gratis. Paga solo lo que usas.
          </p>
        </div>

        {/* Plan Free */}
        <div style={{
          background: GRAY[50], borderRadius: '14px', padding: '20px 24px',
          border: `1px solid ${GRAY[200]}`, marginBottom: '32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: GRAY[800] }}>Plan Free — siempre gratis</div>
            <div style={{ fontSize: '13px', color: GRAY[500], marginTop: '3px' }}>
              1 análisis por mes · Ver resultados sin descarga · Sin tarjeta de crédito
            </div>
          </div>
          <Link to="/registro" style={{
            background: GRAY[800], color: '#fff', fontWeight: '700', fontSize: '13px',
            padding: '9px 20px', borderRadius: '9px', textDecoration: 'none',
          }}>
            Crear cuenta gratis
          </Link>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: GRAY[100], borderRadius: '10px', padding: '4px', marginBottom: '24px', width: 'fit-content' }}>
          {[{ id: 'creditos', label: 'Créditos sueltos' }, { id: 'suscripcion', label: 'Suscripción Pro' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontWeight: '600', fontSize: '13px',
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? PRIMARY[600] : GRAY[500],
              boxShadow: tab === t.id ? SHADOW.sm : 'none', transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Planes créditos */}
        {tab === 'creditos' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {CREDITOS.map(p => (
              <div key={p.nombre} style={{
                background: p.popular ? PRIMARY[500] : '#fff',
                border: `2px solid ${p.popular ? PRIMARY[500] : GRAY[200]}`,
                borderRadius: '16px', padding: '24px 20px',
                position: 'relative', boxShadow: p.popular ? SHADOW.lg : SHADOW.sm,
              }}>
                {p.popular && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: WARNING.base, color: '#fff', fontSize: '10px', fontWeight: '700', padding: '3px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                    MÁS POPULAR
                  </div>
                )}
                <div style={{ fontSize: '15px', fontWeight: '700', color: p.popular ? '#fff' : GRAY[800], marginBottom: '8px' }}>{p.nombre}</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: p.popular ? '#fff' : PRIMARY[600], marginBottom: '4px' }}>{fmt(p.precio)}</div>
                <div style={{ fontSize: '12px', color: p.popular ? 'rgba(255,255,255,0.65)' : GRAY[400], marginBottom: '16px' }}>{fmt(p.por)} por análisis</div>
                <div style={{ fontSize: '13px', color: p.popular ? 'rgba(255,255,255,0.85)' : GRAY[600], marginBottom: '20px' }}>{p.creditos} análisis financieros · Sin vencimiento</div>
                <Link to="/registro" style={{
                  display: 'block', textAlign: 'center', padding: '10px',
                  borderRadius: '9px', fontWeight: '700', fontSize: '13px', textDecoration: 'none',
                  background: p.popular ? '#fff' : PRIMARY[500],
                  color: p.popular ? PRIMARY[600] : '#fff',
                }}>
                  Comprar créditos
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Planes suscripción */}
        {tab === 'suscripcion' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {SUSCRIPCIONES.map(p => (
              <div key={p.nombre} style={{
                background: p.popular ? PRIMARY[500] : '#fff',
                border: `2px solid ${p.popular ? PRIMARY[500] : GRAY[200]}`,
                borderRadius: '16px', padding: '24px 20px',
                position: 'relative', boxShadow: p.popular ? SHADOW.lg : SHADOW.sm,
              }}>
                {p.popular && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: WARNING.base, color: '#fff', fontSize: '10px', fontWeight: '700', padding: '3px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                    MÁS POPULAR
                  </div>
                )}
                <div style={{ fontSize: '15px', fontWeight: '700', color: p.popular ? '#fff' : GRAY[800], marginBottom: '8px' }}>{p.nombre}</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: p.popular ? '#fff' : PRIMARY[600], marginBottom: '4px' }}>{fmt(p.precio)}</div>
                <div style={{ fontSize: '12px', color: p.popular ? 'rgba(255,255,255,0.65)' : GRAY[400], marginBottom: '4px' }}>/{p.periodo}</div>
                {p.ahorro && <div style={{ fontSize: '11px', fontWeight: '700', color: p.popular ? '#7EC8E3' : SUCCESS.base, marginBottom: '12px' }}>Ahorro del {p.ahorro}</div>}
                <div style={{ fontSize: '13px', color: p.popular ? 'rgba(255,255,255,0.85)' : GRAY[600], marginBottom: '20px' }}>Análisis ilimitados · Descarga Excel y gráficas</div>
                <Link to="/registro" style={{
                  display: 'block', textAlign: 'center', padding: '10px',
                  borderRadius: '9px', fontWeight: '700', fontSize: '13px', textDecoration: 'none',
                  background: p.popular ? '#fff' : PRIMARY[500],
                  color: p.popular ? PRIMARY[600] : '#fff',
                }}>
                  Suscribirse
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer style={{ background: PRIMARY[900], padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
        Fin<span style={{ color: '#7EC8E3' }}>Analytics</span>
      </div>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
        Plataforma de análisis de indicadores financieros sectoriales · Colombia
      </p>
    </footer>
  )
}

export default function Landing() {
  const token = useAuthStore(s => s.token)

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Navbar token={token} />
      <Hero token={token} />
      <Caracteristicas />
      <Precios />
      <Footer />
    </div>
  )
}