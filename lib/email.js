import { Resend } from 'resend'
import { logger } from './logger'
import { getVertical, DEFAULT_VERTICAL } from './verticals'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const FROM = process.env.RESEND_FROM_EMAIL || 'AgendaFlow <no-reply@agendaes.com>'
const APP_URL = process.env.APP_URL || 'http://localhost:3000'

// Devuelve los tokens de estilo a usar en email según la vertical.
// Nota: emails tienen fondo del cliente de correo (normalmente claro),
// así que mantenemos fondo neutro y tomamos sólo primary/text/soft del tema.
function themeForEmail(verticalKey) {
  const v = getVertical(verticalKey || DEFAULT_VERTICAL)
  return {
    primary: v.theme.primary,
    primaryHover: v.theme.primaryHover,
    text: '#1F1712',
    textSoft: '#6B5A4F',
    textMuted: '#A89582',
    surface: '#FAF6F0',
    border: '#EDE5DB',
    onPrimary: v.theme.onPrimary === '#1A1410' ? '#FAF6F0' : v.theme.onPrimary,
  }
}

function layout({ title, body, vertical }) {
  const t = themeForEmail(vertical)
  return `
    <div style="font-family:'DM Sans',system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:${t.text};background:#ffffff;">
      <div style="display:inline-block;padding:3px 0;border-bottom:2px solid ${t.primary};margin-bottom:20px;">
        <span style="font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;color:${t.text};letter-spacing:0.02em;">AgendaFlow</span>
      </div>
      <h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:400;margin:0 0 16px;color:${t.text};line-height:1.2;">${title}</h1>
      ${body}
      <hr style="border:none;border-top:1px solid ${t.border};margin:32px 0 16px" />
      <p style="color:${t.textMuted};font-size:11px;margin:0;">AgendaFlow Beauty · <a href="${APP_URL}" style="color:${t.primary};text-decoration:none;">${APP_URL.replace(/^https?:\/\//, '')}</a></p>
    </div>
  `
}

function card({ body, vertical }) {
  const t = themeForEmail(vertical)
  return `<div style="background:${t.surface};border:1px solid ${t.border};border-radius:14px;padding:20px;margin-bottom:24px;">${body}</div>`
}

function primaryButton({ href, label, vertical }) {
  const t = themeForEmail(vertical)
  return `<a href="${href}" style="display:inline-block;background:${t.primary};color:${t.onPrimary};text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px;">${label}</a>`
}

async function send(to, subject, html) {
  const resend = getResend()
  if (!resend) {
    logger.info('email', 'skipped_no_key', { subject, to })
    return { skipped: true }
  }
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html })
    if (error) {
      logger.error('email', error, { subject, to })
      return { error }
    }
    return { id: data?.id }
  } catch (err) {
    logger.error('email', err, { subject, to })
    return { error: err }
  }
}

export async function sendWelcomeEmail({ to, orgName, slug, vertical }) {
  const t = themeForEmail(vertical)
  const v = getVertical(vertical || DEFAULT_VERTICAL)
  const bookingUrl = `${APP_URL}/b/${slug}`
  const dashboardUrl = `${APP_URL}/dashboard`
  const body = `
    <p style="color:${t.textSoft};margin:0 0 24px;line-height:1.6;">Tu ${v.copy.salonWord} <strong style="color:${t.text};">${orgName}</strong> está listo. Bienvenido a AgendaFlow.</p>
    ${card({
      vertical,
      body: `
        <p style="margin:0 0 8px;font-size:12px;color:${t.textMuted};text-transform:uppercase;letter-spacing:0.08em;">Tu enlace público de reservas</p>
        <p style="margin:0;"><a href="${bookingUrl}" style="color:${t.primary};font-weight:600;text-decoration:none;font-size:15px;">${bookingUrl}</a></p>
      `,
    })}
    <p style="color:${t.text};line-height:1.6;margin:0 0 10px;font-weight:500;">Próximos pasos:</p>
    <ul style="color:${t.textSoft};line-height:1.8;padding-left:20px;margin:0 0 24px;">
      <li>Sube tu logo y elige tu color en <a href="${dashboardUrl}/configuracion" style="color:${t.primary};font-weight:500;">Configuración</a></li>
      <li>Ajusta servicios y precios en <a href="${dashboardUrl}/servicios" style="color:${t.primary};font-weight:500;">Servicios</a></li>
      <li>Agrega a tus ${v.copy.staffTerm} en <a href="${dashboardUrl}/personal" style="color:${t.primary};font-weight:500;">Personal</a></li>
      <li>Comparte tu enlace de reservas con tus ${v.copy.clientTerm}</li>
    </ul>
    ${primaryButton({ href: dashboardUrl, label: 'Ir a mi panel', vertical })}
    <p style="color:${t.textMuted};font-size:12px;margin-top:32px;">Tu prueba dura 14 días completos. Sin tarjeta requerida.</p>
  `
  return send(to, `¡Bienvenido a AgendaFlow, ${orgName}!`, layout({ title: `Tu ${v.copy.salonWord} está listo`, body, vertical }))
}

function fmtDateTime(iso, timezone = 'America/Mexico_City') {
  return new Date(iso).toLocaleString('es-MX', {
    timeZone: timezone,
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  })
}

export async function sendAppointmentConfirmation({ to, clientName, businessName, serviceName, startsAt, timezone, address, vertical, appointmentId, cancelToken, slug }) {
  if (!to) return { skipped: true, reason: 'no_email' }
  const t = themeForEmail(vertical)
  const mapsLink = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null
  const cancelLink = (appointmentId && cancelToken && slug)
    ? `${APP_URL}/b/${slug}/cancel?id=${appointmentId}&t=${cancelToken}`
    : null
  const body = `
    <p style="color:${t.textSoft};margin:0 0 20px;line-height:1.6;">Hola ${clientName || ''}, tu cita en <strong style="color:${t.text};">${businessName}</strong> quedó confirmada.</p>
    ${card({
      vertical,
      body: `
        <p style="margin:0 0 12px;font-size:12px;color:${t.textMuted};text-transform:uppercase;letter-spacing:0.08em;">Detalle</p>
        <p style="margin:0 0 6px;color:${t.text};"><strong style="color:${t.textSoft};font-weight:500;">Servicio:</strong> ${serviceName || '—'}</p>
        <p style="margin:0 0 6px;color:${t.text};"><strong style="color:${t.textSoft};font-weight:500;">Cuándo:</strong> ${fmtDateTime(startsAt, timezone)}</p>
        ${address ? `<p style="margin:0;color:${t.text};"><strong style="color:${t.textSoft};font-weight:500;">Dónde:</strong> ${address}</p>` : ''}
      `,
    })}
    <table role="presentation" style="margin:0 0 20px;border-collapse:collapse;">
      <tr>
        ${mapsLink ? `<td style="padding-right:8px;"><a href="${mapsLink}" style="display:inline-block;background:${t.surface};border:1px solid ${t.border};color:${t.text};text-decoration:none;font-weight:500;padding:10px 16px;border-radius:999px;font-size:13px;">🗺 Abrir en Maps</a></td>` : ''}
        ${cancelLink ? `<td><a href="${cancelLink}" style="display:inline-block;background:${t.surface};border:1px solid ${t.border};color:${t.textSoft};text-decoration:none;font-weight:500;padding:10px 16px;border-radius:999px;font-size:13px;">Cancelar cita</a></td>` : ''}
      </tr>
    </table>
    <p style="color:${t.textMuted};font-size:12px;">¿Necesitas reprogramar? Escríbenos por WhatsApp.</p>
  `
  return send(to, `Cita confirmada · ${businessName}`, layout({ title: 'Cita confirmada', body, vertical }))
}

export async function sendAppointmentReminder({ to, clientName, businessName, serviceName, startsAt, timezone, kind = '24h', vertical }) {
  if (!to) return { skipped: true }
  const t = themeForEmail(vertical)
  const when = kind === '24h' ? 'mañana' : 'en unas horas'
  const body = `
    <p style="color:${t.textSoft};margin:0 0 20px;line-height:1.6;">Hola ${clientName || ''}, te recordamos tu cita en <strong style="color:${t.text};">${businessName}</strong> ${when}.</p>
    ${card({
      vertical,
      body: `
        <p style="margin:0 0 6px;color:${t.text};"><strong style="color:${t.textSoft};font-weight:500;">Servicio:</strong> ${serviceName || '—'}</p>
        <p style="margin:0;color:${t.text};"><strong style="color:${t.textSoft};font-weight:500;">Cuándo:</strong> ${fmtDateTime(startsAt, timezone)}</p>
      `,
    })}
  `
  return send(to, `Recordatorio de cita · ${businessName}`, layout({ title: 'Recordatorio de cita', body, vertical }))
}

export async function sendAppointmentCancelled({ to, clientName, businessName, serviceName, startsAt, timezone, reason, vertical }) {
  if (!to) return { skipped: true }
  const t = themeForEmail(vertical)
  const body = `
    <p style="color:${t.textSoft};margin:0 0 20px;line-height:1.6;">Hola ${clientName || ''}, tu cita en <strong style="color:${t.text};">${businessName}</strong> fue cancelada.</p>
    ${card({
      vertical,
      body: `
        <p style="margin:0 0 6px;color:${t.text};"><strong style="color:${t.textSoft};font-weight:500;">Servicio:</strong> ${serviceName || '—'}</p>
        <p style="margin:0;color:${t.text};"><strong style="color:${t.textSoft};font-weight:500;">Cuándo era:</strong> ${fmtDateTime(startsAt, timezone)}</p>
      `,
    })}
    ${reason ? `<p style="color:${t.textSoft};font-size:13px;margin:0 0 16px;">Motivo: ${reason}</p>` : ''}
    <p style="color:${t.textMuted};font-size:12px;">¿Quieres reagendar? Escríbenos por WhatsApp.</p>
  `
  return send(to, `Cita cancelada · ${businessName}`, layout({ title: 'Cita cancelada', body, vertical }))
}

export async function sendPaymentFailedEmail({ to, orgName, vertical }) {
  if (!to) return { skipped: true }
  const t = themeForEmail(vertical)
  const billingUrl = `${APP_URL}/dashboard/billing`
  const body = `
    <p style="color:${t.textSoft};margin:0 0 16px;line-height:1.6;">Intentamos cobrar tu suscripción de <strong style="color:${t.text};">${orgName}</strong> pero el pago no pasó.</p>
    <p style="color:${t.textSoft};margin:0 0 24px;line-height:1.6;">Para evitar perder acceso a tu cuenta, actualiza tu método de pago lo antes posible.</p>
    <p style="margin:24px 0;">${primaryButton({ href: billingUrl, label: 'Arreglar método de pago', vertical })}</p>
  `
  return send(to, `Pago fallido · ${orgName}`, layout({ title: 'Pago fallido', body, vertical }))
}

export async function sendPasswordResetNotice({ to, vertical }) {
  if (!to) return { skipped: true }
  const t = themeForEmail(vertical)
  const body = `
    <p style="color:${t.textSoft};margin:0 0 16px;line-height:1.6;">Tu contraseña de AgendaFlow fue actualizada correctamente.</p>
    <p style="color:${t.textMuted};font-size:12px;">Si no fuiste tú, responde a este correo de inmediato.</p>
  `
  return send(to, 'Contraseña actualizada', layout({ title: 'Contraseña actualizada', body, vertical }))
}
