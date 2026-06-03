import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Variables Supabase manquantes.\n' +
    'Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'gcap-gn-auth',
  },
  global: {
    headers: {
      'x-application-name': 'GCAP-GN',
    },
  },
})
