import type { NextResponse } from 'next/server'

/** Retain refreshed tokens and their attributes on every proxy redirect. */
export function withResponseCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie)
  return target
}
