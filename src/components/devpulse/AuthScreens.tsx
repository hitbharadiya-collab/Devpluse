import { useState, type FormEvent } from 'react'
import { Activity, ArrowRight, KeyRound, Lock, ShieldCheck } from 'lucide-react'

interface LoginScreenProps {
  onLoginSuccess: (email: string) => void
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('hit.bharadiya@devpulse.io')
  const [password, setPassword] = useState('••••••••••••')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.includes('@') || password.length < 4) {
      setError('Enter a valid enterprise email and security credential.')
      return
    }
    setError('')
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onLoginSuccess(email)
    }, 350)
  }

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-2xl bg-[#0c101a] border border-slate-800/90 p-8 shadow-2xl relative z-10">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-600/25">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">DevPulse</h1>
            <p className="text-xs text-slate-400">Enterprise DevOps & DevSecOps Control Plane</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-white mb-1">Sign in to Workspace</h2>
        <p className="text-xs text-slate-400 mb-6">
          Authenticate via SSO or enterprise credentials to access pipelines and security telemetry.
        </p>

        {error && (
          <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Work Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090f] border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="name@company.io"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090f] border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Continue to Security Verification'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> SOC2 Type II & ISO 27001
          </span>
          <span>TLS 1.3 Enforced</span>
        </div>
      </div>
    </div>
  )
}

interface SecurityPinScreenProps {
  userEmail: string
  onVerified: () => void
  onSkip: () => void
}

export function SecurityPinScreen({ userEmail, onVerified, onSkip }: SecurityPinScreenProps) {
  const [digits, setDigits] = useState(['4', '8', '2', '9', '1', '0'])
  const [error, setError] = useState('')

  const handleDigitChange = (idx: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = clean
    setDigits(next)
  }

  const handleVerify = (e: FormEvent) => {
    e.preventDefault()
    if (digits.join('').length !== 6) {
      setError('Enter all 6 digits of your organization Security PIN.')
      return
    }
    setError('')
    onVerified()
  }

  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-[#0c101a] border border-slate-800 p-8 shadow-2xl">
        <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5">
          <KeyRound className="w-5 h-5" />
        </div>

        <h2 className="text-lg font-bold text-white">Security PIN Verification</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          Step-up verification for <span className="text-slate-200 font-medium">{userEmail}</span> before accessing
          production deployment controls.
        </p>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div className="grid grid-cols-6 gap-2.5 mb-6">
            {digits.map((d, idx) => (
              <input
                key={idx}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                className="h-12 text-center font-mono text-lg font-bold rounded-lg bg-[#07090f] border border-slate-700 text-cyan-300 focus:outline-none focus:border-blue-500"
              />
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" /> Unlock DevSecOps Console
          </button>
        </form>

        <button
          type="button"
          onClick={onSkip}
          className="w-full mt-3 py-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          Skip optional PIN (Read-only session)
        </button>
      </div>
    </div>
  )
}
