import { createServerSupabase } from './supabase/server'

/**
 * Returns the signed-in admin user, or null if not authorized.
 * Admin access is restricted to ADMIN_ALLOWED_DOMAIN (e.g. dully.io).
 * Use in admin-only Route Handlers: `if (!(await getAdminUser())) return 401`.
 */
export async function getAdminUser() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return null

  const domain = process.env.ADMIN_ALLOWED_DOMAIN
  if (domain && !user.email.toLowerCase().endsWith('@' + domain.toLowerCase())) {
    return null
  }
  return user
}
