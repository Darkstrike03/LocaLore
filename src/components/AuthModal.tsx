import type { FormEvent } from 'react'
import { useState, useEffect } from 'react'
import { Eye, EyeOff, X, User, Scroll } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AuthModal() {
  const { authModalOpen, closeAuthModal, signIn, signUp, signInWithGoogle, user } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [signupDone, setSignupDone] = useState(false)

  // Close modal when user signs in
  useEffect(() => {
    if (user && authModalOpen) {
      closeAuthModal()
    }
  }, [user, authModalOpen, closeAuthModal])

  // Close on Escape
  useEffect(() => {
    if (!authModalOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAuthModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [authModalOpen, closeAuthModal])

  // Reset state when modal closes
  useEffect(() => {
    if (!authModalOpen) {
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setError(null)
      setSubmitting(false)
      setSignupDone(false)
      setMode('signin')
    }
  }, [authModalOpen])

  if (!authModalOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setSignupDone(true)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-void/80 backdrop-blur-sm p-4 animate-rise"
      onClick={(e) => { if (e.target === e.currentTarget) closeAuthModal() }}
      role="dialog"
      aria-modal="true"
      aria-label="Authentication"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-app-border bg-app-surface shadow-void-deep">

        {/* Close button */}
        <button
          type="button"
          aria-label="Close"
          onClick={closeAuthModal}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-parchment-muted transition hover:text-gold hover:bg-gold/10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-8">
          {/* Eye glyph */}
          <div className="mb-6 flex flex-col items-center gap-2">
            <span className="relative flex h-14 w-14 items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-gold/30 animate-glow-pulse" />
              <span className="absolute inset-2 rounded-full bg-app-background" />
              <Eye className="relative h-6 w-6 text-gold drop-shadow-gold" />
            </span>
            <h2 className="font-heading text-lg tracking-[0.2em] text-parchment">
              {signupDone ? 'Bound to the Archive' : mode === 'signin' ? 'Enter the Archive' : 'Claim Your Name'}
            </h2>
            <div className="rune-divider w-20" />
          </div>

          {/* Sign-up confirmation */}
          {signupDone ? (
            <div className="text-center space-y-4">
              <p className="font-body text-parchment-muted text-sm leading-relaxed">
                A confirmation has been sent to <span className="text-gold">{email}</span>.<br />
                Verify your pact before entering.
              </p>
              <button
                type="button"
                onClick={closeAuthModal}
                className="btn-summon w-full"
              >
                <Scroll className="h-4 w-4" />
                Understood
              </button>
            </div>
          ) : (
            <>
              {/* Tab toggle */}
              <div className="mb-6 flex rounded-lg border border-app-border p-0.5">
                {(['signin', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setError(null) }}
                    className={`flex-1 rounded-md py-2 text-[11px] font-ui uppercase tracking-[0.2em] transition-all duration-200 ${
                      mode === m
                        ? 'bg-gold/10 text-gold border border-gold/25'
                        : 'text-parchment-muted hover:text-parchment'
                    }`}
                  >
                    {m === 'signin' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 rounded-lg border border-crimson/40 bg-crimson/10 px-4 py-3 text-sm text-crimson font-ui">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="auth-email" className="mb-1.5 block text-[11px] font-ui uppercase tracking-[0.15em] text-parchment-muted">
                    Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-forge w-full"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="auth-password" className="mb-1.5 block text-[11px] font-ui uppercase tracking-[0.15em] text-parchment-muted">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-forge w-full pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment-muted hover:text-gold transition-colors"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label htmlFor="auth-confirm" className="mb-1.5 block text-[11px] font-ui uppercase tracking-[0.15em] text-parchment-muted">
                      Confirm Password
                    </label>
                    <input
                      id="auth-confirm"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-forge w-full"
                      placeholder="••••••••"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-summon w-full disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <User className="h-4 w-4" />
                  {submitting
                    ? 'Communing...'
                    : mode === 'signin'
                    ? 'Enter the Archive'
                    : 'Seal the Pact'}
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
                onClick={() => { void signInWithGoogle() }}
                className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-app-border bg-app-background py-2.5 font-ui text-xs uppercase tracking-[0.15em] text-parchment transition hover:border-gold/40 hover:text-gold"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
