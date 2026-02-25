import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../components/AuthProvider'

function AuthPage() {
  const { user, loading, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
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
      }
    } catch (err: any) {
      setError(err.message ?? 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-300">
        Checking the wards around the archive...
      </div>
    )
  }

  if (user) {
    return (
      <div className="mx-auto max-w-md px-4 py-8 text-sm text-slate-200">
        <h1 className="font-gothic text-2xl font-semibold text-amber-400">
          You are inside the stacks.
        </h1>
        <p className="mt-2 text-xs text-slate-400">
          Signed in as <span className="font-mono text-slate-200">{user.email}</span>.
        </p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-700 bg-slate-950/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 hover:border-amber-500 hover:text-amber-300"
            onClick={() => navigate('/submit')}
          >
            Submit a creature
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-800 bg-black/80 px-4 py-2 text-xs text-slate-300 hover:border-red-500 hover:text-red-300"
            onClick={() => {
              void signOut().then(() => navigate('/'))
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="font-gothic text-2xl font-semibold text-amber-400">
        Enter the archive
      </h1>
      <p className="mt-1 text-xs text-slate-400">
        Create an account or sign in to submit new creatures and local legends.
      </p>
      <div className="mt-4 flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`flex-1 rounded-lg border px-3 py-1.5 ${
            mode === 'signin'
              ? 'border-amber-500 bg-amber-500/10 text-amber-200'
              : 'border-slate-700 bg-slate-950/70 text-slate-300'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 rounded-lg border px-3 py-1.5 ${
            mode === 'signup'
              ? 'border-amber-500 bg-amber-500/10 text-amber-200'
              : 'border-slate-700 bg-slate-950/70 text-slate-300'
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
        <div>
          <label className="mb-1 block text-slate-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-slate-300" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-lg border border-amber-500 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
        >
          {submitting
            ? mode === 'signin'
              ? 'Signing in...'
              : 'Creating account...'
            : mode === 'signin'
              ? 'Sign in'
              : 'Sign up'}
        </button>
      </form>
    </div>
  )
}

export default AuthPage

