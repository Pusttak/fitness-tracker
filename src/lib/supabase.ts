import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase credentials missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment variables.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // HashRouter uses window.location.hash for routing, so Supabase's built-in
    // hash-token auto-detection would race with the router. The recovery hash
    // is parsed manually in App.tsx instead.
    detectSessionInUrl: false,
  },
})
