import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { BusinessContext } from '../lib/BusinessContext'

export default function DashboardLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('businesses')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) {
          navigate('/onboarding', { replace: true })
        } else {
          setBusiness(data)
        }
        setLoading(false)
      })
  }, [user, navigate])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  const navClass = ({ isActive }) =>
    `text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-indigo-50 text-indigo-600'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`

  return (
    <BusinessContext.Provider value={{ business, setBusiness }}>
      <div className="min-h-screen bg-slate-50">
        {/* Top nav */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="font-bold text-slate-900 text-lg">
                BookIt
              </Link>
              <nav className="hidden sm:flex items-center gap-1">
                <NavLink to="/dashboard" end className={navClass}>Overview</NavLink>
                <NavLink to="/dashboard/services" className={navClass}>Services</NavLink>
                <NavLink to="/dashboard/hours" className={navClass}>Hours</NavLink>
                <NavLink to="/dashboard/profile" className={navClass}>Profile</NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              {business && (
                <a
                  href={`/book/${business.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors hidden sm:block"
                >
                  View booking page ↗
                </a>
              )}
              <button
                onClick={handleSignOut}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Sign out
              </button>
            </div>
          </div>
          {/* Mobile nav */}
          <nav className="sm:hidden flex items-center gap-1 px-4 pb-2">
            <NavLink to="/dashboard" end className={navClass}>Overview</NavLink>
            <NavLink to="/dashboard/services" className={navClass}>Services</NavLink>
            <NavLink to="/dashboard/hours" className={navClass}>Hours</NavLink>
            <NavLink to="/dashboard/profile" className={navClass}>Profile</NavLink>
          </nav>
        </header>

        {/* Page content */}
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Outlet />
        </main>
      </div>
    </BusinessContext.Provider>
  )
}
