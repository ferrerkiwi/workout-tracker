import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { isAnonymousUser } from '@/lib/demo'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  // proxy.ts already gates these routes; this is defence in depth so a page
  // can never render without a user even if the matcher changes.
  const { user } = await getAuthenticatedServerClient()
  if (!user) redirect('/login')
  const isDemo = isAnonymousUser(user)

  return (
    <div className="min-h-dvh">
      <Sidebar />
      {/* Bottom bar on mobile, left rail from sm up. */}
      <div className="pb-[calc(var(--mobile-nav-height)+1rem)] sm:pb-0 sm:pl-[72px]">
        {isDemo && (
          <p className="border-b border-accent/20 bg-accent/10 px-4 py-2 text-center text-xs text-accent sm:px-8">
            Demo mode · Changes are temporary.
          </p>
        )}
        {children}
      </div>
    </div>
  )
}
