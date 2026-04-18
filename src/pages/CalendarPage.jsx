import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../lib/BusinessContext'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function toDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatTime(t) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
}

function CancelModal({ booking, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    setSaving(true)
    await onConfirm(booking.id, reason.trim() || null)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-xl z-10 p-5">
        <h3 className="font-semibold text-slate-900 mb-0.5">Cancel booking</h3>
        <p className="text-sm text-slate-500 mb-4">
          Cancelling <strong>{booking.customer_name}</strong>'s booking at {formatTime(booking.start_time)}
        </p>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Reason <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
        />
        <p className="text-xs text-slate-400 mt-1 mb-4">If provided, the customer will see this reason.</p>
        <div className="flex gap-2">
          <button onClick={handleConfirm} disabled={saving}
            className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors">
            {saving ? 'Cancelling...' : 'Cancel booking'}
          </button>
          <button onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            Keep it
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const { business } = useBusiness()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancellingBooking, setCancellingBooking] = useState(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toDateString(today)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayStr)

  useEffect(() => {
    if (!business) return
    supabase.from('bookings').select('*, services(name, price)')
      .eq('business_id', business.id).eq('status', 'confirmed')
      .order('date').order('start_time')
      .then(({ data }) => { setBookings(data || []); setLoading(false) })
  }, [business])

  async function cancelBooking(id, reason) {
    await supabase.from('bookings').update({ status: 'cancelled', cancellation_reason: reason || null }).eq('id', id)
    setBookings(prev => prev.filter(b => b.id !== id))
    setCancellingBooking(null)
  }

  const bookedDates = bookings.reduce((acc, b) => {
    acc[b.date] = (acc[b.date] || 0) + 1
    return acc
  }, {})

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d))

  const selectedBookings = bookings.filter(b => b.date === selectedDate)

  const selectedLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  if (loading) return <p className="text-slate-400">Loading...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="text-sm text-slate-500 hover:text-slate-800">← Back</button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Calendar</h1>
          <p className="text-slate-500 text-sm">{business.name}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4 relative">
          <button onClick={() => {
            if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
            else setViewMonth(m => m - 1)
          }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 text-lg leading-none">‹</button>

          <button onClick={() => setShowMonthPicker(v => !v)}
            className="text-base font-semibold text-slate-900 hover:text-indigo-600 transition-colors">
            {FULL_MONTHS[viewMonth]} {viewYear} ▾
          </button>

          <button onClick={() => {
            if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
            else setViewMonth(m => m + 1)
          }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 text-lg leading-none">›</button>

          {showMonthPicker && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-xl shadow-lg z-10 p-3 w-52">
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => setViewYear(y => y - 1)} className="text-slate-400 hover:text-slate-700 px-2">‹</button>
                <span className="text-sm font-semibold text-slate-900">{viewYear}</span>
                <button onClick={() => setViewYear(y => y + 1)} className="text-slate-400 hover:text-slate-700 px-2">›</button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MONTHS.map((m, i) => (
                  <button key={m} onClick={() => { setViewMonth(i); setShowMonthPicker(false) }}
                    className={`text-xs py-1.5 rounded-lg transition-colors ${i === viewMonth ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-7 mb-1">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="text-center text-xs text-slate-400 py-1 font-medium">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={i} />
            const dateStr = toDateString(date)
            const count = bookedDates[dateStr] || 0
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const isPast = date < today
            return (
              <button key={i} type="button"
                onClick={() => { setSelectedDate(dateStr); setShowMonthPicker(false) }}
                className={`
                  aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all relative gap-0.5
                  ${isSelected ? 'bg-indigo-600 text-white shadow-md' : isToday ? 'bg-indigo-50 text-indigo-700 font-bold' : isPast && !count ? 'text-slate-300' : 'text-slate-700 hover:bg-indigo-50 cursor-pointer'}
                `}
              >
                <span className={isSelected ? 'font-bold' : ''}>{date.getDate()}</span>
                {count > 0 && (
                  <span className={`text-[9px] font-semibold leading-none ${isSelected ? 'text-indigo-200' : 'text-indigo-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{selectedLabel}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedBookings.length === 0 ? 'No bookings' : `${selectedBookings.length} booking${selectedBookings.length > 1 ? 's' : ''}`}
            </p>
          </div>
          {selectedDate >= todayStr && (
            <a href={`/book/${business.slug}`} target="_blank" rel="noreferrer"
              className="text-xs text-indigo-600 font-medium hover:underline">
              Share page →
            </a>
          )}
        </div>

        {selectedBookings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">No bookings on this day.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedBookings.map(b => (
              <div key={b.id} className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg shrink-0 text-center leading-tight min-w-[60px]">
                    <div>{formatTime(b.start_time)}</div>
                    <div className="text-indigo-400 font-normal text-[10px]">–{formatTime(b.end_time)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{b.customer_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{b.services?.name}</p>
                    <p className="text-xs text-slate-400">{b.customer_email}</p>
                    {b.customer_phone && <p className="text-xs text-slate-400">{b.customer_phone}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    {b.services?.price && (
                      <p className="text-sm font-semibold text-slate-700 mb-1">£{Number(b.services.price).toFixed(2)}</p>
                    )}
                    {selectedDate >= todayStr && (
                      <button onClick={() => setCancellingBooking(b)}
                        className="text-xs text-red-400 hover:text-red-600">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cancellingBooking && (
        <CancelModal
          booking={cancellingBooking}
          onConfirm={cancelBooking}
          onClose={() => setCancellingBooking(null)}
        />
      )}
    </div>
  )
}
