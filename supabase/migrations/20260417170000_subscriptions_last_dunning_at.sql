-- Dedup de emails de pago fallido: registramos la última vez que enviamos dunning.
alter table public.subscriptions add column if not exists last_dunning_at timestamptz;
