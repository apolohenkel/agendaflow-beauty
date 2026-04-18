# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Comandos

```bash
npm run dev        # dev server en http://localhost:3000
npm run build      # build de producción (verifica rutas + tipado)
npm run lint       # eslint
npm test           # vitest run (tz, plans, plan-access, error-codes)
npm run test:watch # vitest en watch mode
npx vitest run tests/plan-access.test.js  # correr un solo archivo
```

Migraciones Supabase: `supabase db push` aplica `supabase/migrations/*.sql`, o vía MCP `apply_migration`. El comentario `-- Aplicada via MCP` marca migraciones ya ejecutadas.

## Arquitectura

**SaaS multi-tenant de citas**. Modelo: `organizations` → `organization_members` (RLS por `auth_org_ids()`) → `businesses` → `{services, staff, appointments, clients}`. Toda tabla tenant-scoped tiene RLS activada — el `service_role` (webhooks, crons, bot) hace bypass; el cliente autenticado sólo ve su org.

**Booking atómico**: la RPC `book_appointment` es el único camino para crear `appointments` (dashboard, booking público `/b/[slug]`, bot WhatsApp). Valida plan efectivo, límite mensual, membresía org, y usa `pg_advisory_xact_lock(business_id)` + chequeo de solape para prevenir overbooking. Los errores son códigos tipados (`slot_unavailable`, `plan_limit_reached`, `trial_expired`, `no_active_plan`, `business_not_active`, `not_authorized`) mapeados en `lib/error-codes.js`.

**Plan efectivo**: `lib/plan-access.js → effectivePlan({ plan, subscription, trialEndsAt })` es puro y se usa idénticamente en cliente (vía `useOrg`) y server (vía `lib/limits.js`). Los límites se validan tanto en UI como en la RPC — duplicación intencional.

**Rate limiting**: tabla `rate_limits` + RPC `rate_limit_check` (sliding window). Fail-closed si el RPC falla. Aplicado en webhook WA, booking público, onboarding, stripe checkout/portal/cancel/resume.

**Observabilidad**: `lib/logger.js` emite JSON estructurado; si hay Sentry cargado en `globalThis.Sentry` lo captura también. Handlers críticos (webhooks, crons, endpoints públicos) usan `logger.{info,warn,error}(scope, msgOrErr, extra)` — nunca `console.*` en código nuevo.

**Bot WhatsApp**: agente Claude Haiku en `lib/whatsapp/agent.js` con 7 tools registradas (list_services, get_business_info, check_availability, create_appointment, reschedule_appointment, list_my_appointments, cancel_appointment). El webhook `/api/whatsapp/webhook` verifica firma HMAC-SHA256 de Meta con `timingSafeEqual`.

**Cron Vercel** (`vercel.json`): `reminders` (hourly, 24h+2h antes por WA), `enforce-plans` (daily 03:00, downgrade batch de trials expirados). Ambos exigen `Authorization: Bearer ${CRON_SECRET}`.

## Reglas del proyecto

**Aplicación de migraciones**: Las migraciones en `supabase/migrations/` se aplican vía MCP (`apply_migration`) o `supabase db push`. El archivo es la fuente versionada; el comentario `-- Aplicada via MCP` indica que ya está ejecutada en el proyecto.

**Creación de citas**: Toda creación de appointment pasa por la RPC `book_appointment` — nunca insertar directo en `appointments`. Mapear errores a UI con `lib/error-codes.js`.

**Plan efectivo**: Usar `lib/plan-access.js → effectivePlan(...)` — nunca comparar `plan === 'pro'` crudo en UI. La misma función se usa client y server.

**Context (`useOrg`)**: Expone `user, orgId, businessId, business, plan, trialEndsAt, subscription, whatsappConnected, effective, canUseWhatsApp`. Los banners de trial/past_due y el pill de WhatsApp ya derivan de aquí — no montar queries paralelas en componentes.

**Logging**: `lib/logger.js → logger.{info,warn,error}(scope, msgOrErr, extra)`. No usar `console.*` en código nuevo.

**Middleware**: Next.js 16 renombró `middleware.js` → `proxy.js` con `export function proxy()`. Mantener esa convención; edge runtime no está soportado en `proxy`.

**Timezone**: Usar `lib/tz.js` (`dayOfWeekInTz`, `localToUtcIso`, `dayBoundsUtcIso`) para convertir entre wall-clock del negocio y UTC. Nunca aritmética de `ms` local sin saber el TZ — rompe con DST y cuando el server corre en UTC.

**Env vars**: Rutas que dependen de servicios externos usan `lib/env.js → requireEnv(group, scope)` para fallar temprano con log explícito si falta alguna var (grupos: `supabase`, `stripe`, `stripe_prices`, `anthropic`, `whatsapp`, `resend`, `cron`).

**Clientes Supabase**: `lib/supabase/client.js` (browser), `lib/supabase/server.js` (SSR con cookies), `lib/supabase/admin.js` (service_role, sólo server — webhooks/crons/endpoints públicos).
