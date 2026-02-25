import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[LocaLore] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in your .env file.',
  )
}

/** Supabase client — rows are cast to app types at the call site */
export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
)
