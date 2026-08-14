import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'
import { REMEMBER_COOKIE, readRemember, withRemember } from './remember'

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * `cookies()` is async in Next 16, so this is async too.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          const remember = readRemember(cookieStore.get(REMEMBER_COOKIE)?.value)
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, withRemember(options, remember))
            }
          } catch {
            // Server Components cannot set cookies. Safe to ignore: proxy.ts
            // refreshes the session on every request.
          }
        },
      },
    },
  )
}
