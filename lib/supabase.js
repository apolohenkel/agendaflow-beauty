// Compat shim - se eliminará en Fase 1 tras refactor de consumers.
// Nuevos archivos deben importar desde ./supabase/client | server | admin.
import { createClient } from './supabase/client'

export const supabase = createClient()
