-- Quitar policy SELECT broad en bucket logos.
-- El bucket es público (URLs accesibles), no necesita SELECT abierto.
drop policy if exists logos_public_read on storage.objects;
