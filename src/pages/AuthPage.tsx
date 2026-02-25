import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogOut, Scroll, User } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../components/AuthProvider'

function AuthPage() {
  const { user, loading, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [signupDone, setSignupDone] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/submit')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSignupDone(true)
      }
    } catch (err: any) {
      setError(err.message ?? 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-gold/30 animate-glow-pulse" />
            <Eye className="h-5 w-5 text-gold animate-flicker" />
          </span>
          <p className="font-heading text-xs uppercase tracking-[0.3em] text-parchment-muted">
            Checking the wards...
          </p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 animate-rise">
        <div className="w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-8 shadow-void-deep text-center">
          {/* Eye icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-app-background shadow-gold-glow">
            <User className="h-7 w-7 text-gold" />
          </div>
          <h1 className="font-heading text-2xl text-gold">You are inside the stacks.</h1>
          <p className="mt-2 font-body text-base text-parchment-muted">
            Signed in as{' '}
            <span className="font-ui text-sm text-parchment">{user.email}</span>.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              className="btn-summon w-full"
              onClick={() => navigate('/submit')}
            >
              <Scroll className="h-3.5 w-3.5" />
              Submit a creature
            </button>
            <button
              type="button"
              className="btn-ghost w-full text-crimson-DEFAULT/80 border-crimson/30 hover:border-crimson/60 hover:text-crimson"
              onClick={() => { void signOut().then(() => navigate('/')) }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Leave the archive
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (signupDone) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 animate-rise">
        <div className="w-full max-w-md rounded-2xl border border-gold/30 bg-app-surface p-8 shadow-gold-glow text-center">
          <Eye className="mx-auto mb-4 h-8 w-8 text-gold" />
          <h1 className="font-heading text-xl text-gold">Account created.</h1>
          <p className="mt-2 font-body text-sm text-parchment-muted">
            Check your email to confirm your initiation. Once confirmed, you may enter.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10 animate-rise">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-app-surface shadow-gold-glow">
            <Eye className="h-7 w-7 text-gold" />
          </div>
          <h1 className="font-heading text-2xl text-gold">
            {mode === 'signin' ? 'Enter the archive' : 'Seek initiation'}
          </h1>
          <p className="mt-1.5 font-body text-sm text-parchment-muted">
            {mode === 'signin'
              ? 'Sign in to submit sightings and expand the bestiary.'
              : 'Create an account to begin filing creature accounts.'}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="mb-5 flex rounded-lg border border-app-border bg-app-surface p-1">
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null) }}
              className={`flex-1 rounded-md py-2 font-ui text-xs uppercase tracking-[0.2em] transition-all duration-200 ${
                mode === m
                  ? 'bg-gold/10 text-gold border border-gold/30'
                  : 'text-parchment-muted hover:text-parchment'
              }`}
            >
              {m === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block font-ui text-[11px] uppercase tracking-[0.2em] text-parchment-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-forge"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block font-ui text-[11px] uppercase tracking-[0.2em] text-parchment-muted">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-forge pr-10"
                placeholder="············"
              />
              <button
                type="button"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment-dim hover:text-parchment transition-colors"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-crimson/40 bg-crimson-dark/20 px-3 py-2.5">
              <p className="font-ui text-xs text-crimson-DEFAULT/90">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-summon mt-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? (mode === 'signin' ? 'Opening the gate...' : 'Inscribing your name...')
              : (mode === 'signin' ? 'Enter' : 'Request initiation')}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-xs italic text-parchment-dim">
          All who enter leave a trace in the archive.
        </p>
      </div>
    </div>
  )
}

export default AuthPage

