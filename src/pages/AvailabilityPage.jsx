import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../lib/BusinessContext'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const defaultSlots = DAYS.map((_, i) => ({
  day_of_week: i,
  enabled: i < 5,
  start_time: '09:00',
  end_time: '17:00',
}))

export default function AvailabilityPage() {
  const { business } = useBusiness()
  const [slots, setSlots] = useState(defaultSlots)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!business) return
    fetchAvailability()
  }, [business])

  async function fetchAvailability() {
    const { data } = await supabase
      .from('availability')
      .select('*')
      .eq('business_id', business.id)

    if (data && data.length > 0) {
      setSlots(DAYS.map((_, i) => {
        const existing = data.find(d => d.day_of_week === i)
        return {
          day_of_week: i,
          enabled: !!existing,
          start_time: existing?.start_time?.slice(0, 5) ?? '09:00',
          end_time: existing?.end_time?.slice(0, 5) ?? '17:00',
        }
      }))
    } else {
      // No hours saved yet — auto-save Mon–Fri 9–5 as sensible defaults
      const toInsert = defaultSlots
        .filter(s => s.enabled)
        .map(s => ({
          business_id: business.id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        }))
      await supabase.from('availability').insert(toInsert)
    }

    setLoading(false)
  }

  function updateSlot(index, field, value) {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)

    // Delete all existing and re-insert enabled days
    await supabase.from('availability').delete().eq('business_id', business.id)

    const toInsert = slots
      .filter(s => s.enabled)
      .map(s => ({
        business_id: business.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
      }))

    if (toInsert.length > 0) {
      await supabase.from('availability').insert(toInsert)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <p className="text-slate-400">Loading...</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Hours</h1>
        <p className="text-slate-500 text-sm mt-0.5">Set your working hours for each day</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {slots.map((slot, i) => (
          <div key={slot.day_of_week} className="flex items-center gap-4 px-5 py-4">
            {/* Toggle */}
            <div className="flex items-center gap-3 w-32 shrink-0">
              <button
                type="button"
                onClick={() => updateSlot(i, 'enabled', !slot.enabled)}
                className={`w-10 h-5 rounded-full transition-colors relative ${slot.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${slot.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className={`text-sm font-medium ${slot.enabled ? 'text-slate-900' : 'text-slate-400'}`}>
                {DAYS[i].slice(0, 3)}
              </span>
            </div>

            {/* Time inputs */}
            {slot.enabled ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={slot.start_time}
                  onChange={e => updateSlot(i, 'start_time', e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-slate-400 text-sm">to</span>
                <input
                  type="time"
                  value={slot.end_time}
                  onChange={e => updateSlot(i, 'end_time', e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ) : (
              <p className="text-sm text-slate-400">Closed</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save availability'}
        </button>
        {saved && <p className="text-sm text-green-600 font-medium">Saved!</p>}
      </div>
    </div>
  )
}
