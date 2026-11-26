import { createClient } from '@supabase/supabase-js'

// La clave "publishable" es pública por diseño: la seguridad real la dan las políticas RLS de la base.
export const SUPABASE_URL = 'https://evpavvcllbwbhugexdcg.supabase.co'
const PUBLISHABLE_KEY = 'sb_publishable_1ur7-_B-X4f8uh3sdd-QGg_DnW532rt'
export const DOMINIO = '@greeninitiative.eco'

export const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY)
