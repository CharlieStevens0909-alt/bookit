import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import BrandLink from '../components/BrandLink'

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

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target - today) / 86400000)
}

const NAV = [
  {
    group: 'MAIN',
    items: [
      { label: 'My Bookings', icon: '📋' },
      { label: 'Search', icon: '🔍', href: '/search' },
    ],
  },
  {
    group: 'ACCOUNT',
    items: [
      { label: 'Account', icon: '⚙' },
    ],
  },
]

export default function CustomerPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [reviews, setReviews] = useState({})
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState({})
  const [activeSection, setActiveSection] = useState('My Bookings')

  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }
    setDisplayName(user.user_metadata?.name || '')
    supabase.from('businesses').select('id').eq('user_id', user.id).single().then(({ data }) => {
      if (data) { navigate('/dashboard', { replace: true }); return }
      fetchBookings()
    })
  }, [user, authLoading])

  async function fetchBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('*, services(name), businesses(name, slug)')
      .eq('customer_email', user.email)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    const bookingList = data || []
    setBookings(bookingList)

    if (bookingList.length > 0) {
      const ids = bookingList.map(b => b.id)
      const { data: revs } = await supabase
        .from('reviews').select('booking_id, rating').in('booking_id', ids)
      const revMap = {}
      for (const r of revs || []) revMap[r.booking_id] = r
      setReviews(revMap)
    }

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

  async function handleSaveName() {
    if (!displayName.trim()) return
    setSavingName(true)
    await supabase.auth.updateUser({ data: { name: displayName.trim() } })
    setSavingName(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2500)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordError(null)
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) { setPasswordError(error.message); return }
    setPasswordSaved(true)
    setNewPassword(''); setConfirmPassword('')
    setChangingPassword(false)
    setTimeout(() => setPasswordSaved(false), 3000)
  }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = bookings.filter(b => b.date >= today && b.status === 'confirmed')
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
  const past = bookings.filter(b => b.date < today || b.status === 'cancelled')
    .sort((a, b) => b.date.localeCompare(a.date))

  const nextBooking = upcoming[0]
  const daysToNext = nextBooking ? daysUntil(nextBooking.date) : null

  const initials = (user?.user_metadata?.name || user?.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a3535' }}>
        <p className="text-teal-300">Loading...</p>
      </div>
    )
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{ background: '#1a3535' }}>
      {/* Brand */}
      <div className="px-6 pt-7 pb-6 border-b border-white/10">
        <p className="text-xs font-semibold tracking-widest text-teal-400/70 mb-1">INVERCLYDE</p>
        <BrandLink className="text-2xl font-bold text-white leading-tight" />
        <p className="text-xs text-teal-300/60 tracking-widest mt-1">LOCAL BOOKING, MADE SIMPLE</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
        {NAV.map(({ group, items }) => (
          <div key={group}>
            <button
              onClick={() => setCollapsed(c => ({ ...c, [group]: !c[group] }))}
              className="w-full flex items-center justify-between px-4 mb-2"
            >
              <p className="text-[10px] font-bold tracking-widest text-teal-400/50">{group}</p>
              <span className="text-teal-400/40 text-xs">{collapsed[group] ? '▸' : '▾'}</span>
            </button>
            {!collapsed[group] && (
              <div className="space-y-0.5">
                {items.map(({ label, icon, href }) => {
                  const isActive = activeSection === label
                  const cls = `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left ${
                    isActive ? 'bg-white/15 text-white' : 'text-teal-100/70 hover:bg-white/10 hover:text-white'
                  }`
                  if (href) {
                    return (
                      <Link key={label} to={href} className={cls} onClick={() => setSidebarOpen(false)}>
                        <span className="text-base w-5 text-center opacity-80">{icon}</span>
                        {label}
                      </Link>
                    )
                  }
                  return (
                    <button key={label} onClick={() => { setActiveSection(label); setSidebarOpen(false) }} className={cls}>
                      <span className="text-base w-5 text-center opacity-80">{icon}</span>
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-3 border-t border-white/10">
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-teal-100/70 hover:bg-white/10 hover:text-white transition-all">
          <span className="text-base w-5 text-center opacity-80">→</span>
          Sign out
        </button>
      </div>

      {/* User profile */}
      <div className="px-4 py-4 border-t border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {user?.user_metadata?.name || user?.email}
          </p>
          <p className="text-xs text-teal-300/60">Customer Account</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-0 h-screen">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-60 flex flex-col z-50">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600 text-xl">☰</button>
          <span className="font-bold text-slate-900">Inverclyde.Bookit</span>
          <div className="w-7" />
        </div>

        <main className="flex-1 px-6 py-8 max-w-3xl w-full mx-auto">

          {activeSection === 'My Bookings' && (
            <>
              {nextBooking && (
                <div className="bg-indigo-600 text-white rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-indigo-200 font-medium uppercase tracking-wide">
                      {daysToNext === 0 ? 'Today' : daysToNext === 1 ? 'Tomorrow' : `In ${daysToNext} days`}
                    </p>
                    <p className="text-sm font-semibold mt-0.5">
                      {nextBooking.businesses?.name} · {nextBooking.services?.name}
                    </p>
                    <p className="text-xs text-indigo-200 mt-0.5">
                      {formatDate(nextBooking.date)} at {formatTime(nextBooking.start_time)}
                    </p>
                  </div>
                  <Link
                    to={`/book/${nextBooking.businesses?.slug}`}
                    className="shrink-0 text-xs bg-white text-indigo-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    View page
                  </Link>
                </div>
              )}

              <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-900">My bookings</h1>
                <p className="text-slate-500 text-sm mt-0.5">All your appointments in one place</p>
              </div>

              <section className="mb-8">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Upcoming</h2>
                {upcoming.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                    <p className="text-3xl mb-3">📅</p>
                    <p className="font-semibold text-slate-900 mb-1">No upcoming bookings</p>
                    <p className="text-slate-400 text-sm mb-5">Find a local business and book your next appointment</p>
                    <Link to="/search" className="inline-block bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
                      Find a business →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map(booking => {
                      const days = daysUntil(booking.date)
                      return (
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
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                days === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
                              </span>
                              <button onClick={() => handleCancel(booking.id)} className="text-xs text-red-500 hover:text-red-700">
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {past.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Past & cancelled</h2>
                  <div className="space-y-3">
                    {past.map(booking => {
                      const reviewed = reviews[booking.id]
                      const canReview = booking.status !== 'cancelled'
                      return (
                        <div key={booking.id} className="bg-white rounded-xl border border-slate-200 p-4 opacity-70">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">{booking.businesses?.name}</p>
                              <p className="text-sm text-slate-700 mt-0.5">{booking.services?.name}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {formatDate(booking.date)} · {formatTime(booking.start_time)}–{formatTime(booking.end_time)}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5">
                                {booking.businesses?.slug && (
                                  <Link to={`/book/${booking.businesses.slug}`} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                    Book again →
                                  </Link>
                                )}
                                {canReview && (
                                  reviewed ? (
                                    <p className="text-xs text-yellow-500">{'★'.repeat(reviewed.rating)} Reviewed</p>
                                  ) : (
                                    <Link to={`/review/${booking.id}`} className="text-xs text-yellow-600 hover:text-yellow-800 font-medium">
                                      ★ Review
                                    </Link>
                                  )
                                )}
                              </div>
                            </div>
                            <div className="shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                booking.status === 'cancelled' ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {booking.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </>
          )}

          {activeSection === 'Account' && (
            <div>
              <h1 className="text-xl font-bold text-slate-900 mb-6">Account</h1>
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email</label>
                  <p className="text-sm text-slate-700">{user.email}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Display name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName || !displayName.trim()}
                      className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                    >
                      {savingName ? '…' : nameSaved ? 'Saved!' : 'Save'}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Password</label>
                    <button
                      onClick={() => { setChangingPassword(o => !o); setPasswordError(null) }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {changingPassword ? 'Cancel' : 'Change password'}
                    </button>
                  </div>
                  {changingPassword && (
                    <form onSubmit={handleChangePassword} className="space-y-2">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="New password"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      {passwordError && <p className="text-red-500 text-xs">{passwordError}</p>}
                      <button
                        type="submit"
                        disabled={savingPassword}
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {savingPassword ? 'Saving…' : 'Update password'}
                      </button>
                    </form>
                  )}
                  {passwordSaved && <p className="text-green-600 text-xs mt-1">Password updated!</p>}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
