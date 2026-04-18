-- Endurecimiento post-advisors:
--   - Policy deny-all en rate_limits (solo service_role vía SECURITY DEFINER).
--   - search_path inmutable en appointments_limit_for.
-- Aplicada via MCP.

drop policy if exists rate_limits_deny_all on public.rate_limits;
create policy rate_limits_deny_all on public.rate_limits for all to anon, authenticated using (false) with check (false);

create or replace function public.appointments_limit_for(p_plan text)
returns int language sql immutable set search_path = public as $$
  select case
    when p_plan = 'starter' then 100
    when p_plan in ('trial','pro','business') then 999999
    else 0
  end
$$;
