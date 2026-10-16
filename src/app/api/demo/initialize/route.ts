import { NextResponse } from 'next/server'
import { isAnonymousUser } from '@/lib/demo'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  if (!isAnonymousUser(user)) {
    return NextResponse.json(
      { error: 'Demo initialization is only available to demo users.' },
      { status: 403 },
    )
  }

  const { error } = await supabase.rpc('initialize_demo_mode')
  if (error) {
    console.error('Demo initialization failed', { code: error.code })
    return NextResponse.json(
      { error: 'Could not initialize the demo.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
