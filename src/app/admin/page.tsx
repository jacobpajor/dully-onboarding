import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/auth'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage() {
  const user = await getAdminUser()
  if (!user) redirect('/admin/login')
  return <AdminDashboard userEmail={user.email ?? ''} />
}
