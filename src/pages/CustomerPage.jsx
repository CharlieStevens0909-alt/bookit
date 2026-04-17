import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

function formatTime(t) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

export default function CustomerPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }
    fetchBookings()
  }, [user, authLoading])

  async function fetchBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('*, services(name), businesses(name, slug)')
      .eq('customer_email', user.email)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })

    setBookings(data || [])
    setLoading(false)
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this booking?')) return
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = bookings.filter(b => b.date >= today && b.status === 'confirmed')
  const past = bookings.filter(b => b.date < today || b.status === 'cancelled')

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
          <span className="font-bold text-slate-900 text-lg">BookIt</span>
          <div className="flex items-center gap-4">
            <Link to="/search" className="text-sm text-indigo-600 font-medium hover:text-indigo-700">
              Find a business
            </Link>
            <button onClick={handleSignOut} className="text-sm font-medium text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">My bookings</h1>
          <p className="text-slate-500 text-sm mt-0.5">All your appointments in one place</p>
        </div>

        {/* Upcoming */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Upcoming
          </h2>

          {upcoming.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <p className="text-slate-400 text-sm">No upcoming bookings</p>
              <p className="text-xs text-slate-300 mt-1">
                Visit a business's booking page to make an appointment
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(booking => (
                <div key={booking.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{booking.businesses?.name}</p>
                      <p className="text-sm text-slate-700 mt-0.5">{booking.services?.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(booking.date)} · {formatTime(booking.start_time)}–{formatTime(booking.end_time)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        Confirmed
                      </span>
                      <button
                        onClick={() => handleCancel(booking.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Past / cancelled */}
        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Past & cancelled
            </h2>
            <div className="space-y-3">
              {past.map(booking => (
                <div key={booking.id} className="bg-white rounded-xl border border-slate-200 p-4 opacity-60">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{booking.businesses?.name}</p>
                      <p className="text-sm text-slate-700 mt-0.5">{booking.services?.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(booking.date)} · {formatTime(booking.start_time)}–{formatTime(booking.end_time)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        booking.status === 'cancelled'
                          ? 'bg-red-50 text-red-500'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {booking.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                      </span>
                      {booking.status === 'cancelled' && booking.cancellation_reason && (
                        <p className="text-xs text-slate-400 mt-1 max-w-[140px]">
                          "{booking.cancellation_reason}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
