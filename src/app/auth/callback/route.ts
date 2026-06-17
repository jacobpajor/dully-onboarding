import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// The magic-link email lands here with a one-time code; exchange it for a session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}/admin`)
  }

  return NextResponse.redirect(`${origin}/admin/login?error=1`)
}
