import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminUser } from '@/lib/auth'
import { LOGO_SECTION, getLogoUrl } from '@/lib/logo'

type Ctx = { params: Promise<{ id: string }> }
const BUCKET = 'onboarding-files'

// POST /api/onboarding/{id}/logo — admin, multipart. Upload/replace a client's logo.
export async function POST(request: Request, { params }: Ctx) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const supabase = createServiceClient()

  const { data: ob } = await supabase
    .from('onboardings')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (!ob) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }

  // Remove any existing logo (files + records) so there's only ever one.
  const { data: old } = await supabase
    .from('onboarding_files')
    .select('id, storage_path')
    .eq('onboarding_id', id)
    .eq('section', LOGO_SECTION)
  if (old?.length) {
    await supabase.storage.from(BUCKET).remove(old.map((o) => o.storage_path))
    await supabase
      .from('onboarding_files')
      .delete()
      .in('id', old.map((o) => o.id))
  }

  const fileId = randomUUID()
  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  const storagePath = `${id}/${LOGO_SECTION}/${fileId}-${safeName}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined, upsert: false })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { error: rowErr } = await supabase.from('onboarding_files').insert({
    id: fileId,
    onboarding_id: id,
    section: LOGO_SECTION,
    field: 'logo',
    file_name: file.name,
    storage_path: storagePath,
    content_type: file.type || null,
    size_bytes: file.size,
  })
  if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 })

  const logoUrl = await getLogoUrl(supabase, id)
  return NextResponse.json({ logoUrl })
}
