import { Resend } from 'resend'
import { logger } from './logger'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const FROM = process.env.RESEND_FROM_EMAIL || 'AgendaFlow <no-reply@agendaes.com>'
const APP_URL = process.env.APP_URL || 'http://localhost:3000'

function layout({ title, body }) {
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#1a1a1a;">
      <h1 style="font-size:24px;font-weight:600;margin:0 0 16px;">${title}</h1>
      ${body}
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px" />
      <p style="color:#999;font-size:11px;margin:0;">AgendaFlow Beauty · <a href="${APP_URL}" style="color:#C8A96E;text-decoration:none;">${APP_URL.replace(/^https?:\/\//, '')}</a></p>
    </div>
  `
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

export async function sendWelcomeEmail({ to, orgName, slug }) {
  const bookingUrl = `${APP_URL}/b/${slug}`
  const dashboardUrl = `${APP_URL}/dashboard`
  const body = `
    <p style="color:#555;margin:0 0 24px;">Tu negocio <strong>${orgName}</strong> está listo.</p>
    <div style="background:#fafafa;border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#777;">Tu enlace público de reservas:</p>
      <p style="margin:0;"><a href="${bookingUrl}" style="color:#C8A96E;font-weight:500;text-decoration:none;">${bookingUrl}</a></p>
    </div>
    <p style="color:#555;line-height:1.6;">Próximos pasos:</p>
    <ul style="color:#555;line-height:1.7;padding-left:20px;">
      <li>Sube tu logo y elige tu color en <a href="${dashboardUrl}/configuracion" style="color:#C8A96E;">Configuración → Marca</a></li>
      <li>Crea tus servicios y precios en <a href="${dashboardUrl}/servicios" style="color:#C8A96E;">Servicios</a></li>
      <li>Agrega a tu equipo en <a href="${dashboardUrl}/personal" style="color:#C8A96E;">Personal</a></li>
      <li>Comparte tu enlace de reservas con tus clientes</li>
    </ul>
    <p style="color:#888;font-size:12px;margin-top:32px;">Tu prueba gratis dura 14 días. Sin tarjeta requerida.</p>
  `
  return send(to, `¡Bienvenido a AgendaFlow, ${orgName}!`, layout({ title: '¡Bienvenido a AgendaFlow!', body }))
}

function fmtDateTime(iso, timezone = 'America/Mexico_City') {
  return new Date(iso).toLocaleString('es-MX', {
    timeZone: timezone,
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  })
}

export async function sendAppointmentConfirmation({ to, clientName, businessName, serviceName, startsAt, timezone, address }) {
  if (!to) return { skipped: true, reason: 'no_email' }
  const body = `
    <p style="color:#555;margin:0 0 16px;">Hola ${clientName || ''}, tu cita en <strong>${businessName}</strong> está confirmada.</p>
    <div style="background:#fafafa;border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#777;">Detalle</p>
      <p style="margin:0 0 4px;"><strong>Servicio:</strong> ${serviceName || '—'}</p>
      <p style="margin:0 0 4px;"><strong>Cuándo:</strong> ${fmtDateTime(startsAt, timezone)}</p>
      ${address ? `<p style="margin:0;"><strong>Dónde:</strong> ${address}</p>` : ''}
    </div>
    <p style="color:#888;font-size:12px;">Si necesitas cancelar o reprogramar, contáctanos por WhatsApp.</p>
  `
  return send(to, `Cita confirmada · ${businessName}`, layout({ title: 'Cita confirmada', body }))
}

export async function sendAppointmentReminder({ to, clientName, businessName, serviceName, startsAt, timezone, kind = '24h' }) {
  if (!to) return { skipped: true }
  const when = kind === '24h' ? 'mañana' : 'en unas horas'
  const body = `
    <p style="color:#555;margin:0 0 16px;">Hola ${clientName || ''}, te recordamos tu cita en <strong>${businessName}</strong> ${when}.</p>
    <div style="background:#fafafa;border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;"><strong>Servicio:</strong> ${serviceName || '—'}</p>
      <p style="margin:0;"><strong>Cuándo:</strong> ${fmtDateTime(startsAt, timezone)}</p>
    </div>
  `
  return send(to, `Recordatorio de cita · ${businessName}`, layout({ title: 'Recordatorio de cita', body }))
}

export async function sendAppointmentCancelled({ to, clientName, businessName, serviceName, startsAt, timezone, reason }) {
  if (!to) return { skipped: true }
  const body = `
    <p style="color:#555;margin:0 0 16px;">Hola ${clientName || ''}, tu cita en <strong>${businessName}</strong> ha sido cancelada.</p>
    <div style="background:#fafafa;border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:16px;">
      <p style="margin:0 0 4px;"><strong>Servicio:</strong> ${serviceName || '—'}</p>
      <p style="margin:0;"><strong>Cuándo era:</strong> ${fmtDateTime(startsAt, timezone)}</p>
    </div>
    ${reason ? `<p style="color:#666;font-size:13px;">Motivo: ${reason}</p>` : ''}
    <p style="color:#888;font-size:12px;">¿Quieres reagendar? Contáctanos por WhatsApp.</p>
  `
  return send(to, `Cita cancelada · ${businessName}`, layout({ title: 'Cita cancelada', body }))
}

export async function sendPaymentFailedEmail({ to, orgName }) {
  if (!to) return { skipped: true }
  const billingUrl = `${APP_URL}/dashboard/billing`
  const body = `
    <p style="color:#555;margin:0 0 16px;">Intentamos cobrar tu suscripción de <strong>${orgName}</strong> pero el pago no pasó.</p>
    <p style="color:#555;margin:0 0 24px;">Para evitar perder acceso a tu cuenta, actualiza tu método de pago lo antes posible.</p>
    <p style="margin:24px 0;"><a href="${billingUrl}" style="display:inline-block;background:#C8A96E;color:#080808;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px;">Arreglar método de pago</a></p>
  `
  return send(to, `Pago fallido · ${orgName}`, layout({ title: 'Pago fallido', body }))
}

export async function sendPasswordResetNotice({ to }) {
  if (!to) return { skipped: true }
  const body = `
    <p style="color:#555;margin:0 0 16px;">Tu contraseña de AgendaFlow fue actualizada correctamente.</p>
    <p style="color:#888;font-size:12px;">Si no fuiste tú, responde a este correo de inmediato.</p>
  `
  return send(to, 'Contraseña actualizada', layout({ title: 'Contraseña actualizada', body }))
}
