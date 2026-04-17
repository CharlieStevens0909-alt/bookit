import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../lib/BusinessContext'
import { useAuth } from '../hooks/useAuth'

const gradients = [
  ['#6366f1','#8b5cf6'],
  ['#3b82f6','#06b6d4'],
  ['#10b981','#14b8a6'],
  ['#f59e0b','#ef4444'],
  ['#ec4899','#8b5cf6'],
]

function getGradient(name) {
  const i = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % gradients.length
  return gradients[i]
}

async function uploadFile(file, path) {
  const { error } = await supabase.storage.from('business-media').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('business-media').getPublicUrl(path)
  return data.publicUrl
}

export default function ProfilePage() {
  const { business, setBusiness } = useBusiness()
  const { user } = useAuth()
  const logoInputRef = useRef()
  const coverInputRef = useRef()

  const [logoPreview, setLogoPreview] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverFile, setCoverFile] = useState(null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const [g1, g2] = getGradient(business.name)

  const displayLogo = logoPreview || business.logo_url
  const displayCover = coverPreview || business.cover_url

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

  async function handleSave() {
    if (!logoFile && !coverFile) return
    setError(null)
    setSaving(true)

    try {
      const updates = {}

      if (logoFile) {
        updates.logo_url = await uploadFile(logoFile, `${user.id}/logo-${Date.now()}`)
      }
      if (coverFile) {
        updates.cover_url = await uploadFile(coverFile, `${user.id}/cover-${Date.now()}`)
      }

      const { data, error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', business.id)
        .select()
        .single()

      if (error) throw error

      setBusiness(data)
      setLogoFile(null)
      setCoverFile(null)
      setLogoPreview(null)
      setCoverPreview(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message)
    }

    setSaving(false)
  }

  const hasChanges = logoFile || coverFile

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Profile photos</h1>
        <p className="text-slate-500 text-sm mt-0.5">Update the cover and profile picture on your booking page</p>
      </div>

      {/* Live preview */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5">
        {/* Cover */}
        <div
          className="w-full h-36 relative cursor-pointer group"
          style={
            displayCover
              ? { backgroundImage: `url(${displayCover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: `linear-gradient(135deg, ${g1}, ${g2})` }
          }
          onClick={() => coverInputRef.current.click()}
        >
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
              📷 Change cover photo
            </div>
          </div>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
        </div>

        {/* Avatar */}
        <div className="px-5 pb-5">
          <div className="flex items-end gap-4 -mt-10 mb-3">
            <div
              className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden cursor-pointer relative group shrink-0"
              onClick={() => logoInputRef.current.click()}
            >
              {displayLogo ? (
                <img src={displayLogo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
                  style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
                >
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-full flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xl">📷</span>
              </div>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>

          <p className="font-bold text-slate-900 text-base">{business.name}</p>
          <p className="text-sm text-slate-500">{[business.type, business.location].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-5 text-center">
        Click the cover or profile picture to upload a new photo
      </p>

      {/* Upload instructions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => coverInputRef.current.click()}
          className="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl p-4 text-center transition-colors group"
        >
          <div className="text-2xl mb-1">🖼️</div>
          <p className="text-xs font-medium text-slate-700 group-hover:text-indigo-600">Cover photo</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {coverFile ? '✓ Ready to save' : business.cover_url ? 'Click to change' : 'Click to upload'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => logoInputRef.current.click()}
          className="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl p-4 text-center transition-colors group"
        >
          <div className="text-2xl mb-1">👤</div>
          <p className="text-xs font-medium text-slate-700 group-hover:text-indigo-600">Profile picture</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {logoFile ? '✓ Ready to save' : business.logo_url ? 'Click to change' : 'Click to upload'}
          </p>
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save photos'}
        </button>
        {hasChanges && !saving && (
          <button
            onClick={() => {
              setLogoFile(null); setLogoPreview(null)
              setCoverFile(null); setCoverPreview(null)
            }}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            Discard changes
          </button>
        )}
        {saved && <p className="text-sm text-green-600 font-medium">Saved!</p>}
      </div>
    </div>
  )
}
