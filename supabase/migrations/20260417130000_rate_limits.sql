-- Rate limiting con tabla PG: sliding window alineado por p_window_seconds.
-- Aplicada via MCP.

create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);
create index if not exists idx_rate_limits_window on public.rate_limits(window_start);

alter table public.rate_limits enable row level security;

create or replace function public.rate_limit_check(
  p_key text,
  p_quota int,
  p_window_seconds int
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  insert into public.rate_limits(key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;

  delete from public.rate_limits where window_start < now() - interval '1 hour';

  return v_count <= p_quota;
end $$;

grant execute on function public.rate_limit_check(text, int, int) to anon, authenticated, service_role;
