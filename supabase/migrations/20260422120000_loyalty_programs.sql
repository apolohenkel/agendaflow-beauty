-- Programas de fidelidad configurables por negocio.
-- Ej: "cada 10 cortes, corte gratis" → visits_required=10, reward_type='free_service'.
-- Aplicada via MCP ✓

create table public.loyalty_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,

  -- Identidad visible al usuario
  name text not null,                                     -- "10 cortes = 1 gratis"
  description text,                                        -- descripción opcional

  -- Trigger: cuántas visitas completadas activan la recompensa
  visits_required int not null default 10
    check (visits_required between 1 and 100),

  -- Ámbito: qué servicios cuentan para el conteo. null = todos los servicios.
  -- Array de service_ids. Permite "solo cortes cuentan para este programa".
  counted_service_ids uuid[] default null,

  -- Recompensa
  reward_type text not null default 'free_service'
    check (reward_type in ('free_service','percent_off','fixed_amount_off')),
  reward_value numeric not null default 100                -- 100 (%), monto fijo, o % descuento
    check (reward_value >= 0),
  reward_service_id uuid references public.services(id) on delete set null,
  reward_description text,                                 -- "Corte gratis" (opcional — si no, se auto-genera)

  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index loyalty_rules_business_id_idx on public.loyalty_rules(business_id);
create index loyalty_rules_active_idx on public.loyalty_rules(business_id, active);

alter table public.loyalty_rules enable row level security;

-- Miembros de la org leen y escriben reglas de sus negocios.
-- Se sigue el patrón ya usado en otras tablas tenant-scoped.
create policy loyalty_rules_org_member on public.loyalty_rules
  for all to authenticated
  using (
    business_id in (
      select id from public.businesses where organization_id = any(public.auth_org_ids())
    )
  )
  with check (
    business_id in (
      select id from public.businesses where organization_id = any(public.auth_org_ids())
    )
  );

-- Trigger updated_at. search_path fijado por hardening (advisor Supabase).
create or replace function public.tg_loyalty_rules_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger loyalty_rules_set_updated_at
  before update on public.loyalty_rules
  for each row execute function public.tg_loyalty_rules_updated_at();

comment on table public.loyalty_rules is
  'Reglas de fidelidad configurables por negocio. Ej: 10 cortes = 1 gratis.';
