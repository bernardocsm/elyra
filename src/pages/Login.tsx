import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

type Mode = 'signin' | 'signup'

export default function Login() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success('Account created! Signing you in...')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-page flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="text-3xl select-none">🌿</span>
            <span className="text-2xl font-semibold text-text-dark-primary tracking-tight">eden</span>
          </div>
          <p className="text-sm text-text-dark-secondary mt-1">
            {mode === 'signup' ? 'Create your workspace' : 'Welcome back'}
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-background-main rounded-2xl border border-divider p-6 shadow-sm space-y-4"
        >
          <div className="space-y-1">
            <label className="block text-xs font-medium text-text-dark-secondary">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-lg border border-divider text-sm text-text-dark-primary bg-background-faint focus:outline-none focus:ring-2 focus:ring-accent-eden/20 focus:border-accent-eden transition-colors placeholder:text-text-dark-secondary/50"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-text-dark-secondary">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              className="w-full px-3 py-2 rounded-lg border border-divider text-sm text-text-dark-primary bg-background-faint focus:outline-none focus:ring-2 focus:ring-accent-eden/20 focus:border-accent-eden transition-colors placeholder:text-text-dark-secondary/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-2.5 rounded-full bg-accent-eden text-white text-sm font-medium hover:bg-accent-primary active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            {loading
              ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
                </span>
              )
              : mode === 'signup' ? 'Create account' : 'Sign in'
            }
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-xs text-text-dark-secondary mt-4">
          {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
            className="text-accent-eden hover:text-accent-primary hover:underline font-medium transition-colors"
          >
            {mode === 'signup' ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}
