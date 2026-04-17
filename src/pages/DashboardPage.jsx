import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../lib/BusinessContext'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short'
  })
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const display = hour % 12 || 12
  return `${display}:${m}${ampm}`
}

export default function DashboardPage() {
  const { business } = useBusiness()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ week: 0, month: 0 })

  useEffect(() => {
    if (!business) return
    fetchBookings()
  }, [business])

  async function fetchBookings() {
    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabase
      .from('bookings')
      .select('*, services(name)')
      .eq('business_id', business.id)
      .eq('status', 'confirmed')
      .gte('date', today)
      .order('date')
      .order('start_time')

    setBookings(data || [])

    // Stats
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const { data: allBookings } = await supabase
      .from('bookings')
      .select('date')
      .eq('business_id', business.id)
      .eq('status', 'confirmed')

    const week = (allBookings || []).filter(b => new Date(b.date) >= weekStart).length
    const month = (allBookings || []).filter(b => new Date(b.date) >= monthStart).length
    setStats({ week, month })

    setLoading(false)
  }

  async function cancelBooking(id) {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    setBookings(prev => prev.filter(b => b.id !== id))
  }

  if (loading) return <p className="text-slate-400">Loading...</p>

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">{business.name}</h1>
        <p className="text-slate-500 text-sm">{business.type} · {business.location}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">This week</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stats.week}</p>
          <p className="text-xs text-slate-400 mt-1">bookings</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">This month</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stats.month}</p>
          <p className="text-xs text-slate-400 mt-1">bookings</p>
        </div>
      </div>

      {/* Upcoming bookings */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Upcoming bookings</h2>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">No upcoming bookings</p>
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
          <div className="space-y-2">
            {bookings.map(booking => (
              <div
                key={booking.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{booking.customer_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {booking.services?.name} · {formatDate(booking.date)} · {formatTime(booking.start_time)}–{formatTime(booking.end_time)}
                  </p>
                  <p className="text-xs text-slate-400">{booking.customer_email}</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Cancel booking for ${booking.customer_name}?`)) {
                      cancelBooking(booking.id)
                    }
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
  )
}
