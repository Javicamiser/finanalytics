import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { analisisService } from '../services/api'
import { PRIMARY, GRAY, SUCCESS, WARNING, SHADOW } from '../theme'
import { Icon } from '../components/ui/Icons'
import toast from 'react-hot-toast'

const fmt = (n) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(n)

function Beneficio({ texto, inverso }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: inverso ? 'rgba(255,255,255,0.85)' : GRAY[600] }}>
      <Icon.CheckCircle size={13} color={inverso ? 'rgba(255,255,255,0.7)' : SUCCESS.base} />
      {texto}
    </div>
  )
}

function TarjetaPlan({ plan, onComprar, comprando, recomendado }) {
  const [hover, setHover] = useState(false)
  const inv = recomendado

  const beneficios = plan.es_sub
    ? ['Análisis ilimitados', 'Descarga Excel y gráficas', 'Historial completo', 'Soporte prioritario',
       ...(plan.dias >= 90 ? [`Ahorro: ${fmt(Math.round(plan.dias / 30) * 220000 - plan.monto_cop)}`] : [])]
    : [`${plan.creditos} análisis financieros`, 'Descarga Excel y gráficas', 'Sin vencimiento', 'Se acumulan con tus créditos']

  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: inv ? PRIMARY[500] : '#fff',
        border: `2px solid ${inv ? PRIMARY[500] : hover ? PRIMARY[300] : GRAY[200]}`,
        borderRadius: '16px', padding: '24px 20px',
        display: 'flex', flexDirection: 'column', gap: '14px',
        boxShadow: hover || inv ? SHADOW.lg : SHADOW.sm,
        transition: 'all 0.2s', position: 'relative',
      }}
    >
      {recomendado && (
        <div style={{
          position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
          background: WARNING.base, color: '#fff', fontSize: '10px', fontWeight: '700',
          padding: '3px 12px', borderRadius: '20px', whiteSpace: 'nowrap', letterSpacing: '0.05em',
        }}>
          MÁS POPULAR
        </div>
      )}

      <div>
        <div style={{ fontSize: '14px', fontWeight: '700', color: inv ? '#fff' : GRAY[800] }}>{plan.nombre}</div>
        <div style={{ fontSize: '11px', color: inv ? 'rgba(255,255,255,0.65)' : GRAY[400], marginTop: '2px' }}>{plan.descripcion}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ fontSize: '26px', fontWeight: '800', color: inv ? '#fff' : PRIMARY[600] }}>
          {fmt(plan.monto_cop)}
        </span>
        {plan.es_sub && (
          <span style={{ fontSize: '11px', color: inv ? 'rgba(255,255,255,0.55)' : GRAY[400] }}>
            /{plan.dias === 30 ? 'mes' : plan.dias === 90 ? 'trimestre' : 'año'}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        {beneficios.map((b, i) => <Beneficio key={i} texto={b} inverso={inv} />)}
      </div>

      <button
        onClick={() => onComprar(plan.id)} disabled={comprando}
        style={{
          width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
          background: inv ? '#fff' : PRIMARY[500],
          color: inv ? PRIMARY[600] : '#fff',
          fontWeight: '700', fontSize: '13px',
          cursor: comprando ? 'not-allowed' : 'pointer',
          opacity: comprando ? 0.6 : 1, transition: 'opacity 0.15s',
        }}
      >
        {comprando ? 'Procesando...' : plan.es_sub ? 'Suscribirse' : 'Comprar créditos'}
      </button>
    </div>
  )
}

export default function Planes() {
  const user  = useAuthStore(s => s.user)
  const [tab, setTab] = useState('creditos')
  const [planes, setPlanes] = useState({})
  const [comprando, setComprando] = useState(null)

  useEffect(() => {
    analisisService.planes()
      .then(setPlanes)
      .catch(() => toast.error('No se pudieron cargar los planes'))
  }, [])

  const comprar = async (plan_id) => {
    setComprando(plan_id)
    try {
      const data = await analisisService.iniciarPago(plan_id)
      // Redirigir directamente al checkout de Wompi
      const params = new URLSearchParams({
        'public-key':       data.public_key,
        currency:           'COP',
        'amount-in-cents':  data.monto_centavos,
        reference:          data.referencia,
        'signature:integrity': data.firma,
        'redirect-url':     data.redirect_url,
        'customer-data:email':     user?.email || '',
        'customer-data:full-name': user?.nombre || '',
      })
      window.location.href = `https://checkout.wompi.co/p/?${params.toString()}`
    } catch {
      toast.error('Error al iniciar el pago.')
      setComprando(null)
    }
  }

  const creditos = Object.values(planes).filter(p => !p.es_sub)
  const suscrip  = Object.values(planes).filter(p => p.es_sub)

  const planLabel = { free: 'Free', creditos: 'Créditos', pro: 'Pro' }
  const creditosDisp = user?.plan === 'free'
    ? Math.max(0, 2 - (user?.creditos_free_usados_este_mes || 0))
    : user?.plan === 'pro' ? '∞' : (user?.creditos || 0)

  return (
    <div style={{ padding: '28px 32px', maxWidth: '960px', margin: '0 auto' }}>

      {/* Encabezado */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: GRAY[800], margin: 0 }}>Planes y créditos</h1>
        <p style={{ fontSize: '13px', color: GRAY[400], marginTop: '4px' }}>Elige el plan que mejor se adapta a tu uso</p>
      </div>

      {/* Estado actual */}
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '14px 18px',
        border: `1px solid ${GRAY[200]}`, boxShadow: SHADOW.sm,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: PRIMARY[50], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.CreditCard size={16} color={PRIMARY[500]} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: GRAY[800] }}>
              Plan actual: <span style={{ color: PRIMARY[500] }}>{planLabel[user?.plan] || 'Free'}</span>
            </div>
            <div style={{ fontSize: '11px', color: GRAY[400], marginTop: '1px' }}>
              {user?.plan === 'pro'
                ? `Activo hasta ${new Date(user.suscripcion_hasta).toLocaleDateString('es-CO')}`
                : user?.plan === 'free'
                ? `${creditosDisp} análisis restantes este mes`
                : `${creditosDisp} créditos disponibles`}
            </div>
          </div>
        </div>
        {user?.plan === 'pro' && (
          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: SUCCESS.light, color: SUCCESS.dark, fontWeight: '600' }}>
            Activo
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: GRAY[100], borderRadius: '10px', padding: '4px', marginBottom: '22px', width: 'fit-content' }}>
        {[
          { id: 'creditos',    label: 'Créditos sueltos',  icon: <Icon.BarChart size={13} /> },
          { id: 'suscripcion', label: 'Suscripción Pro',   icon: <Icon.TrendingUp size={13} /> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
            background: tab === t.id ? '#fff' : 'transparent',
            color: tab === t.id ? PRIMARY[600] : GRAY[500],
            boxShadow: tab === t.id ? SHADOW.sm : 'none',
            transition: 'all 0.15s',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Planes créditos */}
      {tab === 'creditos' && (
        <>
          <p style={{ fontSize: '13px', color: GRAY[500], marginBottom: '16px' }}>
            Sin vencimiento. Cada crédito equivale a 1 análisis completo con descarga de Excel y gráficas.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {creditos.map((p, i) => (
              <TarjetaPlan key={p.id} plan={p} recomendado={i === 1}
                onComprar={comprar} comprando={comprando === p.id} />
            ))}
          </div>
          <div style={{ marginTop: '14px', padding: '12px 16px', background: GRAY[50], borderRadius: '10px', border: `1px solid ${GRAY[200]}` }}>
            <p style={{ fontSize: '12px', color: GRAY[400], margin: 0 }}>
              Los créditos se acumulan — puedes comprar más packs y se suman a los que ya tienes.
            </p>
          </div>
        </>
      )}

      {/* Planes suscripción */}
      {tab === 'suscripcion' && (
        <>
          <p style={{ fontSize: '13px', color: GRAY[500], marginBottom: '16px' }}>
            Análisis ilimitados durante el período. Ideal si usas la plataforma frecuentemente.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {suscrip.map((p, i) => (
              <TarjetaPlan key={p.id} plan={p} recomendado={i === 1}
                onComprar={comprar} comprando={comprando === p.id} />
            ))}
          </div>
          <div style={{ marginTop: '14px', padding: '12px 16px', background: GRAY[50], borderRadius: '10px', border: `1px solid ${GRAY[200]}` }}>
            <p style={{ fontSize: '12px', color: GRAY[400], margin: 0 }}>
              Las suscripciones se acumulan — si ya tienes días activos y compras más, se suman al período vigente.
            </p>
          </div>
        </>
      )}
    </div>
  )
}