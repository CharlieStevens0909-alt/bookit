import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../lib/BusinessContext'
import { useAuth } from '../hooks/useAuth'
import { geocodeAddress } from '../lib/geocode'

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

function CompletionBar({ business, form }) {
  const steps = [
    { label: 'Profile photo', done: !!(business.logo_url) },
    { label: 'Cover photo', done: !!(business.cover_url) },
    { label: 'Business name', done: !!form.name.trim() },
    { label: 'Address', done: !!form.address.trim() },
    { label: 'Phone number', done: !!form.phone.trim() },
    { label: 'Bio', done: !!form.bio.trim() },
    { label: 'Social / website', done: !!(form.instagram.trim() || form.facebook.trim() || form.website.trim()) },
    { label: 'Notice board', done: !!form.notice.trim() },
  ]
  const done = steps.filter(s => s.done).length
  const pct = Math.round((done / steps.length) * 100)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-700">Profile completeness</p>
        <span className={`text-sm font-bold ${pct === 100 ? 'text-green-600' : pct >= 60 ? 'text-indigo-600' : 'text-amber-500'}`}>{pct}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct >= 60 ? 'bg-indigo-500' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.map(s => (
          <span key={s.label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.done ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
            {s.done ? '✓' : '○'} {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { business, setBusiness } = useBusiness()
  const { user } = useAuth()
  const logoInputRef = useRef()
  const coverInputRef = useRef()
  const noticeImageRef = useRef()

  const [logoPreview, setLogoPreview] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [draggingCover, setDraggingCover] = useState(false)
  const [draggingLogo, setDraggingLogo] = useState(false)

  const [form, setForm] = useState({
    name: business.name || '',
    type: business.type || '',
    bio: business.bio || '',
    address: business.address || '',
    phone: business.phone || '',
    website: business.website || '',
    instagram: business.instagram || '',
    facebook: business.facebook || '',
    notice: business.notice || '',
  })

  const [noticeImageUrl, setNoticeImageUrl] = useState(business.notice_image_url || '')
  const [noticeImageFile, setNoticeImageFile] = useState(null)
  const [noticeImagePreview, setNoticeImagePreview] = useState(null)
  const [tempStart, setTempStart] = useState(business.temp_closure_start || '')
  const [tempEnd, setTempEnd] = useState(business.temp_closure_end || '')

  const [gallery, setGallery] = useState([])
  const [galleryUploading, setGalleryUploading] = useState(false)
  const galleryInputRef = useRef()

  useEffect(() => {
    if (!business) return
    supabase.from('business_photos').select('*').eq('business_id', business.id).order('sort_order')
      .then(({ data }) => setGallery(data || []))
  }, [business])

  async function handleGalleryUpload(files) {
    if (!files?.length) return
    setGalleryUploading(true)
    const uploads = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const url = await uploadFile(file, `${user.id}/gallery-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      const { data } = await supabase.from('business_photos')
        .insert({ business_id: business.id, url, sort_order: gallery.length + uploads.length })
        .select().single()
      if (data) uploads.push(data)
    }
    setGallery(prev => [...prev, ...uploads])
    setGalleryUploading(false)
  }

  async function deleteGalleryPhoto(id) {
    await supabase.from('business_photos').delete().eq('id', id)
    setGallery(prev => prev.filter(p => p.id !== id))
  }

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const [g1, g2] = getGradient(form.name || business.name)
  const displayLogo = logoPreview || business.logo_url
  const displayCover = coverPreview || business.cover_url

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  function applyLogo(file) {
    if (!file || !file.type.startsWith('image/')) return
    setLogoFile(file); setLogoPreview(URL.createObjectURL(file))
  }
  function applyCover(file) {
    if (!file || !file.type.startsWith('image/')) return
    setCoverFile(file); setCoverPreview(URL.createObjectURL(file))
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
    if (!form.name.trim()) { setError('Business name is required.'); return }
    if (!form.address.trim()) { setError('Address is required.'); return }
    if (tempStart && tempEnd && tempEnd < tempStart) { setError('Closure end date must be after start date.'); return }
    setError(null)
    setSaving(true)

    try {
      const updates = {}

      if (logoFile) updates.logo_url = await uploadFile(logoFile, `${user.id}/logo-${Date.now()}`)
      if (coverFile) updates.cover_url = await uploadFile(coverFile, `${user.id}/cover-${Date.now()}`)
      if (noticeImageFile) {
        updates.notice_image_url = await uploadFile(noticeImageFile, `${user.id}/notice-${Date.now()}`)
      } else {
        updates.notice_image_url = noticeImageUrl || null
      }

      updates.name = form.name.trim()
      updates.type = form.type.trim() || null
      updates.bio = form.bio.trim() || null
      updates.phone = form.phone.trim() || null
      updates.address = form.address.trim()
      updates.website = form.website.trim() || null
      updates.instagram = form.instagram.trim() || null
      updates.facebook = form.facebook.trim() || null
      updates.notice = form.notice.trim() || null
      updates.temp_closure_start = tempStart || null
      updates.temp_closure_end = tempEnd || null

      if (form.address.trim() !== (business.address || '')) {
        const coords = await geocodeAddress(form.address.trim())
        if (!coords) {
          setError("We couldn't find that address or postcode. Please double-check it.")
          setSaving(false)
          return
        }
        updates.latitude = coords.latitude
        updates.longitude = coords.longitude
      }

      const { data, error } = await supabase.from('businesses').update(updates).eq('id', business.id).select().single()
      if (error) throw error

      setBusiness(data)
      setLogoFile(null); setCoverFile(null); setNoticeImageFile(null)
      setLogoPreview(null); setCoverPreview(null); setNoticeImagePreview(null)
      setNoticeImageUrl(data.notice_image_url || '')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message)
    }

    setSaving(false)
  }

  const today = new Date().toISOString().split('T')[0]
  const closureActive = tempStart && tempEnd && today >= tempStart && today <= tempEnd
  const closureUpcoming = tempStart && tempEnd && today < tempStart

  const inputClass = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your public booking page</p>
      </div>

      {/* Completeness bar */}
      <CompletionBar business={business} form={form} />

      {/* Photos */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 pt-4 pb-2 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">Photos</p>
          <p className="text-xs text-slate-400 mt-0.5">Click the cover or profile picture to upload</p>
        </div>

        <div
          className={`w-full h-36 relative cursor-pointer group transition-all ${draggingCover ? 'ring-4 ring-indigo-400 ring-inset' : ''}`}
          style={displayCover ? { backgroundImage: `url(${displayCover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `linear-gradient(135deg, ${g1}, ${g2})` }}
          onClick={() => coverInputRef.current.click()}
          onDragOver={onCoverDragOver} onDragLeave={onCoverDragLeave} onDrop={onCoverDrop}
        >
          <div className={`absolute inset-0 transition-colors flex items-center justify-center ${draggingCover ? 'bg-black/40' : 'bg-black/0 group-hover:bg-black/30'}`}>
            <div className={`transition-opacity bg-black/50 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 ${draggingCover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {draggingCover ? '⬇ Drop to upload' : '📷 Change cover photo'}
            </div>
          </div>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
        </div>

        <div className="px-5 pb-5">
          <div className="flex items-end gap-4 -mt-10 mb-3">
            <div
              className={`w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden cursor-pointer relative group shrink-0 ${draggingLogo ? 'ring-4 ring-indigo-400' : ''}`}
              onClick={() => logoInputRef.current.click()}
              onDragOver={onLogoDragOver} onDragLeave={onLogoDragLeave} onDrop={onLogoDrop}
            >
              {displayLogo ? (
                <img src={displayLogo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                  {(form.name || business.name).charAt(0).toUpperCase()}
                </div>
              )}
              <div className={`absolute inset-0 transition-colors rounded-full flex items-center justify-center ${draggingLogo ? 'bg-black/50' : 'bg-black/0 group-hover:bg-black/40'}`}>
                <span className={`transition-opacity text-white text-xl ${draggingLogo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{draggingLogo ? '⬇' : '📷'}</span>
              </div>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            <div>
              <p className="font-bold text-slate-900">{form.name || business.name}</p>
              <p className="text-sm text-slate-500">{[form.type, business.location].filter(Boolean).join(' · ')}</p>
              {(logoFile || coverFile) && <p className="text-xs text-indigo-600 mt-0.5">Unsaved photo changes</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Photo gallery</p>
            <p className="text-xs text-slate-400 mt-0.5">Extra photos shown on your booking page</p>
          </div>
          {gallery.length > 0 && (
            <span className="text-xs text-slate-400">{gallery.length} photo{gallery.length > 1 ? 's' : ''}</span>
          )}
        </div>

        {gallery.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {gallery.map(photo => (
              <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200">
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <button
                    onClick={() => deleteGalleryPhoto(photo.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white text-xs px-2.5 py-1 rounded-lg font-medium">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleGalleryUpload(e.target.files)}
        />
        <button
          onClick={() => galleryInputRef.current.click()}
          disabled={galleryUploading}
          className="w-full border-2 border-dashed border-slate-200 rounded-xl py-4 text-sm text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors disabled:opacity-50">
          {galleryUploading ? 'Uploading...' : '+ Add photos'}
        </button>
      </div>

      {/* Business identity */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-700">Business identity</p>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Business name</label>
          <input type="text" value={form.name} onChange={set('name')} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            Business type <span className="text-slate-300 normal-case font-normal">(optional)</span>
          </label>
          <input type="text" value={form.type} onChange={set('type')} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            Bio <span className="text-slate-300 normal-case font-normal">(optional)</span>
          </label>
          <textarea value={form.bio} onChange={set('bio')} rows={3}
            className={`${inputClass} resize-y`} />
          <p className="text-xs text-slate-400 mt-1">Shown under your business name on the booking page</p>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-700">Contact & location</p>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Address</label>
          <input type="text" value={form.address} onChange={set('address')} className={inputClass} />
          <p className="text-xs text-slate-400 mt-1">Required — used for location-based searches</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            Phone <span className="text-slate-300 normal-case font-normal">(optional)</span>
          </label>
          <input type="tel" value={form.phone} onChange={set('phone')} className={inputClass} />
          <p className="text-xs text-slate-400 mt-1">Shown on your public booking page</p>
        </div>
      </div>

      {/* Social links */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Social & website</p>
          <p className="text-xs text-slate-400 mt-0.5">Links shown on your booking page</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Website</label>
          <input type="url" value={form.website} onChange={set('website')} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Instagram</label>
          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
            <span className="px-3 py-2 text-sm text-slate-400 bg-slate-50 border-r border-slate-300 shrink-0">instagram.com/</span>
            <input type="text" value={form.instagram} onChange={set('instagram')}
              className="flex-1 px-3 py-2 text-sm focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Facebook</label>
          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
            <span className="px-3 py-2 text-sm text-slate-400 bg-slate-50 border-r border-slate-300 shrink-0">facebook.com/</span>
            <input type="text" value={form.facebook} onChange={set('facebook')}
              className="flex-1 px-3 py-2 text-sm focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Notice board */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Notice board</p>
            <p className="text-xs text-slate-400 mt-0.5">Shows on your booking page — announcements, closures, price changes, anything</p>
          </div>
          {(form.notice.trim() || noticeImagePreview || noticeImageUrl) && (
            <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full shrink-0">Live</span>
          )}
        </div>

        <textarea
          value={form.notice}
          onChange={set('notice')}
          rows={5}
          className={`${inputClass} resize-y`}
        />

        <div className="mt-3">
          <input ref={noticeImageRef} type="file" accept="image/*" className="hidden"
            onChange={e => {
              const file = e.target.files[0]
              if (!file) return
              setNoticeImageFile(file)
              setNoticeImagePreview(URL.createObjectURL(file))
            }} />

          {(noticeImagePreview || noticeImageUrl) ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200">
              <img src={noticeImagePreview || noticeImageUrl} alt="Notice" className="w-full object-cover max-h-64" />
              <div className="absolute top-2 right-2 flex gap-2">
                <button onClick={() => noticeImageRef.current.click()}
                  className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-black/80">
                  Change
                </button>
                <button onClick={() => { setNoticeImageFile(null); setNoticeImagePreview(null); setNoticeImageUrl('') }}
                  className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-600">
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => noticeImageRef.current.click()}
              className="w-full border-2 border-dashed border-slate-200 rounded-xl py-4 text-sm text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
              + Add a photo to the notice
            </button>
          )}
        </div>

        {(form.notice.trim() || noticeImagePreview || noticeImageUrl) && (
          <button onClick={() => { setForm(f => ({ ...f, notice: '' })); setNoticeImageFile(null); setNoticeImagePreview(null); setNoticeImageUrl('') }}
            className="mt-3 text-xs text-slate-400 hover:text-red-500">
            Clear notice
          </button>
        )}
      </div>

      {/* Temporary closure */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <p className="text-sm font-semibold text-slate-700">Temporary closure</p>
            <p className="text-xs text-slate-400 mt-0.5">Block a date range — customers can't book during this period</p>
          </div>
          {closureActive && <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full shrink-0">Active now</span>}
          {closureUpcoming && <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full shrink-0">Upcoming</span>}
        </div>

        <div className="flex flex-wrap gap-3 mt-3">
          <div className="flex-1 min-w-32">
            <label className="block text-xs text-slate-500 mb-1">From</label>
            <input type="date" value={tempStart} min={today} onChange={e => setTempStart(e.target.value)}
              className={inputClass} />
          </div>
          <div className="flex-1 min-w-32">
            <label className="block text-xs text-slate-500 mb-1">To</label>
            <input type="date" value={tempEnd} min={tempStart || today} onChange={e => setTempEnd(e.target.value)}
              className={inputClass} />
          </div>
        </div>

        {tempStart && tempEnd && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-red-600 font-medium">
              Closed {new Date(tempStart + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(tempEnd + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
            <button onClick={() => { setTempStart(''); setTempEnd('') }} className="text-xs text-slate-400 hover:text-red-500">Clear</button>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex items-center gap-3 pb-6">
        <button onClick={handleSave} disabled={saving}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Save profile'}
        </button>
        {saved && <p className="text-sm text-green-600 font-medium">Saved!</p>}
      </div>
    </div>
  )
}
