import CustomerForm from '@/components/form/CustomerForm'

export default async function FormPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <CustomerForm token={token} />
}
