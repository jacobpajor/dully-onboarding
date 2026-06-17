import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminUser } from '@/lib/auth'
import { toApi } from '@/lib/onboarding'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/onboarding/{id} — anonymous (token). Load one record (customer form on load).
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('onboardings')
    .select()
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(toApi(data))
}

// PATCH /api/onboarding/{id} — anonymous (token). Save progress.
// Body: { sections: {...} }. The customer can only modify `sections`.
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params

  let body: { sections?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.sections === undefined) {
    return NextResponse.json({ error: 'sections is required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('onboardings')
    .update({ sections: body.sections })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(toApi(data))
}

// DELETE /api/onboarding/{id} — admin, protected.
export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const supabase = createServiceClient()
  const { error } = await supabase.from('onboardings').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
