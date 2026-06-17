import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminUser } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }
const BUCKET = 'onboarding-files'

// GET /api/onboarding/{id}/files — admin, protected. List files with fresh signed URLs.
export async function GET(_request: Request, { params }: Ctx) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('onboarding_files')
    .select()
    .eq('onboarding_id', id)
    .order('uploaded_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const files = await Promise.all(
    (data ?? []).map(async (f) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(f.storage_path, 60 * 60)
      return {
        id: f.id,
        section: f.section,
        field: f.field,
        fileName: f.file_name,
        url: signed?.signedUrl ?? null,
      }
    }),
  )
  return NextResponse.json(files)
}

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
