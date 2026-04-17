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

export default function DashboardPage() {
  const { business } = useBusiness()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ week: 0, month: 0 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(toDateString(today))
  const [showMonthPicker, setShowMonthPicker] = useState(false)

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

  async function cancelBooking(id) {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    setBookings(prev => prev.filter(b => b.id !== id))
  }

  const bookedDates = new Set(bookings.map(b => b.date))

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d))

  const selectedBookings = bookings.filter(b => b.date === selectedDate)
  const selectedDateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  // Years to show in picker (3 years back, 2 forward)
  const currentYear = today.getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Calendar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          {/* Header with month/year picker */}
          <div className="flex items-center justify-between mb-3 relative">
            <button
              onClick={() => {
                if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
                else setViewMonth(m => m - 1)
              }}
              className="p-1 rounded hover:bg-slate-100 text-slate-500 text-lg leading-none"
            >
              ‹
            </button>

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
            >
              ›
            </button>

            {/* Dropdown picker */}
            {showMonthPicker && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-xl shadow-lg z-10 p-3 w-56">
                {/* Year selector */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setViewYear(y => y - 1)}
                    className="text-slate-400 hover:text-slate-700 px-2"
                  >‹</button>
                  <span className="text-sm font-semibold text-slate-900">{viewYear}</span>
                  <button
                    onClick={() => setViewYear(y => y + 1)}
                    className="text-slate-400 hover:text-slate-700 px-2"
                  >›</button>
                </div>
                {/* Month grid */}
                <div className="grid grid-cols-3 gap-1">
                  {MONTHS.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => { setViewMonth(i); setShowMonthPicker(false) }}
                      className={`text-xs py-1.5 rounded-lg transition-colors ${
                        i === viewMonth && viewYear === (showMonthPicker ? viewYear : today.getFullYear())
                          ? 'bg-indigo-600 text-white'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m}
                    </button>
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
              const isSelected = dateStr === selectedDate
              const hasBookings = bookedDates.has(dateStr)
              const isToday = dateStr === toDateString(today)
              const isPast = date < today

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setSelectedDate(dateStr); setShowMonthPicker(false) }}
                  className={`
                    aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-colors relative
                    ${isSelected ? 'bg-indigo-600 text-white' : isPast ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-100'}
                    ${isToday && !isSelected ? 'font-bold text-indigo-600' : ''}
                  `}
                >
                  {date.getDate()}
                  {hasBookings && (
                    <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-400'}`} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Bookings panel */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">{selectedDateLabel}</h2>

          {selectedBookings.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <p className="text-slate-400 text-sm">No bookings on this day</p>
              {toDateString(today) === selectedDate && (
                <a
                  href={`/book/${business.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-indigo-600 text-sm hover:underline"
                >
                  Share your booking page →
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {selectedBookings.map(booking => (
                <div key={booking.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{booking.customer_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {booking.services?.name} · {formatTime(booking.start_time)}–{formatTime(booking.end_time)}
                    </p>
                    <p className="text-xs text-slate-400">{booking.customer_email}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Cancel booking for ${booking.customer_name}?`)) cancelBooking(booking.id)
                    }}
                    className="text-xs text-red-500 hover:text-red-700 shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
