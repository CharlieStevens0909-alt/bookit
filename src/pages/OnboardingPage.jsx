import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const BUSINESS_TYPES = [
  'Barbershop',
  'Personal trainer',
  'Tutor',
  'Therapist',
  'Nail technician',
  'Dog groomer',
  'Hair salon',
  'Massage therapist',
  'Other',
]

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

async function getUniqueSlug(baseSlug) {
  const { data } = await supabase.from('businesses').select('slug').eq('slug', baseSlug)
  if (!data || data.length === 0) return baseSlug

  for (let i = 2; i <= 99; i++) {
    const candidate = `${baseSlug}-${i}`
    const { data: existing } = await supabase.from('businesses').select('slug').eq('slug', candidate)
    if (!existing || existing.length === 0) return candidate
  }

  return `${baseSlug}-${Date.now()}`
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({
    name: '',
    type: '',
    location: '',
    description: '',
  })
  const [slugPreview, setSlugPreview] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSlugPreview(generateSlug(form.name))
  }, [form.name])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const baseSlug = generateSlug(form.name)
    const slug = await getUniqueSlug(baseSlug)

    const { error } = await supabase.from('businesses').insert({
      user_id: user.id,
      name: form.name,
      type: form.type,
      location: form.location,
      description: form.description,
      slug,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <p className="text-indigo-600 font-medium text-sm mb-1">Step 1 of 1</p>
          <h1 className="text-2xl font-bold text-slate-900">Set up your business</h1>
          <p className="text-slate-500 text-sm mt-1">This is what customers will see on your booking page</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Business name</label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g. Jim's Barber"
              />
              {slugPreview && (
                <p className="text-xs text-slate-400 mt-1">
                  Your booking page: <span className="text-slate-600 font-medium">bookit.app/book/{slugPreview}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Business type</label>
              <select
                name="type"
                required
                value={form.type}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">Select a type...</option>
                {BUSINESS_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input
                type="text"
                name="location"
                required
                value={form.location}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g. Greenock, Inverclyde"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Short description
                <span className="text-slate-400 font-normal ml-1">(optional)</span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="A short intro shown on your booking page"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Setting up...' : 'Continue to dashboard →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
