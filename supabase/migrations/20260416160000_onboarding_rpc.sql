-- RPC SECURITY DEFINER para onboarding sin service_role.
-- Aplicada via MCP.

create or replace function public.create_organization(
  p_slug text,
  p_name text,
  p_timezone text default 'America/Mexico_City'
)
returns table (org_id uuid, business_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_biz uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.organization_members where user_id = v_user) then
    raise exception 'already_has_org';
  end if;
  if exists (select 1 from public.organizations where slug = p_slug) then
    raise exception 'slug_taken';
  end if;
  if p_slug !~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$' then
    raise exception 'invalid_slug';
  end if;

  insert into public.organizations (slug, name, owner_user_id)
    values (p_slug, p_name, v_user) returning id into v_org;
  insert into public.businesses (organization_id, name, timezone, active)
    values (v_org, p_name, p_timezone, true) returning id into v_biz;
  insert into public.organization_members (org_id, user_id, role)
    values (v_org, v_user, 'owner');

  return query select v_org, v_biz;
end $$;

grant execute on function public.create_organization(text, text, text) to authenticated;
