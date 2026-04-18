-- Multi-tenancy: organizations, members, RLS tenant-scoped.
-- Aplicada via MCP (no requiere supabase db push).

-- 1. Tablas core multi-tenancy
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  owner_user_id uuid references auth.users(id) not null,
  primary_color text default '#C8A96E',
  logo_url text,
  plan text default 'trial' check (plan in ('trial','starter','pro','business')),
  trial_ends_at timestamptz default now() + interval '14 days',
  created_at timestamptz default now()
);

create table public.organization_members (
  org_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','staff')),
  created_at timestamptz default now(),
  primary key (org_id, user_id)
);
create index idx_org_members_user on public.organization_members(user_id);

-- 2. Linkear businesses a organizations
alter table public.businesses add column organization_id uuid references public.organizations(id);

-- 3. Backfill: 1 org por business existente, con el único user actual como owner
do $$
declare
  v_owner uuid := '49d43d6c-beac-478e-b5fe-00e06ab38355';
  v_org uuid;
  rec record;
begin
  for rec in select id, name from public.businesses loop
    insert into public.organizations (slug, name, owner_user_id)
    values (
      regexp_replace(lower(rec.name), '[^a-z0-9]+', '-', 'g'),
      rec.name,
      v_owner
    )
    returning id into v_org;

    update public.businesses set organization_id = v_org where id = rec.id;

    insert into public.organization_members (org_id, user_id, role)
    values (v_org, v_owner, 'owner');
  end loop;
end $$;

alter table public.businesses alter column organization_id set not null;
create index idx_businesses_org on public.businesses(organization_id);

-- 4. Helper: orgs del usuario actual (security definer para evitar recursión RLS)
create or replace function public.auth_org_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(org_id), '{}'::uuid[])
  from public.organization_members
  where user_id = auth.uid()
$$;

-- 5. RLS en organizations y members
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy org_member_select on public.organizations for select
  using (id = any(public.auth_org_ids()));
create policy org_owner_update on public.organizations for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy member_self_select on public.organization_members for select
  using (user_id = auth.uid() or org_id = any(public.auth_org_ids()));
create policy member_owner_manage on public.organization_members for all
  using (org_id in (select id from public.organizations where owner_user_id = auth.uid()))
  with check (org_id in (select id from public.organizations where owner_user_id = auth.uid()));

-- 6. Reemplazar policies permisivas (USING true) por tenant-scoped

-- BUSINESSES
drop policy if exists auth_all_businesses on public.businesses;
create policy biz_tenant_select on public.businesses for select to authenticated
  using (organization_id = any(public.auth_org_ids()));
create policy biz_tenant_insert on public.businesses for insert to authenticated
  with check (organization_id = any(public.auth_org_ids()));
create policy biz_tenant_update on public.businesses for update to authenticated
  using (organization_id = any(public.auth_org_ids()))
  with check (organization_id = any(public.auth_org_ids()));
create policy biz_tenant_delete on public.businesses for delete to authenticated
  using (organization_id = any(public.auth_org_ids()));

-- SERVICES
drop policy if exists auth_all_services on public.services;
create policy svc_tenant_all on public.services for all to authenticated
  using (business_id in (select id from public.businesses where organization_id = any(public.auth_org_ids())))
  with check (business_id in (select id from public.businesses where organization_id = any(public.auth_org_ids())));

-- STAFF
drop policy if exists auth_all_staff on public.staff;
create policy staff_tenant_all on public.staff for all to authenticated
  using (business_id in (select id from public.businesses where organization_id = any(public.auth_org_ids())))
  with check (business_id in (select id from public.businesses where organization_id = any(public.auth_org_ids())));

-- CLIENTS
drop policy if exists auth_all_clients on public.clients;
create policy clients_tenant_all on public.clients for all to authenticated
  using (business_id in (select id from public.businesses where organization_id = any(public.auth_org_ids())))
  with check (business_id in (select id from public.businesses where organization_id = any(public.auth_org_ids())));

-- APPOINTMENTS
drop policy if exists auth_all_appointments on public.appointments;
create policy appt_tenant_all on public.appointments for all to authenticated
  using (business_id in (select id from public.businesses where organization_id = any(public.auth_org_ids())))
  with check (business_id in (select id from public.businesses where organization_id = any(public.auth_org_ids())));

-- AVAILABILITY
drop policy if exists auth_all_availability on public.availability;
create policy avail_tenant_all on public.availability for all to authenticated
  using (business_id in (select id from public.businesses where organization_id = any(public.auth_org_ids())))
  with check (business_id in (select id from public.businesses where organization_id = any(public.auth_org_ids())));

-- REMINDERS (sin business_id directo; via appointment_id)
drop policy if exists auth_all_reminders on public.reminders;
create policy rem_tenant_all on public.reminders for all to authenticated
  using (appointment_id in (
    select a.id from public.appointments a
    join public.businesses b on b.id = a.business_id
    where b.organization_id = any(public.auth_org_ids())
  ))
  with check (appointment_id in (
    select a.id from public.appointments a
    join public.businesses b on b.id = a.business_id
    where b.organization_id = any(public.auth_org_ids())
  ));

-- 7. Endurecer INSERT públicas de booking (anon): limitar a businesses activos.
-- En Fase 2 se sustituirán por route handler con service_role + validación de slug.
drop policy if exists public_insert_clients on public.clients;
create policy public_insert_clients on public.clients for insert to anon
  with check (business_id in (select id from public.businesses where active = true));

drop policy if exists public_insert_appointments on public.appointments;
create policy public_insert_appointments on public.appointments for insert to anon
  with check (business_id in (select id from public.businesses where active = true));
