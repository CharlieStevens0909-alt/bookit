import { useNavigate, Link } from 'react-router-dom'

export default function PageNav() {
  const navigate = useNavigate()
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-12">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          ← Back
        </button>
        <Link to="/my-bookings" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
          Home
        </Link>
      </div>
    </header>
  )
}
