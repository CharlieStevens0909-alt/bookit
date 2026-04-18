import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../lib/BusinessContext'

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

function toDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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

export default function UpcomingBookingsPage() {
  const { business } = useBusiness()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cancellingBooking, setCancellingBooking] = useState(null)
  const [filter, setFilter] = useState('upcoming')

  const todayStr = toDateString(new Date())

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

  const filtered = bookings
    .filter(b => {
      if (filter === 'upcoming') return b.date >= todayStr
      if (filter === 'past') return b.date < todayStr
      return true
    })
    .filter(b =>
      !search ||
      b.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      b.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
      b.services?.name?.toLowerCase().includes(search.toLowerCase())
    )

  const grouped = filtered.reduce((acc, b) => {
    if (!acc[b.date]) acc[b.date] = []
    acc[b.date].push(b)
    return acc
  }, {})

  if (loading) return <p className="text-slate-400">Loading...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="text-sm text-slate-500 hover:text-slate-800">← Back</button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bookings</h1>
          <p className="text-slate-500 text-sm">{business.name}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {['upcoming', 'past', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${filter === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
            {f}
          </button>
        ))}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, service…"
          className="ml-auto border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs text-slate-500">Showing</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{filtered.length}</p>
        <p className="text-xs text-slate-400">bookings</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-slate-400 text-sm">No bookings found.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, dayBookings]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{formatDate(date)}</p>
              <div className="space-y-2">
                {dayBookings.map(b => (
                  <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg shrink-0 text-center leading-tight min-w-[60px]">
                        <div>{formatTime(b.start_time)}</div>
                        <div className="text-indigo-400 font-normal text-[10px]">–{formatTime(b.end_time)}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{b.customer_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{b.services?.name || 'No service'}</p>
                        <p className="text-xs text-slate-400">{b.customer_email}</p>
                        {b.customer_phone && <p className="text-xs text-slate-400">{b.customer_phone}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        {b.services?.price && (
                          <p className="text-sm font-semibold text-slate-700">£{Number(b.services.price).toFixed(2)}</p>
                        )}
                        {b.date >= todayStr && (
                          <button onClick={() => setCancellingBooking(b)}
                            className="text-xs text-red-400 hover:text-red-600 mt-1">
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
