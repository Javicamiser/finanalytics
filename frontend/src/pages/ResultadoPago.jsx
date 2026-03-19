/**
 * ResultadoPago — página a la que redirige Wompi después del checkout
 * Consulta el estado de la transacción y muestra el resultado
 */
import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { analisisService } from '../services/api'
import { PRIMARY, GRAY, SUCCESS, DANGER, SHADOW } from '../theme'
import { Icon } from '../components/ui/Icons'

const fmt = (n) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(n)

export default function ResultadoPago() {
  const [params]   = useSearchParams()
  const ref        = params.get('ref')
  const [txn, setTxn]       = useState(null)
  const [error, setError]   = useState(null)
  const [intentos, setIntentos] = useState(0)

  useEffect(() => {
    if (!ref) return
    // Polling — Wompi puede demorar unos segundos en enviar el webhook
    const consultar = async () => {
      try {
        const data = await analisisService.estadoPago(ref)
        setTxn(data)
        if (data.estado === 'pendiente' && intentos < 8) {
          setTimeout(() => setIntentos(i => i + 1), 2000)
        }
      } catch {
        setError('No se pudo consultar el estado del pago.')
      }
    }
    consultar()
  }, [ref, intentos])

  const aprobado = txn?.estado === 'aprobado'
  const rechazado = txn?.estado === 'rechazado'
  const pendiente = !txn || txn?.estado === 'pendiente'

  return (
    <div style={{ minHeight: '100vh', background: GRAY[50], display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '40px', maxWidth: '440px', width: '100%', boxShadow: SHADOW.lg, textAlign: 'center' }}>

        {/* Ícono de estado */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          {pendiente && (
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#EBF5FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.History size={28} color={PRIMARY[500]} />
            </div>
          )}
          {aprobado && (
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: SUCCESS.light, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.CheckCircle size={28} color={SUCCESS.base} />
            </div>
          )}
          {rechazado && (
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: DANGER.light, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.AlertCircle size={28} color={DANGER.base} />
            </div>
          )}
        </div>

        {/* Título */}
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: GRAY[800], margin: '0 0 8px' }}>
          {pendiente ? 'Verificando tu pago...' : aprobado ? '¡Pago aprobado!' : 'Pago no completado'}
        </h1>
        <p style={{ fontSize: '13px', color: GRAY[400], margin: '0 0 24px' }}>
          {pendiente ? 'Esto puede tomar unos segundos.' :
           aprobado ? 'Tu plan ha sido actualizado exitosamente.' :
           'El pago fue rechazado o cancelado. Puedes intentar de nuevo.'}
        </p>

        {/* Detalle de la transacción */}
        {txn && !pendiente && (
          <div style={{ background: GRAY[50], borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
            {[
              { label: 'Plan', value: txn.tipo?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) },
              { label: 'Monto', value: fmt(txn.monto_cop) },
              ...(txn.creditos > 0 ? [{ label: 'Créditos acreditados', value: `${txn.creditos} créditos` }] : []),
              ...(txn.suscripcion_hasta ? [{ label: 'Activo hasta', value: new Date(txn.suscripcion_hasta).toLocaleDateString('es-CO') }] : []),
              { label: 'Referencia', value: txn.referencia },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${GRAY[200]}`, fontSize: '12px' }}>
                <span style={{ color: GRAY[500] }}>{label}</span>
                <span style={{ fontWeight: '600', color: GRAY[800] }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p style={{ fontSize: '12px', color: DANGER.base, marginBottom: '16px' }}>{error}</p>
        )}

        {/* Botones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Link to="/" style={{ display: 'block', padding: '12px', borderRadius: '10px', background: PRIMARY[500], color: '#fff', fontWeight: '700', fontSize: '13px', textDecoration: 'none' }}>
            Ir al dashboard
          </Link>
          {rechazado && (
            <Link to="/planes" style={{ display: 'block', padding: '12px', borderRadius: '10px', background: GRAY[100], color: GRAY[700], fontWeight: '600', fontSize: '13px', textDecoration: 'none' }}>
              Intentar de nuevo
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}