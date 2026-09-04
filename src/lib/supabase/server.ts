import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
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

/**
 * Shares one verified user lookup across the Server Components rendered for a
 * request. React's cache is request-scoped here, so it never shares a client
 * or user between visitors.
 */
export const getAuthenticatedServerClient = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, user }
})
