import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../lib/BusinessContext'

function toDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatTime(t) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short'
  })
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

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
          Cancelling <strong>{booking.customer_name}</strong>'s {booking.services?.name} at {formatTime(booking.start_time)}
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

function DayModal({ date, bookings, business, onCancel, onClose }) {
  const [cancellingBooking, setCancellingBooking] = useState(null)
  const label = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl z-10 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">{label}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {bookings.length === 0 ? 'No bookings' : `${bookings.length} booking${bookings.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">No bookings on this day</p>
              <a href={`/book/${business.slug}`} target="_blank" rel="noreferrer"
                className="mt-3 inline-block text-indigo-600 text-sm hover:underline">
                Share your booking page →
              </a>
            </div>
          ) : (
            bookings.map(booking => (
              <div key={booking.id} className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 text-center leading-tight">
                    <div>{formatTime(booking.start_time)}</div>
                    <div className="text-indigo-400 font-normal">–{formatTime(booking.end_time)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{booking.customer_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{booking.services?.name}</p>
                    <p className="text-xs text-slate-400">{booking.customer_email}</p>
                    {booking.customer_phone && <p className="text-xs text-slate-400">{booking.customer_phone}</p>}
                  </div>
                  <button onClick={() => setCancellingBooking(booking)}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0 mt-0.5">
                    Cancel
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
    {cancellingBooking && (
      <CancelModal
        booking={cancellingBooking}
        onConfirm={async (id, reason) => { await onCancel(id, reason); setCancellingBooking(null) }}
        onClose={() => setCancellingBooking(null)}
      />
    )}
    </>
  )
}

export default function DashboardPage() {
  const { business } = useBusiness()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [pending, setPending] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ week: 0, month: 0, weekRev: 0, monthRev: 0 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toDateString(today)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [modalDate, setModalDate] = useState(null)

  useEffect(() => {
    if (!business) return
    fetchData()
  }, [business])

  async function fetchData() {
    const [{ data: bData }, { data: pData }, { data: rData }] = await Promise.all([
      supabase.from('bookings').select('*, services(name, price)')
        .eq('business_id', business.id).eq('status', 'confirmed')
        .order('date').order('start_time'),
      supabase.from('bookings').select('*, services(name, price)')
        .eq('business_id', business.id).eq('status', 'pending')
        .order('date').order('start_time'),
      supabase.from('reviews').select('*')
        .eq('business_id', business.id).order('created_at', { ascending: false }).limit(5),
    ])

    setPending(pData || [])

    const allBookings = bData || []
    setBookings(allBookings)
    setReviews(rData || [])

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const weekBookings = allBookings.filter(b => new Date(b.date + 'T00:00:00') >= weekStart)
    const monthBookings = allBookings.filter(b => new Date(b.date + 'T00:00:00') >= monthStart)

    setStats({
      week: weekBookings.length,
      month: monthBookings.length,
      weekRev: weekBookings.reduce((s, b) => s + Number(b.services?.price || 0), 0),
      monthRev: monthBookings.reduce((s, b) => s + Number(b.services?.price || 0), 0),
    })
    setLoading(false)
  }

  async function cancelBooking(id, reason) {
    await supabase.from('bookings').update({ status: 'cancelled', cancellation_reason: reason || null }).eq('id', id)
    setBookings(prev => prev.filter(b => b.id !== id))
  }

  async function confirmReservation(id) {
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id)
    const res = pending.find(b => b.id === id)
    setPending(prev => prev.filter(b => b.id !== id))
    if (res) setBookings(prev => [...prev, { ...res, status: 'confirmed' }].sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)))
  }

  async function rejectReservation(id) {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    setPending(prev => prev.filter(b => b.id !== id))
  }

  const upcoming = bookings.filter(b => b.date >= todayStr).slice(0, 3)
  const bookedDates = new Set(bookings.map(b => b.date))

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d))

  const modalBookings = modalDate ? bookings.filter(b => b.date === modalDate) : []

  if (loading) return <p className="text-slate-400">Loading...</p>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{business.name}</h1>
        <p className="text-slate-500 text-sm">{business.type} · {business.location}</p>
      </div>

      {/* Stats — 2x2 grid (click to analytics) */}
      <div className="grid grid-cols-2 gap-3 cursor-pointer group" onClick={() => navigate('/dashboard/analytics')}>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
          <p className="text-xs text-slate-500">This week</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.week}</p>
          <p className="text-xs text-slate-400">bookings</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
          <p className="text-xs text-slate-500">This month</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.month}</p>
          <p className="text-xs text-slate-400">bookings</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
          <p className="text-xs text-slate-500">This week</p>
          <p className="text-2xl font-bold text-emerald-600 mt-0.5">£{stats.weekRev.toFixed(2)}</p>
          <p className="text-xs text-slate-400">revenue</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
          <p className="text-xs text-slate-500">This month</p>
          <p className="text-2xl font-bold text-emerald-600 mt-0.5">£{stats.monthRev.toFixed(2)}</p>
          <p className="text-xs text-slate-400">revenue → </p>
        </div>
      </div>

      {/* Pending reservations */}
      {pending.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Pending reservations</h2>
            <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">{pending.length}</span>
          </div>
          <div className="space-y-3">
            {pending.map(b => (
              <div key={b.id} className="bg-amber-50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{b.customer_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDate(b.date)} at {formatTime(b.start_time)}
                      {b.party_size && ` · ${b.party_size} ${b.party_size === 1 ? 'guest' : 'guests'}`}
                    </p>
                    <p className="text-xs text-slate-400">{b.customer_phone || b.customer_email}</p>
                    {b.special_requests && <p className="text-xs text-slate-500 mt-1 italic">"{b.special_requests}"</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => confirmReservation(b.id)}
                      className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 font-medium transition-colors">
                      Confirm
                    </button>
                    <button onClick={() => rejectReservation(b.id)}
                      className="text-xs bg-white border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 font-medium transition-colors">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming bookings */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
          onClick={() => navigate('/dashboard/upcoming')}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Upcoming</h2>
            <span className="text-xs text-indigo-600 font-medium">View all →</span>
          </div>
          <div className="space-y-2">
            {upcoming.map(b => (
              <div key={b.id} className="flex items-center gap-3">
                <div className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg shrink-0 text-center leading-tight min-w-[56px]">
                  <div>{formatTime(b.start_time)}</div>
                  <div className="text-indigo-400 font-normal text-[10px]">{formatDate(b.date)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{b.customer_name}</p>
                  <p className="text-xs text-slate-400 truncate">{b.services?.name}</p>
                </div>
                {b.services?.price && (
                  <p className="text-sm font-semibold text-slate-700 shrink-0">£{Number(b.services.price).toFixed(2)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-slate-700">Calendar</span>
          <button onClick={() => navigate('/dashboard/calendar')}
            className="text-xs text-indigo-600 font-medium hover:text-indigo-800">View full →</button>
        </div>
        <div className="flex items-center justify-between mb-3 relative">
          <button onClick={() => {
            if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
            else setViewMonth(m => m - 1)
          }} className="p-1 rounded hover:bg-slate-100 text-slate-500 text-lg leading-none">‹</button>

          <button onClick={() => setShowMonthPicker(v => !v)}
            className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors">
            {MONTHS[viewMonth]} {viewYear} ▾
          </button>

          <button onClick={() => {
            if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
            else setViewMonth(m => m + 1)
          }} className="p-1 rounded hover:bg-slate-100 text-slate-500 text-lg leading-none">›</button>

          {showMonthPicker && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-xl shadow-lg z-10 p-3 w-52">
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

        <div className="grid grid-cols-7 mb-0.5">
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} className="text-center text-xs text-slate-300 py-0.5">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px">
          {cells.map((date, i) => {
            if (!date) return <div key={i} />
            const dateStr = toDateString(date)
            const hasBookings = bookedDates.has(dateStr)
            const isToday = dateStr === todayStr
            const isPast = date < today
            return (
              <button key={i} type="button"
                onClick={() => { setModalDate(dateStr); setShowMonthPicker(false) }}
                className={`
                  aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-colors relative
                  ${isPast && !hasBookings ? 'text-slate-300' : 'text-slate-700 hover:bg-indigo-50 cursor-pointer'}
                  ${isToday ? 'font-bold text-indigo-600' : ''}
                `}
              >
                {date.getDate()}
                {hasBookings && <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-500" />}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-slate-400 text-center mt-3">Tap any day to see bookings</p>
      </div>

      {/* Latest reviews */}
      {reviews.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
          onClick={() => navigate('/dashboard/all-reviews')}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Latest reviews</h2>
            <span className="text-xs text-indigo-600 font-medium">View all →</span>
          </div>
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
                  {r.customer_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{r.customer_name}</p>
                    <span className="text-yellow-400 text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  </div>
                  {r.comment && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.comment}</p>}
                  <p className="text-xs text-slate-300 mt-0.5">
                    {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalDate && (
        <DayModal
          date={modalDate}
          bookings={modalBookings}
          business={business}
          onCancel={cancelBooking}
          onClose={() => setModalDate(null)}
        />
      )}
    </div>
  )
}
