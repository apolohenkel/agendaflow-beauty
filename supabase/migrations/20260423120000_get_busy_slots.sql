-- RPC público para listar los slots ocupados de un día en el booking público.
-- Retorna solo starts_at + ends_at (sin nombres, teléfonos, etc) para que
-- el cliente pueda pintar los slots ocupados en gris desde el inicio,
-- sin esperar a que intente reservar.
-- Aplicada via MCP ✓

create or replace function public.get_busy_slots(
  p_slug text,
  p_date date,
  p_staff_id uuid default null
)
returns table(starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with target_biz as (
    select b.id as business_id, b.timezone
    from public.businesses b
    join public.organizations o on o.id = b.organization_id
    where o.slug = p_slug and b.active = true
    limit 1
  ),
  day_bounds as (
    select
      -- Rango del día en la zona horaria del negocio → UTC
      (p_date::text || ' 00:00:00')::timestamp at time zone tb.timezone as day_start,
      ((p_date + 1)::text || ' 00:00:00')::timestamp at time zone tb.timezone as day_end,
      tb.business_id
    from target_biz tb
  )
  select a.starts_at, a.ends_at
  from public.appointments a
  join day_bounds db on a.business_id = db.business_id
  where a.status not in ('cancelled', 'no_show')
    and a.starts_at < db.day_end
    and a.ends_at > db.day_start
    and (p_staff_id is null or a.staff_id is null or a.staff_id = p_staff_id)
  order by a.starts_at;
$$;

grant execute on function public.get_busy_slots(text, date, uuid) to anon, authenticated;

comment on function public.get_busy_slots(text, date, uuid) is
  'Retorna slots ocupados (starts_at, ends_at) de un día para el booking público. No expone PII.';
