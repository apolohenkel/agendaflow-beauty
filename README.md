# AgendaFlow Beauty

SaaS multi-tenant de gestión de citas para salones de belleza, barberías y spas.
Stack: Next.js 16 (App Router) + React 19 + Supabase (Postgres + Auth + Storage) + Tailwind 4 + Stripe + WhatsApp Cloud API + Claude.

## Setup local

```bash
cp .env.example .env.local          # rellena las variables
npm install
npm run dev                         # http://localhost:3000
```

## Migraciones Supabase

```bash
npm i -g supabase
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push                    # aplica supabase/migrations/*.sql
```

## Build, tests y lint

```bash
npm run lint
npm run build
npm test                            # vitest (tz, plans, plan-access, error-codes)
npm run test:watch
```

## Setup de servicios externos

Pasos necesarios para que `npm run dev` funcione end-to-end. Todo lo marcado *(opcional en dev)* se puede saltar si no vas a probar ese flujo.

### Supabase
1. Crear proyecto en [supabase.com](https://supabase.com). Copiar a `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Aplicar migraciones (`supabase db push` tras linkear el proyecto, o vía MCP `apply_migration`).
3. Dashboard → Auth → Policies: activar **Leaked Password Protection**.
4. *(recomendado para prod)* Settings → Backups: activar **PITR**.

### Stripe (test mode en dev)
1. Dashboard Stripe → crear 3 productos + precios mensuales: Starter (USD 19), Pro (USD 49), Business (USD 99). Guardar los 3 `price_id` en `.env.local` como `NEXT_PUBLIC_STRIPE_PRICE_STARTER`, `NEXT_PUBLIC_STRIPE_PRICE_PRO`, `NEXT_PUBLIC_STRIPE_PRICE_BUSINESS` (son `NEXT_PUBLIC_*` porque la UI de billing los usa para detectar planes configurados; no son sensibles). Si tienes `.cursor` o el MCP de Stripe, los `create_product`/`create_price` automatizan esto.
2. Dashboard → Developers → Webhooks: añadir endpoint `https://<tu-dominio>/api/stripe/webhook` (en local usa `stripe listen --forward-to localhost:3000/api/stripe/webhook`). Eventos mínimos: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Copiar el signing secret a `STRIPE_WEBHOOK_SECRET`.
3. Copiar `STRIPE_SECRET_KEY` y `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` desde API keys.

### Resend (email)
1. [resend.com](https://resend.com) → crear API key → guardar en `RESEND_API_KEY`.
2. Dev: `RESEND_FROM_EMAIL=onboarding@resend.dev` (sólo envía a la cuenta del API key owner).
3. Prod: añadir dominio en Resend, verificar DNS, y usar `RESEND_FROM_EMAIL=no-reply@tu-dominio.com`.

### Anthropic *(opcional en dev — sólo si vas a probar el bot WhatsApp)*
`ANTHROPIC_API_KEY` desde [console.anthropic.com](https://console.anthropic.com). El bot usa Claude Haiku.

### Meta WhatsApp Business *(opcional en dev)*
1. [business.facebook.com](https://business.facebook.com) → crear app con producto **WhatsApp**.
2. Obtener **Phone Number ID** + **Access Token** (permanente) + **App Secret**. Definir un **Verify Token** propio (cualquier string aleatorio).
3. Guardar en `.env.local`: `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`.
4. Per-org: insertar fila en `whatsapp_accounts` con `phone_number_id` + `access_token` + `verify_token` del negocio (flujo normal: `/dashboard/whatsapp` del dashboard).
5. Configurar webhook de Meta apuntando a `https://<dominio>/api/whatsapp/webhook` con el mismo `verify_token`. En dev usa ngrok/cloudflared para exponer localhost.

### Cron (sólo producción)
`CRON_SECRET=<string aleatorio>` en Vercel. Vercel envía `Authorization: Bearer ${CRON_SECRET}` a `/api/cron/*` según `vercel.json`. En dev los crons no se disparan automáticamente; invócalos manualmente con `curl -H "Authorization: Bearer ..."` si necesitas probarlos.

### `APP_URL`
En prod, definir `APP_URL=https://tu-dominio.com`. Sin esta variable los links de emails y Stripe checkout apuntarán a `http://localhost:3000`.

## Rutas principales

Públicas:
- `/` — landing.
- `/signup`, `/login`, `/forgot-password`, `/reset-password` — auth.
- `/onboarding` — crea organización + business + trial 14 días; opción de seed (servicios sugeridos + horario L-V 9-19 / Sáb 10-15).
- `/b/[slug]` — booking público 4 pasos (servicio, fecha/hora, datos, confirmación).
- `/legal/{terminos,privacidad}`.

Dashboard (`/dashboard`):
- `/` panel del día · `/citas` · `/clientes` · `/servicios` · `/personal` · `/reportes` · `/whatsapp` · `/billing` · `/configuracion`.

API (`/api`):
- `POST /bookings/create` — reserva server-side (rate-limit por IP, anti-overbooking, notificación email/WA).
- `POST /onboarding` — crea org + opcional seed de servicios.
- Stripe: `POST /stripe/{checkout,portal,cancel,resume,webhook}`.
- WhatsApp: `GET|POST /whatsapp/webhook` (handshake + mensajes con HMAC-SHA256).
- Cron (Vercel): `GET /cron/reminders` (24h y 2h), `GET /cron/enforce-plans` (downgrade trial expirado).

## Arquitectura

- **Multi-tenant**: `organizations` → `organization_members` (RLS: miembros sólo ven su org). Todas las tablas tienen RLS tenant-scoped vía la helper `auth_org_ids()`.
- **Booking atómico**: RPC `book_appointment` con `pg_advisory_xact_lock` + chequeo de plan + anti-overbooking. Todas las creaciones de cita (dashboard, booking público, bot WhatsApp) van por esta RPC.
- **Planes y enforcement**: `lib/plan-access.js` (puro) resuelve plan efectivo desde `{plan, subscription, trialEndsAt}`. Límites (`appointmentsPerMonth`, feature `whatsapp`) se validan tanto client (UI) como DB (RPC).
- **Rate limiting**: tabla `rate_limits` + RPC `rate_limit_check`; aplicado en webhook WA, booking público, onboarding, stripe checkout/portal/cancel/resume. Fail-closed si el RPC falla.
- **Observabilidad**: `lib/logger.js` emite JSON estructurado con captura opcional a Sentry si el SDK está cargado.
- **Bot WhatsApp**: agente Claude Haiku con 7 tools (`list_services`, `get_business_info`, `check_availability`, `create_appointment`, `reschedule_appointment`, `list_my_appointments`, `cancel_appointment`). Verifica firma HMAC de Meta.
- **Cron Vercel**: `reminders` (hourly, envía 24h y 2h antes por WA con query batched), `enforce-plans` (daily 03:00, downgrade batch de trials expirados sin sub activa).
- **Email (Resend)**: templates `welcome`, `appointment_confirmation`, `appointment_reminder`, `appointment_cancelled`, `payment_failed`, `password_reset_notice`.
- **Estructura**:
  - `app/` — App Router (páginas, API routes, middleware en `proxy.js`).
  - `lib/supabase/{client,server,admin}.js` — clientes por contexto.
  - `lib/whatsapp/` — agent + tools + send.
  - `lib/{plan-access,limits,plans,rate-limit,email,logger,env,tz,error-codes}.js`.
  - `lib/stripe/subscription-action.js` — helper compartido cancel/resume.
  - `supabase/migrations/` — esquema versionado.

## Notas operativas

- **Supabase Auth → Leaked Password Protection**: activar en Dashboard → Auth → Policies.
- **PITR backups**: activar en Dashboard → Settings → Backups.
- **Cron `CRON_SECRET`**: Vercel envía `Authorization: Bearer <CRON_SECRET>` a las rutas `/api/cron/*`.
- **`WHATSAPP_APP_SECRET`**: obligatorio en producción para validar firma Meta; en dev se puede omitir.
