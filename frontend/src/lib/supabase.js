import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — auth disabled')
}

export const supabase = createClient(url ?? '', key ?? '', {
  auth: {
    // Tokens stored in localStorage by default in Supabase JS v2.
    // For higher security you can use cookies via SSR helpers,
    // but for a pure SPA this is the standard approach.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,   // handles OAuth + magic link redirects
  },
})
