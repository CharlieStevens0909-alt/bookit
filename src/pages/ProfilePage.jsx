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
  const [draggingCover, setDraggingCover] = useState(false)
  const [draggingLogo, setDraggingLogo] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const [g1, g2] = getGradient(business.name)

  const displayLogo = logoPreview || business.logo_url
  const displayCover = coverPreview || business.cover_url

  function applyLogo(file) {
    if (!file || !file.type.startsWith('image/')) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function applyCover(file) {
    if (!file || !file.type.startsWith('image/')) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function handleLogoChange(e) { applyLogo(e.target.files[0]) }
  function handleCoverChange(e) { applyCover(e.target.files[0]) }

  function onCoverDragOver(e) { e.preventDefault(); setDraggingCover(true) }
  function onCoverDragLeave(e) { if (!e.currentTarget.contains(e.relatedTarget)) setDraggingCover(false) }
  function onCoverDrop(e) { e.preventDefault(); setDraggingCover(false); applyCover(e.dataTransfer.files[0]) }

  function onLogoDragOver(e) { e.preventDefault(); setDraggingLogo(true) }
  function onLogoDragLeave(e) { if (!e.currentTarget.contains(e.relatedTarget)) setDraggingLogo(false) }
  function onLogoDrop(e) { e.preventDefault(); setDraggingLogo(false); applyLogo(e.dataTransfer.files[0]) }

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
          className={`w-full h-36 relative cursor-pointer group transition-all ${draggingCover ? 'ring-4 ring-indigo-400 ring-inset' : ''}`}
          style={
            displayCover
              ? { backgroundImage: `url(${displayCover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: `linear-gradient(135deg, ${g1}, ${g2})` }
          }
          onClick={() => coverInputRef.current.click()}
          onDragOver={onCoverDragOver}
          onDragLeave={onCoverDragLeave}
          onDrop={onCoverDrop}
        >
          <div className={`absolute inset-0 transition-colors flex items-center justify-center ${draggingCover ? 'bg-black/40' : 'bg-black/0 group-hover:bg-black/30'}`}>
            <div className={`transition-opacity bg-black/50 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 ${draggingCover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {draggingCover ? '⬇️ Drop to upload' : '📷 Change cover photo'}
            </div>
          </div>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
        </div>

        {/* Avatar */}
        <div className="px-5 pb-5">
          <div className="flex items-end gap-4 -mt-10 mb-3">
            <div
              className={`w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden cursor-pointer relative group shrink-0 transition-all ${draggingLogo ? 'ring-4 ring-indigo-400' : ''}`}
              onClick={() => logoInputRef.current.click()}
              onDragOver={onLogoDragOver}
              onDragLeave={onLogoDragLeave}
              onDrop={onLogoDrop}
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
              <div className={`absolute inset-0 transition-colors rounded-full flex items-center justify-center ${draggingLogo ? 'bg-black/50' : 'bg-black/0 group-hover:bg-black/40'}`}>
                <span className={`transition-opacity text-white text-xl ${draggingLogo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  {draggingLogo ? '⬇️' : '📷'}
                </span>
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
        <div
          onClick={() => coverInputRef.current.click()}
          onDragOver={onCoverDragOver}
          onDragLeave={onCoverDragLeave}
          onDrop={onCoverDrop}
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer group
            ${draggingCover ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
        >
          <div className="text-2xl mb-1">🖼️</div>
          <p className={`text-xs font-medium ${draggingCover ? 'text-indigo-600' : 'text-slate-700 group-hover:text-indigo-600'}`}>
            Cover photo
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {draggingCover ? 'Drop to upload' : coverFile ? '✓ Ready to save' : 'Click or drag here'}
          </p>
        </div>

        <div
          onClick={() => logoInputRef.current.click()}
          onDragOver={onLogoDragOver}
          onDragLeave={onLogoDragLeave}
          onDrop={onLogoDrop}
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer group
            ${draggingLogo ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
        >
          <div className="text-2xl mb-1">👤</div>
          <p className={`text-xs font-medium ${draggingLogo ? 'text-indigo-600' : 'text-slate-700 group-hover:text-indigo-600'}`}>
            Profile picture
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {draggingLogo ? 'Drop to upload' : logoFile ? '✓ Ready to save' : 'Click or drag here'}
          </p>
        </div>
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
