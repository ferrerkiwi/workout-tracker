import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  // proxy.ts already gates these routes; this is defence in depth so a page
  // can never render without a user even if the matcher changes.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-dvh">
      <Sidebar />
      {/* Bottom bar on mobile, left rail from sm up. */}
      <div className="pb-20 sm:pb-0 sm:pl-[72px]">{children}</div>
    </div>
  )
}
