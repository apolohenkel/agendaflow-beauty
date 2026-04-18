-- Helpers SECURITY DEFINER para el booking público en /b/[slug].
-- Aplicada via MCP.

create or replace function public.get_public_org(p_slug text)
returns table (id uuid, slug text, name text, primary_color text, logo_url text)
language sql stable security definer set search_path = public as $$
  select id, slug, name, primary_color, logo_url
  from public.organizations where slug = p_slug
$$;
grant execute on function public.get_public_org(text) to anon, authenticated;

create or replace function public.find_or_create_client(p_business_id uuid, p_phone text, p_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_client_id uuid;
begin
  if not exists (select 1 from public.businesses where id = p_business_id and active = true) then
    raise exception 'business_not_active';
  end if;
  select id into v_client_id from public.clients
    where business_id = p_business_id and phone = p_phone limit 1;
  if v_client_id is null then
    insert into public.clients (business_id, name, phone, whatsapp_phone)
      values (p_business_id, p_name, p_phone, p_phone) returning id into v_client_id;
  end if;
  return v_client_id;
end $$;
grant execute on function public.find_or_create_client(uuid, text, text) to anon, authenticated;
