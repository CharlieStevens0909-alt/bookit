import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const gradients = [
  ['#6366f1','#8b5cf6'],
  ['#3b82f6','#06b6d4'],
  ['#10b981','#14b8a6'],
  ['#f59e0b','#ef4444'],
  ['#ec4899','#8b5cf6'],
]

function getGradient(name) {
  const i = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % gradients.length
  return gradients[i]
}

function BusinessCard({ business }) {
  const [g1, g2] = getGradient(business.name)

  return (
    <Link
      to={`/book/${business.slug}`}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all group"
    >
      {/* Cover */}
      <div
        className="w-full h-24 relative"
        style={
          business.cover_url
            ? { backgroundImage: `url(${business.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: `linear-gradient(135deg, ${g1}, ${g2})` }
        }
      />

      {/* Avatar + info */}
      <div className="px-4 pb-4">
        <div className="-mt-6 mb-2">
          <div className="w-12 h-12 rounded-full border-3 border-white shadow overflow-hidden" style={{ borderWidth: 3 }}>
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white text-lg font-bold"
                style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
              >
                {business.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <h3 className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors leading-tight">
          {business.name}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {[business.type, business.location].filter(Boolean).join(' · ')}
        </p>
        {business.description && (
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{business.description}</p>
        )}

        <div className="mt-3">
          <span className="inline-block bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg group-hover:bg-indigo-700 transition-colors">
            Book now →
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef(null)

  // Load all businesses on mount
  useEffect(() => {
    supabase
      .from('businesses')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setAll(data || [])
        setResults(data || [])
        setLoading(false)
      })
  }, [])

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const q = query.trim()
      if (!q) {
        setResults(all)
        return
      }
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .or(`name.ilike.%${q}%,type.ilike.%${q}%,location.ilike.%${q}%,description.ilike.%${q}%`)
        .order('name')
      setResults(data || [])
    }, 250)
  }, [query, all])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="font-bold text-slate-900 text-lg shrink-0">BookIt</Link>
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, type or location..."
              className="w-full bg-slate-100 border border-transparent rounded-xl pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Result count */}
        <p className="text-xs text-slate-400 mb-4">
          {loading ? 'Loading...' : query
            ? `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`
            : `${results.length} business${results.length !== 1 ? 'es' : ''} on BookIt`
          }
        </p>

        {/* Results */}
        {!loading && results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🔍</p>
            <p className="font-semibold text-slate-900">No results found</p>
            <p className="text-slate-500 text-sm mt-1">Try a different name, type, or location</p>
            <button
              onClick={() => setQuery('')}
              className="mt-4 text-indigo-600 text-sm hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map(business => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
