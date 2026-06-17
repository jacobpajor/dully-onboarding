import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { toApi } from '@/lib/onboarding'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/onboarding/{id}/complete — anonymous (token). Mark as submitted.
export async function POST(_request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('onboardings')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(toApi(data))
}
