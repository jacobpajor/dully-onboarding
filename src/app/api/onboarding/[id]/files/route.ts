import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'

type Ctx = { params: Promise<{ id: string }> }
const BUCKET = 'onboarding-files'

// POST /api/onboarding/{id}/files — anonymous (token), multipart.
// Fields: file, section (e.g. 'employees'), field (e.g. 'csvFile' | 'contractFiles').
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = createServiceClient()

  // Token check: the onboarding must exist before we accept an upload.
  const { data: ob } = await supabase
    .from('onboardings')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (!ob) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const form = await request.formData()
  const file = form.get('file')
  const section = (form.get('section') as string | null)?.trim() || 'misc'
  const field = (form.get('field') as string | null)?.trim() || 'file'

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }

  const fileId = randomUUID()
  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  const storagePath = `${id}/${section}/${fileId}-${safeName}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { error: rowErr } = await supabase.from('onboarding_files').insert({
    id: fileId,
    onboarding_id: id,
    section,
    field,
    file_name: file.name,
    storage_path: storagePath,
    content_type: file.type || null,
    size_bytes: file.size,
  })
  if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 })

  // Private bucket -> hand back a short-lived signed URL for immediate use.
  // The admin view should re-mint fresh signed URLs from storage_path on display.
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60)

  return NextResponse.json({
    fileId,
    fileName: file.name,
    url: signed?.signedUrl ?? null,
  })
}
