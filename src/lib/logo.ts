import type { createServiceClient } from './supabase/service'

type ServiceClient = ReturnType<typeof createServiceClient>

export const LOGO_SECTION = '_logo'
const BUCKET = 'onboarding-files'

/** Returns a short-lived signed URL for a client's logo, or null if none. */
export async function getLogoUrl(
  supabase: ServiceClient,
  onboardingId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('onboarding_files')
    .select('storage_path')
    .eq('onboarding_id', onboardingId)
    .eq('section', LOGO_SECTION)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(data.storage_path, 60 * 60)
  return signed?.signedUrl ?? null
}
