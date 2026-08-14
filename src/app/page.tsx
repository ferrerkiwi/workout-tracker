import { redirect } from 'next/navigation'

// proxy.ts already routes "/" based on auth state; this is the fallback for
// any request that reaches the route directly.
export default function Home() {
  redirect('/dashboard')
}
