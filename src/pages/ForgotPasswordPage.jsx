import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <div className="text-3xl mb-3">✉️</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Check your email</h2>
          <p className="text-slate-500 text-sm">
            We sent a password reset link to <strong>{email}</strong>.
          </p>
          <Link to="/login" className="mt-4 inline-block text-indigo-600 text-sm hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
          <p className="text-slate-500 text-sm mt-1">Enter your email and we'll send a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="text-sm text-slate-500 mt-5 text-center">
          Remember it?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}
