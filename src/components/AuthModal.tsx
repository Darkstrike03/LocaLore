import type { FormEvent } from 'react'
import { useState, useEffect } from 'react'
import { Eye, EyeOff, X, User, Scroll } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AuthModal() {
  const { authModalOpen, closeAuthModal, signIn, signUp, user } = useAuth()
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
