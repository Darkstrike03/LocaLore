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

        {/* Divider */}
        <div className="relative my-5 flex items-center">
          <div className="flex-1 border-t border-app-border" />
          <span className="mx-3 font-ui text-[10px] uppercase tracking-[0.2em] text-parchment-muted">or</span>
          <div className="flex-1 border-t border-app-border" />
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={() => { void supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }) }}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-app-border bg-app-surface py-2.5 font-ui text-xs uppercase tracking-[0.15em] text-parchment transition hover:border-gold/40 hover:text-gold"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-center font-body text-xs italic text-parchment-dim">
          All who enter leave a trace in the archive.
        </p>
      </div>
    </div>
  )
}

export default AuthPage

