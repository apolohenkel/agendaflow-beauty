-- RPCs para gestión del slug público del negocio.
-- check_slug_available: valida formato + disponibilidad (llamado en live-check).
-- rename_org_slug: permite al owner cambiar el slug de su organización.
-- Aplicada via MCP ✓

-- ─── check_slug_available ─────────────────────────────────────────────────
-- Retorna true si el slug está libre Y tiene formato válido.
-- Accesible por anónimos porque no revela datos (solo bool).
-- El regex es el mismo que usa create_organization.

create or replace function public.check_slug_available(p_slug text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_slug is null or length(trim(p_slug)) = 0 then
    return false;
  end if;
  if p_slug !~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$' then
    return false;
  end if;
  return not exists (select 1 from public.organizations where slug = p_slug);
end $$;

grant execute on function public.check_slug_available(text) to anon, authenticated;


-- ─── rename_org_slug ──────────────────────────────────────────────────────
-- Sólo el owner de la organización puede renombrar el slug.
-- Lanza errores tipados: not_authenticated, not_owner, slug_taken,
-- invalid_slug, same_slug.

create or replace function public.rename_org_slug(p_new_slug text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_org_id uuid;
  v_current_slug text;
  v_clean text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  v_clean := lower(trim(coalesce(p_new_slug, '')));

  if v_clean !~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$' then
    raise exception 'invalid_slug';
  end if;

  -- Obtener la org del owner
  select m.org_id, o.slug into v_org_id, v_current_slug
  from public.organization_members m
  join public.organizations o on o.id = m.org_id
  where m.user_id = v_user and m.role = 'owner'
  limit 1;

  if v_org_id is null then raise exception 'not_owner'; end if;

  if v_current_slug = v_clean then
    raise exception 'same_slug';
  end if;

  if exists (select 1 from public.organizations where slug = v_clean and id <> v_org_id) then
    raise exception 'slug_taken';
  end if;

  update public.organizations set slug = v_clean where id = v_org_id;

  return v_clean;
end $$;

grant execute on function public.rename_org_slug(text) to authenticated;

comment on function public.check_slug_available(text) is
  'Valida formato y disponibilidad de un slug. Accesible por anónimos (check live en onboarding y ajustes).';
comment on function public.rename_org_slug(text) is
  'Permite al owner de una organización cambiar su slug público. Errores tipados.';
