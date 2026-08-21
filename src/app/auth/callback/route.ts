import { NextResponse, type NextRequest } from 'next/server'
import {
  authSource,
  googleAuthErrorRedirect,
  safeInternalPath,
} from '@/lib/auth-redirect'
import { createClient } from '@/lib/supabase/server'

function redirectToApp(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url))
}

export async function GET(request: NextRequest) {
  const source = authSource(request.nextUrl.searchParams.get('source'))
  const next = safeInternalPath(request.nextUrl.searchParams.get('next'))

  if (request.nextUrl.searchParams.get('error')) {
    return redirectToApp(
      request,
      googleAuthErrorRedirect(source, 'oauth_cancelled'),
    )
  }

  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return redirectToApp(request, googleAuthErrorRedirect(source, 'missing_code'))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return redirectToApp(
      request,
      googleAuthErrorRedirect(source, 'code_exchange_failed'),
    )
  }

  return redirectToApp(request, next)
}
