import CustomerForm from '@/components/form/CustomerForm'

export default async function FormPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return (
    <>
      <div className="mobile-gate">
        <div className="mobile-gate-mark">d.</div>
        <h1 className="mobile-gate-title">Åbn på din computer</h1>
        <p className="mobile-gate-text">
          Venligst besøg denne side fra din computer for at udfylde den. Onboardingen kræver en større
          skærm.
        </p>
      </div>
      <div className="desktop-form">
        <CustomerForm token={token} />
      </div>
    </>
  )
}
