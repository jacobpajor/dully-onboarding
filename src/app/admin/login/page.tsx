'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    setLoading(false)
    if (error) {
      setError('Forkert e-mail eller adgangskode.')
      return
    }
    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">dully.</div>
        <form onSubmit={submit}>
          <div className="login-title">Onboarding Admin</div>
          <p className="login-sub">Log ind for at fortsætte.</p>
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
          <div className="field">
            <label>Adgangskode</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Logger ind...' : 'Log ind'}
          </button>
          {error && <div className="login-error">{error}</div>}
        </form>
      </div>
    </div>
  )
}
