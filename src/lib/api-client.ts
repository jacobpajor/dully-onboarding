import type { Sections } from './onboarding-config'

export type OnboardingData = {
  id: string
  customerName: string
  createdAt: string
  completedAt: string | null
  sections: Sections
  logoUrl?: string | null
}

/** Customer-side API calls (same-origin Route Handlers). Token is in the URL. */

export async function fetchOnboarding(token: string): Promise<OnboardingData | null> {
  const r = await fetch(`/api/onboarding/${token}`, { cache: 'no-store' })
  if (!r.ok) return null
  return r.json()
}

export async function saveSections(token: string, sections: Sections): Promise<void> {
  await fetch(`/api/onboarding/${token}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections }),
  })
}

export async function completeOnboarding(token: string): Promise<void> {
  await fetch(`/api/onboarding/${token}/complete`, { method: 'POST' })
}

export async function uploadFile(
  token: string,
  section: string,
  field: string,
  file: File,
): Promise<{ fileId: string; fileName: string; url: string | null }> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('section', section)
  fd.append('field', field)
  const r = await fetch(`/api/onboarding/${token}/files`, { method: 'POST', body: fd })
  if (!r.ok) throw new Error('Upload failed')
  return r.json()
}

// ── Admin API calls (the logged-in session cookie carries auth) ────────

export async function listOnboardings(): Promise<OnboardingData[]> {
  const r = await fetch('/api/onboarding', { cache: 'no-store' })
  if (!r.ok) throw new Error('Kunne ikke hente listen')
  return r.json()
}

export async function createOnboarding(customerName: string): Promise<OnboardingData> {
  const r = await fetch('/api/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName }),
  })
  if (!r.ok) throw new Error('Kunne ikke oprette onboarding')
  return r.json()
}

export async function deleteOnboarding(id: string): Promise<void> {
  const r = await fetch(`/api/onboarding/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Kunne ikke slette')
}

export type AdminFile = {
  id: string
  section: string
  field: string
  fileName: string
  url: string | null
}

export async function listFiles(id: string): Promise<AdminFile[]> {
  const r = await fetch(`/api/onboarding/${id}/files`, { cache: 'no-store' })
  if (!r.ok) throw new Error('Kunne ikke hente filer')
  return r.json()
}

export async function uploadLogo(id: string, file: File): Promise<{ logoUrl: string | null }> {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch(`/api/onboarding/${id}/logo`, { method: 'POST', body: fd })
  if (!r.ok) throw new Error('Kunne ikke uploade logo')
  return r.json()
}
