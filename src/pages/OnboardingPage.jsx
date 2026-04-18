import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import PageNav from '../components/PageNav'
import { geocodeAddress } from '../lib/geocode'

const BUSINESS_TYPES = [
  'Barbershop', 'Personal trainer', 'Tutor', 'Therapist',
  'Nail technician', 'Dog groomer', 'Hair salon', 'Massage therapist', 'Other',
]

function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-')
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

async function uploadFile(file, path) {
  const { error } = await supabase.storage.from('business-media').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('business-media').getPublicUrl(path)
  return data.publicUrl
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const logoInputRef = useRef()
  const coverInputRef = useRef()

  const [form, setForm] = useState({ name: '', type: '', location: '', postcode: '', description: '', phone: '' })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [slugPreview, setSlugPreview] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setSlugPreview(generateSlug(form.name)) }, [form.name])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleLogoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function handleCoverChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const slug = await getUniqueSlug(generateSlug(form.name))

      let logo_url = null
      let cover_url = null

      if (logoFile) {
        logo_url = await uploadFile(logoFile, `${user.id}/logo-${Date.now()}`)
      }
      if (coverFile) {
        cover_url = await uploadFile(coverFile, `${user.id}/cover-${Date.now()}`)
      }

      const coords = await geocodeAddress(form.postcode)
      if (!coords) {
        setError("We couldn't find that postcode. Please double-check it and try again.")
        setLoading(false)
        return
      }

      const { error } = await supabase.from('businesses').insert({
        user_id: user.id,
        name: form.name,
        type: form.type,
        location: form.location,
        address: form.postcode.trim().toUpperCase(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        description: form.description,
        phone: form.phone || null,
        slug,
        logo_url,
        cover_url,
      })

      if (error) throw error
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  // Gradient for avatar preview fallback
  const gradients = [['#6366f1','#8b5cf6'],['#3b82f6','#06b6d4'],['#10b981','#14b8a6'],['#f59e0b','#ef4444'],['#ec4899','#8b5cf6']]
  const gi = form.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % gradients.length
  const [g1, g2] = gradients[gi]

  return (
    <div className="min-h-screen bg-slate-50">
      <PageNav />
      <div className="px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <p className="text-indigo-600 font-medium text-sm mb-1">Setup</p>
          <h1 className="text-2xl font-bold text-slate-900">Set up your business</h1>
          <p className="text-slate-500 text-sm mt-1">This is what customers see on your booking page</p>
        </div>

        {/* Live profile preview */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
          {/* Cover */}
          <div
            className="w-full h-28 relative cursor-pointer group"
            style={
              coverPreview
                ? { backgroundImage: `url(${coverPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: `linear-gradient(135deg, ${g1}, ${g2})` }
            }
            onClick={() => coverInputRef.current.click()}
          >
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/40 px-3 py-1 rounded-full transition-opacity">
                Upload cover photo
              </span>
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          </div>

          {/* Avatar + name */}
          <div className="px-4 pb-4">
            <div className="flex items-end gap-3 -mt-8 mb-2">
              <div
                className="w-16 h-16 rounded-full border-4 border-white shadow overflow-hidden cursor-pointer group relative shrink-0"
                onClick={() => logoInputRef.current.click()}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white text-xl font-bold"
                    style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
                  >
                    {form.name ? form.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors rounded-full flex items-center justify-center">
                  <span className="opacity-0 hover:opacity-100 text-white text-lg transition-opacity">📷</span>
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </div>
            </div>
            <p className="font-bold text-slate-900">{form.name || 'Your business name'}</p>
            <p className="text-xs text-slate-500">{[form.type, form.location].filter(Boolean).join(' · ') || 'Type · Location'}</p>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center mb-5">
          Click the cover or profile picture above to upload photos
        </p>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Business name</label>
              <input
                type="text" name="name" required value={form.name} onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {slugPreview && (
                <p className="text-xs text-slate-400 mt-1">
                  Booking page: <span className="text-slate-600 font-medium">bookit.app/book/{slugPreview}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Business type</label>
              <select
                name="type" required value={form.type} onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">Select a type...</option>
                {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Town / City</label>
              <input
                type="text" name="location" required value={form.location} onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Postcode</label>
              <input
                type="text" name="postcode" required value={form.postcode} onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
              />
              <p className="text-xs text-slate-400 mt-1">Used to show your business in location-based searches</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone number <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="tel" name="phone" value={form.phone} onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Short description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                name="description" value={form.description} onChange={handleChange} rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Setting up...' : 'Continue to dashboard →'}
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  )
}
