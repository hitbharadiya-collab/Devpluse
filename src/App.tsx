import { useEffect, useState, type FormEvent } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import {
  Activity,
  ArrowRight,
  Fingerprint,
  Lock,
  Mail,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import Dashboard from './Dashboard'
import './App.css'

export type AuthUser = {
  id: string
  email: string
  createdAt?: string
}

const AUTH_BASE = '/api/auth'
const PASSKEY_BASE = '/api/passkeys'

function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true

    async function restoreSession() {
      try {
        const res = await fetch(`${AUTH_BASE}/me`, {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          if (active && data.authenticated && data.user) {
            setUser(data.user)
          }
        }
      } catch {
        // Not logged in yet
      } finally {
        if (active) setCheckingSession(false)
      }
    }

    void restoreSession()
    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting || passkeyLoading) return

    setSubmitting(true)
    setErrorMessage('')

    try {
      const endpoint = mode === 'register' ? `${AUTH_BASE}/register` : `${AUTH_BASE}/login`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success || !data.user) {
        throw new Error(data.message || 'Authentication failed.')
      }

      setUser(data.user)
      setPassword('')
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to authenticate with server.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasskeySignIn = async () => {
    if (!email.trim()) {
      setErrorMessage('Enter your work email above first to sign in with Passkey.')
      return
    }
    if (submitting || passkeyLoading) return

    setPasskeyLoading(true)
    setErrorMessage('')

    try {
      const optRes = await fetch(`${PASSKEY_BASE}/login/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() }),
      })
      const optData = await optRes.json()
      if (!optRes.ok || !optData.success) {
        throw new Error(optData.message || 'Unable to start Passkey sign-in.')
      }

      const credential = await startAuthentication({ optionsJSON: optData.options })

      const verifyRes = await fetch(`${PASSKEY_BASE}/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok || !verifyData.success || !verifyData.user) {
        throw new Error(verifyData.message || 'Passkey verification failed.')
      }

      setUser(verifyData.user)
      setPassword('')
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Passkey authentication cancelled or failed.',
      )
    } finally {
      setPasskeyLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch(`${AUTH_BASE}/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      setUser(null)
    }
  }

  if (checkingSession) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#070d19',
          color: '#cbd5e1',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        Verifying PostgreSQL Session...
      </div>
    )
  }

  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'radial-gradient(circle at top, #131f38 0%, #070d19 65%)',
        padding: '20px',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '18px',
          padding: '28px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Activity size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', margin: 0, fontWeight: 700 }}>DevPulse Enterprise</h1>
            <span style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.06em' }}>
              DEVSECOPS, RBAC & WEBAUTHN CONTROL PLANE
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            background: '#090f1d',
            padding: '5px',
            borderRadius: '11px',
            marginBottom: '20px',
            border: '1px solid #1e293b',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setErrorMessage('')
            }}
            style={{
              padding: '9px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              background: mode === 'login' ? '#6366f1' : 'transparent',
              color: mode === 'login' ? '#fff' : '#94a3b8',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setErrorMessage('')
            }}
            style={{
              padding: '9px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              background: mode === 'register' ? '#6366f1' : 'transparent',
              color: mode === 'register' ? '#fff' : '#94a3b8',
            }}
          >
            Register
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            style={{
              marginBottom: '16px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: '13px',
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>
              Work Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                color="#64748b"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hit@devpulse.io"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '11px 12px 11px 38px',
                  borderRadius: '10px',
                  border: '1px solid #263349',
                  background: '#090f1d',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>
              Password (min 6 characters)
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color="#64748b"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '11px 12px 11px 38px',
                  borderRadius: '10px',
                  border: '1px solid #263349',
                  background: '#090f1d',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || passkeyLoading}
            style={{
              marginTop: '6px',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {mode === 'register' ? <UserPlus size={16} /> : <ShieldCheck size={16} />}
            {submitting
              ? 'Establishing PostgreSQL Session...'
              : mode === 'register'
                ? 'Create Account & Launch'
                : 'Sign In to Workspace'}
            <ArrowRight size={16} />
          </button>

          {mode === 'login' && (
            <button
              type="button"
              disabled={submitting || passkeyLoading}
              onClick={() => void handlePasskeySignIn()}
              style={{
                padding: '11px',
                borderRadius: '10px',
                border: '1px solid #334155',
                cursor: 'pointer',
                background: '#0b1324',
                color: '#e2e8f0',
                fontWeight: 600,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Fingerprint size={16} color="#38bdf8" />
              {passkeyLoading ? 'Verifying Biometric / Key...' : 'Sign In with Hardware Passkey'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

export default App
