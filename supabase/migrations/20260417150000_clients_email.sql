-- Email opcional para clientes (para confirmaciones/recordatorios).
alter table public.clients add column if not exists email text;
