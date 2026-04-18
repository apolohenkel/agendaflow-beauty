-- RPC atómica para crear citas con anti-overbooking.
-- Usa advisory lock por business para serializar comprobaciones concurrentes.
-- Aplicada via MCP.

create or replace function public.book_appointment(
  p_business_id uuid,
  p_client_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_status text default 'pending',
  p_source text default 'web',
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_apt uuid;
  v_uid uuid := auth.uid();
begin
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'invalid_range';
  end if;

  if v_uid is null then
    if not exists (select 1 from public.businesses where id = p_business_id and active = true) then
      raise exception 'business_not_active';
    end if;
  else
    if not exists (
      select 1 from public.businesses b
      join public.organization_members m on m.org_id = b.organization_id
      where b.id = p_business_id and m.user_id = v_uid
    ) then
      raise exception 'not_authorized';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));

  if exists (
    select 1 from public.appointments a
    where a.business_id = p_business_id
      and a.status not in ('cancelled','no_show')
      and (p_staff_id is null or a.staff_id is null or a.staff_id = p_staff_id)
      and a.starts_at < p_ends_at
      and a.ends_at   > p_starts_at
  ) then
    raise exception 'slot_unavailable';
  end if;

  insert into public.appointments(business_id, client_id, service_id, staff_id, starts_at, ends_at, status, source, notes)
  values (p_business_id, p_client_id, p_service_id, p_staff_id, p_starts_at, p_ends_at, p_status, p_source, p_notes)
  returning id into v_apt;

  return v_apt;
end $$;

grant execute on function public.book_appointment(uuid, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text) to anon, authenticated;

create or replace function public.check_slot_available(
  p_business_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_exclude_id uuid default null
) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.appointments a
    where a.business_id = p_business_id
      and (p_exclude_id is null or a.id <> p_exclude_id)
      and a.status not in ('cancelled','no_show')
      and (p_staff_id is null or a.staff_id is null or a.staff_id = p_staff_id)
      and a.starts_at < p_ends_at
      and a.ends_at   > p_starts_at
  )
$$;

grant execute on function public.check_slot_available(uuid, uuid, timestamptz, timestamptz, uuid) to anon, authenticated;
