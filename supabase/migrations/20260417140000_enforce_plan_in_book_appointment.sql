-- Refuerza book_appointment con:
--   - Validación de plan activo (subscription o trial vigente)
--   - Límite de citas/mes por plan (starter = 100)
--   - Excepciones tipadas: business_not_active, not_authorized, no_active_plan,
--     trial_expired, plan_limit_reached, slot_unavailable
-- Aplicada via MCP.

create or replace function public.appointments_limit_for(p_plan text)
returns int language sql immutable as $$
  select case
    when p_plan = 'starter' then 100
    when p_plan in ('trial','pro','business') then 999999
    else 0
  end
$$;

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
  v_org_id uuid;
  v_plan text;
  v_sub_status text;
  v_trial_ends timestamptz;
  v_limit int;
  v_count int;
begin
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'invalid_range';
  end if;

  select organization_id into v_org_id from public.businesses where id = p_business_id and active = true;
  if v_org_id is null then raise exception 'business_not_active'; end if;

  if v_uid is not null then
    if not exists (select 1 from public.organization_members where org_id = v_org_id and user_id = v_uid) then
      raise exception 'not_authorized';
    end if;
  end if;

  select s.status, s.plan into v_sub_status, v_plan
  from public.subscriptions s where s.org_id = v_org_id;

  if v_sub_status in ('active','trialing') and v_plan is not null then
    null;
  else
    select o.plan, o.trial_ends_at into v_plan, v_trial_ends
    from public.organizations o where o.id = v_org_id;
    if v_plan = 'trial' then
      if v_trial_ends is null or v_trial_ends <= now() then
        raise exception 'trial_expired';
      end if;
    else
      raise exception 'no_active_plan';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));

  v_limit := public.appointments_limit_for(v_plan);
  if v_limit < 999999 then
    select count(*) into v_count
    from public.appointments a
    join public.businesses b on b.id = a.business_id
    where b.organization_id = v_org_id
      and a.starts_at >= date_trunc('month', now())
      and a.status not in ('cancelled','no_show');
    if v_count >= v_limit then
      raise exception 'plan_limit_reached';
    end if;
  end if;

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
