-- Policy faltante de SELECT en el bucket logos.
-- Sin esto, el upsert=true del cliente fallaba con "row-level security"
-- porque Storage necesita hacer SELECT primero para decidir entre
-- INSERT (nuevo) vs UPDATE (existente).
-- El bucket es public=true, así que conceptualmente ya se podía leer;
-- solo faltaba la policy explícita. Aplicada via MCP ✓

create policy logos_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'logos');

comment on policy logos_public_read on storage.objects is
  'Lectura pública del bucket logos. Necesario para renderizar logos en /b/[slug] y para que upsert=true funcione en el dashboard del dueño.';
