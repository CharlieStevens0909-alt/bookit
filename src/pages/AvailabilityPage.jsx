import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../lib/BusinessContext'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const defaultSlots = DAYS.map((_, i) => ({
  day_of_week: i,
  enabled: i < 5,
  start_time: '09:00',
  end_time: '17:00',
  has_break: false,
  break_start: '12:00',
  break_end: '13:00',
}))

function timeToMins(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function formatTime12(t) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
}

function countSlots(start, end, durationMins, hasBreak, breakStart, breakEnd) {
  let count = 0
  let cur = timeToMins(start)
  const endMins = timeToMins(end)
  const bStart = hasBreak ? timeToMins(breakStart) : null
  const bEnd = hasBreak ? timeToMins(breakEnd) : null
  while (cur + durationMins <= endMins) {
    const slotEnd = cur + durationMins
    if (!hasBreak || !(cur < bEnd && slotEnd > bStart)) count++
    cur += durationMins
  }
  return count
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

export default function AvailabilityPage() {
  const { business } = useBusiness()
  const [slots, setSlots] = useState(defaultSlots)
  const [slotDuration, setSlotDuration] = useState(30)
  const [slotUnit, setSlotUnit] = useState('mins')
  const [closures, setClosures] = useState([])
  const [newClosureDate, setNewClosureDate] = useState('')
  const [newClosureLabel, setNewClosureLabel] = useState('')
  const [addingClosure, setAddingClosure] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!business) return
    fetchAll()
  }, [business])

  async function fetchAll() {
    const [{ data: avail }, { data: cls }] = await Promise.all([
      supabase.from('availability').select('*').eq('business_id', business.id),
      supabase.from('special_closures').select('*').eq('business_id', business.id).order('date'),
    ])

    const dur = business.slot_duration || 30
    if (dur >= 60 && dur % 60 === 0) { setSlotUnit('hours'); setSlotDuration(dur / 60) }
    else { setSlotUnit('mins'); setSlotDuration(dur) }

    if (avail && avail.length > 0) {
      setSlots(DAYS.map((_, i) => {
        const ex = avail.find(d => d.day_of_week === i)
        return {
          day_of_week: i,
          enabled: !!ex,
          start_time: ex?.start_time?.slice(0, 5) ?? '09:00',
          end_time: ex?.end_time?.slice(0, 5) ?? '17:00',
          has_break: !!(ex?.break_start && ex?.break_end),
          break_start: ex?.break_start?.slice(0, 5) ?? '12:00',
          break_end: ex?.break_end?.slice(0, 5) ?? '13:00',
        }
      }))
    } else {
      const toInsert = defaultSlots.filter(s => s.enabled).map(s => ({
        business_id: business.id, day_of_week: s.day_of_week,
        start_time: s.start_time, end_time: s.end_time,
      }))
      await supabase.from('availability').insert(toInsert)
    }

    setClosures(cls || [])
    setLoading(false)
  }

  function updateSlot(index, field, value) {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  function copyToAll(index) {
    const src = slots[index]
    setSlots(prev => prev.map(s => ({
      ...s,
      enabled: true,
      start_time: src.start_time,
      end_time: src.end_time,
      has_break: src.has_break,
      break_start: src.break_start,
      break_end: src.break_end,
    })))
  }

  function copyToWeekdays(index) {
    const src = slots[index]
    setSlots(prev => prev.map((s, i) => i < 5 ? {
      ...s,
      enabled: true,
      start_time: src.start_time,
      end_time: src.end_time,
      has_break: src.has_break,
      break_start: src.break_start,
      break_end: src.break_end,
    } : s))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)

    const durationMins = slotUnit === 'hours' ? slotDuration * 60 : slotDuration
    await supabase.from('businesses').update({ slot_duration: durationMins }).eq('id', business.id)
    await supabase.from('availability').delete().eq('business_id', business.id)

    const toInsert = slots.filter(s => s.enabled).map(s => ({
      business_id: business.id,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      break_start: s.has_break ? s.break_start : null,
      break_end: s.has_break ? s.break_end : null,
    }))

    if (toInsert.length > 0) await supabase.from('availability').insert(toInsert)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function addClosure() {
    if (!newClosureDate) return
    setAddingClosure(true)
    const { data } = await supabase.from('special_closures').insert({
      business_id: business.id,
      date: newClosureDate,
      label: newClosureLabel.trim() || null,
    }).select().single()
    if (data) setClosures(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)))
    setNewClosureDate('')
    setNewClosureLabel('')
    setAddingClosure(false)
  }

  async function removeClosure(id) {
    await supabase.from('special_closures').delete().eq('id', id)
    setClosures(prev => prev.filter(c => c.id !== id))
  }

  // Today preview
  const todayJS = new Date()
  const todayDbDay = todayJS.getDay() === 0 ? 6 : todayJS.getDay() - 1
  const todaySlot = slots[todayDbDay]
  const todayStr = todayJS.toISOString().split('T')[0]
  const todayClosed = closures.some(c => c.date === todayStr)
  const durationMinsPreview = slotUnit === 'hours' ? slotDuration * 60 : slotDuration
  const todaySlotCount = todaySlot?.enabled && !todayClosed
    ? countSlots(todaySlot.start_time, todaySlot.end_time, durationMinsPreview, todaySlot.has_break, todaySlot.break_start, todaySlot.break_end)
    : 0

  if (loading) return <p className="text-slate-400">Loading...</p>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Hours</h1>
        <p className="text-slate-500 text-sm mt-0.5">Set your working hours for each day</p>
      </div>

      {/* Today preview */}
      <div className={`rounded-xl border p-4 ${todayClosed || !todaySlot?.enabled ? 'bg-slate-50 border-slate-200' : 'bg-indigo-50 border-indigo-100'}`}>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Today — {DAYS[todayDbDay]}</p>
        {todayClosed ? (
          <p className="text-sm font-medium text-slate-500">Closed (special closure)</p>
        ) : !todaySlot?.enabled ? (
          <p className="text-sm font-medium text-slate-500">Closed</p>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm font-semibold text-slate-900">
              {formatTime12(todaySlot.start_time)} – {formatTime12(todaySlot.end_time)}
            </p>
            {todaySlot.has_break && (
              <p className="text-xs text-slate-500">Break {formatTime12(todaySlot.break_start)}–{formatTime12(todaySlot.break_end)}</p>
            )}
            <p className="text-xs text-indigo-600 font-medium">{todaySlotCount} slot{todaySlotCount !== 1 ? 's' : ''} ({durationMinsPreview}min each)</p>
          </div>
        )}
      </div>

      {/* Slot duration */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <label className="block text-sm font-semibold text-slate-700 mb-1">Booking slot length</label>
        <p className="text-xs text-slate-400 mb-3">How long each appointment slot is</p>
        <div className="flex items-center gap-3 flex-wrap">
          {(slotUnit === 'mins' ? [15, 30, 45, 60, 90] : [1, 2, 3]).map(val => (
            <button key={val} type="button" onClick={() => setSlotDuration(val)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${slotDuration === val ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
              {val}{slotUnit === 'mins' ? 'm' : 'h'}
            </button>
          ))}
          <div className="flex items-center gap-1.5">
            <input type="number" min="1" max={slotUnit === 'hours' ? 12 : 480} value={slotDuration}
              onChange={e => setSlotDuration(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <select value={slotUnit} onChange={e => { setSlotUnit(e.target.value); setSlotDuration(1) }}
              className="border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="mins">mins</option>
              <option value="hours">hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hours per day */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {slots.map((slot, i) => (
          <div key={slot.day_of_week} className="px-5 py-4">
            <div className="flex items-center gap-4">
              {/* Toggle + day */}
              <div className="flex items-center gap-3 w-32 shrink-0">
                <button type="button" onClick={() => updateSlot(i, 'enabled', !slot.enabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${slot.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${slot.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className={`text-sm font-medium ${slot.enabled ? 'text-slate-900' : 'text-slate-400'}`}>{DAYS[i].slice(0, 3)}</span>
              </div>

              {slot.enabled ? (
                <div className="flex-1 space-y-2">
                  {/* Hours row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <input type="time" value={slot.start_time} onChange={e => updateSlot(i, 'start_time', e.target.value)}
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <span className="text-slate-400 text-sm">to</span>
                    <input type="time" value={slot.end_time} onChange={e => updateSlot(i, 'end_time', e.target.value)}
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />

                    {/* Break toggle */}
                    <button type="button" onClick={() => updateSlot(i, 'has_break', !slot.has_break)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${slot.has_break ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                      {slot.has_break ? '☕ Break on' : '+ Break'}
                    </button>

                    {/* Copy buttons */}
                    <button type="button" onClick={() => copyToWeekdays(i)}
                      className="text-xs text-slate-400 hover:text-indigo-600 px-1">→ Weekdays</button>
                    <button type="button" onClick={() => copyToAll(i)}
                      className="text-xs text-slate-400 hover:text-indigo-600 px-1">→ All</button>
                  </div>

                  {/* Break row */}
                  {slot.has_break && (
                    <div className="flex items-center gap-2 ml-1 pl-3 border-l-2 border-amber-200">
                      <span className="text-xs text-amber-600 font-medium w-12 shrink-0">Break</span>
                      <input type="time" value={slot.break_start} onChange={e => updateSlot(i, 'break_start', e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      <span className="text-slate-400 text-sm">to</span>
                      <input type="time" value={slot.break_end} onChange={e => updateSlot(i, 'break_end', e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Closed</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Save availability'}
        </button>
        {saved && <p className="text-sm text-green-600 font-medium">Saved!</p>}
      </div>

      {/* Special closures */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Special closed dates</h2>
        <p className="text-xs text-slate-400 mb-4">Override your weekly hours for specific dates — bank holidays, holidays, etc.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          <input type="date" value={newClosureDate} onChange={e => setNewClosureDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="text" value={newClosureLabel} onChange={e => setNewClosureLabel(e.target.value)}
            placeholder="Label (optional, e.g. Bank Holiday)"
            className="flex-1 min-w-40 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button onClick={addClosure} disabled={!newClosureDate || addingClosure}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            Add
          </button>
        </div>

        {closures.length === 0 ? (
          <p className="text-sm text-slate-400">No special closures added yet.</p>
        ) : (
          <div className="space-y-2">
            {closures.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 bg-slate-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{formatDate(c.date)}</p>
                  {c.label && <p className="text-xs text-slate-400">{c.label}</p>}
                </div>
                <button onClick={() => removeClosure(c.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
