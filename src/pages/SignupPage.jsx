import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PageNav from '../components/PageNav'

export default function SignupPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      navigate(role === 'customer' ? '/my-bookings' : '/onboarding')
    } else {
      setConfirmSent(true)
    }

    setLoading(false)
  }

  if (confirmSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <div className="text-3xl mb-3">✉️</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Check your email</h2>
          <p className="text-slate-500 text-sm">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <Link to="/login" className="mt-4 inline-block text-indigo-600 text-sm hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageNav />
      <div className="flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">BookIt</h1>
          <p className="text-slate-500 text-sm mt-1">Create your account</p>
        </div>

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRole('business')}
            className={`bg-white border-2 rounded-xl p-4 text-left transition-all ${
              role === 'business'
                ? 'border-indigo-600 shadow-sm'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-2xl mb-2">🏪</div>
            <p className={`text-sm font-semibold ${role === 'business' ? 'text-indigo-700' : 'text-slate-900'}`}>
              I'm a business
            </p>
            <p className="text-xs text-slate-400 mt-0.5 leading-snug">
              Set up a booking page and accept appointments
            </p>
          </button>

          <button
            type="button"
            onClick={() => setRole('customer')}
            className={`bg-white border-2 rounded-xl p-4 text-left transition-all ${
              role === 'customer'
                ? 'border-indigo-600 shadow-sm'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-2xl mb-2">👤</div>
            <p className={`text-sm font-semibold ${role === 'customer' ? 'text-indigo-700' : 'text-slate-900'}`}>
              I'm a customer
            </p>
            <p className="text-xs text-slate-400 mt-0.5 leading-snug">
              Book services and manage your appointments
            </p>
          </button>
        </div>

        {/* Form — shown once role is selected */}
        {role && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading
                  ? 'Creating account...'
                  : role === 'business'
                  ? 'Create business account'
                  : 'Create customer account'}
              </button>
            </form>
          </div>
        )}

        <p className="text-sm text-slate-500 mt-5 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
      </div>
    </div>
  )
}
