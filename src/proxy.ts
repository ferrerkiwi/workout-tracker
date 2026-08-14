import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'
import {
  REMEMBER_COOKIE,
  readRemember,
  withRemember,
} from '@/lib/supabase/remember'

// Next 16 renamed `middleware.ts` to `proxy.ts`. Same capabilities, new
// filename and exported function name.

/** Reachable without a session. */
const PUBLIC_PATHS = ['/login', '/signup', '/auth']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const remember = readRemember(request.cookies.get(REMEMBER_COOKIE)?.value)

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(
              name,
              value,
              withRemember(options, remember),
            )
          }
        },
      },
    },
  )

  // getUser() revalidates the token with Supabase and refreshes it if needed.
  // Do not replace with getSession(), which trusts the cookie unverified.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (!user) {
    if (pathname === '/' || !isPublic(pathname)) return redirectTo('/login')
    return response
  }

  // Signed in. Onboarding gates everything else.
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('id', user.id)
    .maybeSingle()

  const onboarded = Boolean(profile?.onboarded_at)

  if (!onboarded && pathname !== '/onboarding') return redirectTo('/onboarding')
  if (onboarded && pathname === '/onboarding') return redirectTo('/dashboard')
  if (pathname === '/' || isPublic(pathname)) return redirectTo('/dashboard')

  return response
}

export const config = {
  // Skip static assets and image optimisation, otherwise the auth check runs
  // against CSS/JS/images and can block them from loading.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
