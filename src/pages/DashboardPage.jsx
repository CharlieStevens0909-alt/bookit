import { useEffect, useState } from 'react'
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

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function DayModal({ date, bookings, business, onCancel, onClose }) {
  const label = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl z-10 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">{label}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {bookings.length === 0
                ? 'No bookings'
                : `${bookings.length} booking${bookings.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Bookings list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">No bookings on this day</p>
              <a
                href={`/book/${business.slug}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-indigo-600 text-sm hover:underline"
              >
                Share your booking page →
              </a>
            </div>
          ) : (
            bookings.map(booking => (
              <div key={booking.id} className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Time badge */}
                  <div className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 text-center leading-tight">
                    <div>{formatTime(booking.start_time)}</div>
                    <div className="text-indigo-400 font-normal">–{formatTime(booking.end_time)}</div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{booking.customer_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{booking.services?.name}</p>
                    <p className="text-xs text-slate-400">{booking.customer_email}</p>
                  </div>

                  {/* Cancel */}
                  <button
                    onClick={() => {
                      if (confirm(`Cancel booking for ${booking.customer_name}?`)) {
                        onCancel(booking.id)
                      }
                    }}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0 mt-0.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { business } = useBusiness()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ week: 0, month: 0 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [modalDate, setModalDate] = useState(null)

  useEffect(() => {
    if (!business) return
    fetchBookings()
  }, [business])

  async function fetchBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('*, services(name)')
      .eq('business_id', business.id)
      .eq('status', 'confirmed')
      .order('date')
      .order('start_time')

    setBookings(data || [])

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const week = (data || []).filter(b => new Date(b.date + 'T00:00:00') >= weekStart).length
    const month = (data || []).filter(b => new Date(b.date + 'T00:00:00') >= monthStart).length
    setStats({ week, month })
    setLoading(false)
  }

  function cancelBooking(id) {
    supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    setBookings(prev => prev.filter(b => b.id !== id))
  }

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
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">{business.name}</h1>
        <p className="text-slate-500 text-sm">{business.type} · {business.location}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-xs text-slate-500">This week</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.week}</p>
          <p className="text-xs text-slate-400">bookings</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-xs text-slate-500">This month</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.month}</p>
          <p className="text-xs text-slate-400">bookings</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 max-w-sm">
        {/* Month/year header */}
        <div className="flex items-center justify-between mb-3 relative">
          <button
            onClick={() => {
              if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
              else setViewMonth(m => m - 1)
            }}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 text-lg leading-none"
          >‹</button>

          <button
            onClick={() => setShowMonthPicker(v => !v)}
            className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
          >
            {MONTHS[viewMonth]} {viewYear} ▾
          </button>

          <button
            onClick={() => {
              if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
              else setViewMonth(m => m + 1)
            }}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 text-lg leading-none"
          >›</button>

          {showMonthPicker && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-xl shadow-lg z-10 p-3 w-52">
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => setViewYear(y => y - 1)} className="text-slate-400 hover:text-slate-700 px-2">‹</button>
                <span className="text-sm font-semibold text-slate-900">{viewYear}</span>
                <button onClick={() => setViewYear(y => y + 1)} className="text-slate-400 hover:text-slate-700 px-2">›</button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => { setViewMonth(i); setShowMonthPicker(false) }}
                    className={`text-xs py-1.5 rounded-lg transition-colors ${
                      i === viewMonth ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >{m}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-0.5">
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} className="text-center text-xs text-slate-300 py-0.5">{d}</div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7 gap-px">
          {cells.map((date, i) => {
            if (!date) return <div key={i} />
            const dateStr = toDateString(date)
            const hasBookings = bookedDates.has(dateStr)
            const isToday = dateStr === toDateString(today)
            const isPast = date < today
            const count = bookings.filter(b => b.date === dateStr).length

            return (
              <button
                key={i}
                type="button"
                onClick={() => { setModalDate(dateStr); setShowMonthPicker(false) }}
                className={`
                  aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-colors relative
                  ${isPast && !hasBookings ? 'text-slate-300' : 'text-slate-700 hover:bg-indigo-50 cursor-pointer'}
                  ${isToday ? 'font-bold text-indigo-600' : ''}
                  ${hasBookings ? 'hover:bg-indigo-50' : ''}
                `}
              >
                {date.getDate()}
                {hasBookings && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-500" />
                )}
              </button>
            )
          })}
        </div>

        <p className="text-xs text-slate-400 text-center mt-3">Tap any day to see bookings</p>
      </div>

      {/* Day modal */}
      {modalDate && (
        <DayModal
          date={modalDate}
          bookings={modalBookings}
          business={business}
          onCancel={(id) => {
            cancelBooking(id)
            setBookings(prev => prev.filter(b => b.id !== id))
          }}
          onClose={() => setModalDate(null)}
        />
      )}
    </div>
  )
}
