import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminUser } from '@/lib/auth'
import { generateToken } from '@/lib/token'
import { toApi } from '@/lib/onboarding'
import { getLogoUrl } from '@/lib/logo'

// POST /api/onboarding — admin, protected. Create a new onboarding (backend mints the token id).
export async function POST(request: Request) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { customerName?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const customerName = body.customerName?.trim()
  if (!customerName) {
    return NextResponse.json({ error: 'customerName is required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const id = generateToken()
  const { data, error } = await supabase
    .from('onboardings')
    .insert({ id, customer_name: customerName, sections: {} })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(toApi(data), { status: 201 })
}

// GET /api/onboarding — admin, protected. List all onboardings for the dashboard.
export async function GET() {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('onboardings')
    .select()
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const withLogos = await Promise.all(
    (data ?? []).map(async (row) => ({
      ...toApi(row),
      logoUrl: await getLogoUrl(supabase, row.id),
    })),
  )
  return NextResponse.json(withLogos)
}
