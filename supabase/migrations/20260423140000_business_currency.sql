-- Moneda del negocio (para servicios y booking público).
-- Default 'gtq' — GTQ es la mayoría de negocios iniciales.
-- Los negocios existentes heredan gtq (el dueño puede cambiar a usd, mxn,
-- cop, etc en /dashboard/configuracion).
-- Aplicada via MCP ✓

alter table public.businesses
  add column if not exists currency text not null default 'gtq'
  check (currency in ('gtq','usd','eur','mxn','cop','pen','clp','ars'));

-- Todos los negocios existentes a gtq
update public.businesses set currency = 'gtq' where currency is null;

comment on column public.businesses.currency is
  'Moneda en que se muestran los precios de servicios y la seña. Una por negocio, editable desde Ajustes.';
