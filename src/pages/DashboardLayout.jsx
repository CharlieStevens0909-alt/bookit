import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { BusinessContext } from '../lib/BusinessContext'

const NAV = [
  {
    group: 'MAIN',
    items: [
      { to: '/dashboard', end: true, icon: '▦', label: 'Dashboard' },
      { to: '/dashboard/upcoming', icon: '📋', label: 'Bookings' },
      { to: '/dashboard/calendar', icon: '📅', label: 'Calendar' },
    ],
  },
  {
    group: 'MANAGE',
    items: [
      { to: '/dashboard/services', icon: '✦', label: 'Services' },
      { to: '/dashboard/hours', icon: '🕐', label: 'Hours' },
      { to: '/dashboard/analytics', icon: '📊', label: 'Reports' },
    ],
  },
  {
    group: 'ACCOUNT',
    items: [
      { to: '/dashboard/all-reviews', icon: '★', label: 'Reviews' },
      { to: '/dashboard/profile', icon: '⚙', label: 'Settings' },
    ],
  },
]

export default function DashboardLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState({})

  useEffect(() => {
    if (!user) return
    supabase.from('businesses').select('*').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (!data) navigate('/onboarding', { replace: true })
        else setBusiness(data)
        setLoading(false)
      })
  }, [user, navigate])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a3535' }}>
        <p className="text-teal-300">Loading...</p>
      </div>
    )
  }

  const initials = business?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-white/15 text-white'
        : 'text-teal-100/70 hover:bg-white/10 hover:text-white'
    }`

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{ background: '#1a3535' }}>
      {/* Brand */}
      <div className="px-6 pt-7 pb-6 border-b border-white/10">
        <p className="text-xs font-semibold tracking-widest text-teal-400/70 mb-1">INVERCLYDE</p>
        <Link to="/dashboard" className="text-2xl font-bold text-white leading-tight">Bookit</Link>
        <p className="text-xs text-teal-300/60 tracking-widest mt-1">LOCAL BOOKING, MADE SIMPLE</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
        {NAV.map(({ group, items }) => (
          <div key={group}>
            <button
              onClick={() => setCollapsed(c => ({ ...c, [group]: !c[group] }))}
              className="w-full flex items-center justify-between px-4 mb-2 group"
            >
              <p className="text-[10px] font-bold tracking-widest text-teal-400/50">{group}</p>
              <span className="text-teal-400/40 text-xs">{collapsed[group] ? '▸' : '▾'}</span>
            </button>
            {!collapsed[group] && (
              <div className="space-y-0.5">
                {items.map(({ to, end, icon, label }) => (
                  <NavLink key={to} to={to} end={end} className={navLinkClass} onClick={() => setSidebarOpen(false)}>
                    <span className="text-base w-5 text-center opacity-80">{icon}</span>
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t border-white/10 space-y-0.5">
        {business && (
          <a href={`/book/${business.slug}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-teal-100/70 hover:bg-white/10 hover:text-white transition-all">
            <span className="text-base w-5 text-center opacity-80">↗</span>
            View booking page
          </a>
        )}
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
          <p className="text-sm font-semibold text-white truncate">{business?.name}</p>
          <p className="text-xs text-teal-300/60">Business Account</p>
        </div>
      </div>
    </div>
  )

  return (
    <BusinessContext.Provider value={{ business, setBusiness }}>
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

          <main className="flex-1 px-6 py-8 max-w-5xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </BusinessContext.Provider>
  )
}
