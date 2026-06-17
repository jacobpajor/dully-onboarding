'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const clean = email.trim().toLowerCase()
    if (!clean.endsWith('@dully.io')) {
      setError('Brug din @dully.io e-mail.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">dully.</div>
        {sent ? (
          <>
            <div className="login-title">Tjek din mail ✉️</div>
            <p className="login-success">
              Vi har sendt et login-link til <strong>{email}</strong>. Åbn linket på denne enhed for at
              logge ind.
            </p>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="login-title">Onboarding Admin</div>
            <p className="login-sub">Log ind med din Dully-mail for at fortsætte.</p>
            <div className="field">
              <label>E-mail</label>
              <input
                type="email"
                placeholder="dig@dully.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Sender...' : 'Send login-link'}
            </button>
            {error && <div className="login-error">{error}</div>}
          </form>
        )}
      </div>
    </div>
  )
}
