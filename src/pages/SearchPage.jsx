import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { haversineDistance, parseSearchQuery, geocodePostcode } from '../lib/geocode'
import BrandLink from '../components/BrandLink'

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

function BusinessCard({ business, distance }) {
  const [g1, g2] = getGradient(business.name)
  return (
    <Link
      to={`/book/${business.slug}`}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all group"
    >
      <div
        className="w-full h-24"
        style={
          business.cover_url
            ? { backgroundImage: `url(${business.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: `linear-gradient(135deg, ${g1}, ${g2})` }
        }
      />
      <div className="px-4 pb-4">
        <div className="-mt-6 mb-2">
          <div className="w-12 h-12 rounded-full border-white shadow overflow-hidden" style={{ borderWidth: 3, borderStyle: 'solid' }}>
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                {business.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors leading-tight truncate">
              {business.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {[business.type, business.location].filter(Boolean).join(' · ')}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {business._avgRating != null && (
                <span className="text-xs text-yellow-500 font-medium">
                  ★ {business._avgRating.toFixed(1)}
                  <span className="text-slate-400 font-normal"> ({business._reviewCount})</span>
                </span>
              )}
              {business._avgPrice != null && (
                <span className="text-xs text-slate-400">avg £{business._avgPrice.toFixed(2)}</span>
              )}
            </div>
          </div>
          {distance != null && (
            <span className="shrink-0 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium mt-0.5">
              {distance < 0.1 ? '<0.1 mi' : `${distance.toFixed(1)} mi`}
            </span>
          )}
        </div>
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

const EMPTY_FILTERS = { types: [], minRating: 0, priceRange: 'any', hasReviews: false }

export default function SearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)

  // After text/location search — before filters/sort
  const [searched, setSearched] = useState([])

  const [sort, setSort] = useState('default')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [userLocation, setUserLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('idle')
  const [pendingSearch, setPendingSearch] = useState(null)
  const [postcodeInput, setPostcodeInput] = useState('')
  const [postcodeError, setPostcodeError] = useState(null)
  const [geocodingPostcode, setGeocodingPostcode] = useState(false)
  const locationCallbackRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    async function loadAll() {
      const [{ data: bizData }, { data: svcData }, { data: revData }] = await Promise.all([
        supabase.from('businesses').select('*').order('name'),
        supabase.from('services').select('business_id, price'),
        supabase.from('reviews').select('business_id, rating'),
      ])

      const priceMap = {}
      for (const s of svcData || []) {
        if (!priceMap[s.business_id]) priceMap[s.business_id] = []
        priceMap[s.business_id].push(Number(s.price))
      }

      const ratingMap = {}
      for (const r of revData || []) {
        if (!ratingMap[r.business_id]) ratingMap[r.business_id] = []
        ratingMap[r.business_id].push(r.rating)
      }

      const enriched = (bizData || []).map(b => ({
        ...b,
        _avgPrice: priceMap[b.id]?.length
          ? priceMap[b.id].reduce((s, p) => s + p, 0) / priceMap[b.id].length
          : null,
        _avgRating: ratingMap[b.id]?.length
          ? ratingMap[b.id].reduce((s, r) => s + r, 0) / ratingMap[b.id].length
          : null,
        _reviewCount: ratingMap[b.id]?.length || 0,
      }))

      setAll(enriched)
      setSearched(enriched)
      setLoading(false)
    }
    loadAll()
  }, [])

  // Unique business types for the filter panel
  const allTypes = useMemo(() =>
    [...new Set(all.map(b => b.type).filter(Boolean))].sort()
  , [all])

  // Apply filters + sort on top of searched results
  const results = useMemo(() => {
    let list = [...searched]

    if (filters.types.length > 0) {
      list = list.filter(b => filters.types.includes(b.type))
    }
    if (filters.minRating > 0) {
      list = list.filter(b => b._avgRating != null && b._avgRating >= filters.minRating)
    }
    if (filters.priceRange !== 'any') {
      list = list.filter(b => {
        const p = b._avgPrice
        if (p == null) return false
        if (filters.priceRange === 'under15') return p < 15
        if (filters.priceRange === '15-30') return p >= 15 && p <= 30
        if (filters.priceRange === 'over30') return p > 30
        return true
      })
    }
    if (filters.hasReviews) {
      list = list.filter(b => b._reviewCount > 0)
    }

    if (sort === 'price-asc') return list.sort((a, b) => (a._avgPrice ?? Infinity) - (b._avgPrice ?? Infinity))
    if (sort === 'price-desc') return list.sort((a, b) => (b._avgPrice ?? -Infinity) - (a._avgPrice ?? -Infinity))
    if (sort === 'rating') return list.sort((a, b) => (b._avgRating ?? 0) - (a._avgRating ?? 0))
    if (sort === 'distance') return list.sort((a, b) => (a._distance ?? Infinity) - (b._distance ?? Infinity))
    return list
  }, [searched, filters, sort])

  const activeFilterCount = (
    filters.types.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.priceRange !== 'any' ? 1 : 0) +
    (filters.hasReviews ? 1 : 0)
  )

  function requestLocation(onGranted) {
    if (!navigator.geolocation) { setLocationStatus('failed'); onGranted(null); return }
    locationCallbackRef.current = onGranted
    setLocationStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setLocationStatus('granted')
        locationCallbackRef.current?.(loc)
        locationCallbackRef.current = null
      },
      () => {
        setLocationStatus('failed')
        locationCallbackRef.current?.(null)
        locationCallbackRef.current = null
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false }
    )
  }

  async function handlePostcodeSearch(e) {
    e.preventDefault()
    const pc = postcodeInput.trim()
    if (!pc) return
    setPostcodeError(null)
    setGeocodingPostcode(true)
    const coords = await geocodePostcode(pc)
    setGeocodingPostcode(false)
    if (!coords) { setPostcodeError('Postcode not found — check and try again.'); return }
    const loc = { lat: coords.latitude, lng: coords.longitude }
    setUserLocation(loc)
    setLocationStatus('granted')
    runSearch(query.trim(), all, loc)
    setPendingSearch(null)
  }

  function runSearch(q, businesses, location) {
    if (!q.trim()) { setSearched(businesses); return }

    const { textQuery, maxMiles, needsLocation } = parseSearchQuery(q)
    let filtered = businesses

    if (textQuery) {
      const lower = textQuery.toLowerCase()
      filtered = filtered.filter(b =>
        b.name?.toLowerCase().includes(lower) ||
        b.type?.toLowerCase().includes(lower) ||
        b.location?.toLowerCase().includes(lower) ||
        b.description?.toLowerCase().includes(lower)
      )
    }

    if (needsLocation && maxMiles !== null) {
      if (location) {
        filtered = filtered
          .filter(b => b.latitude && b.longitude)
          .map(b => ({ ...b, _distance: haversineDistance(location.lat, location.lng, b.latitude, b.longitude) }))
          .filter(b => b._distance <= maxMiles)
          .sort((a, b) => a._distance - b._distance)
      } else {
        filtered = []
      }
    } else if (needsLocation && location) {
      filtered = filtered
        .filter(b => b.latitude && b.longitude)
        .map(b => ({ ...b, _distance: haversineDistance(location.lat, location.lng, b.latitude, b.longitude) }))
        .sort((a, b) => a._distance - b._distance)
    }

    setSearched(filtered)
  }

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (loading) return
      const q = query.trim()
      if (!q) { setSearched(all); return }

      const { needsLocation } = parseSearchQuery(q)

      if (needsLocation && locationStatus === 'idle') {
        setPendingSearch(q)
        requestLocation((loc) => { runSearch(q, all, loc); setPendingSearch(null) })
        return
      }
      if (needsLocation && locationStatus === 'requesting') { setPendingSearch(q); return }

      const loc = locationStatus === 'granted' ? userLocation : null
      runSearch(q, all, loc)
    }, 300)
  }, [query, all, loading])

  const isLocationQuery = query.trim() && parseSearchQuery(query).needsLocation
  const showDistances = locationStatus === 'granted' && isLocationQuery

  function toggleType(type) {
    setFilters(f => ({
      ...f,
      types: f.types.includes(type) ? f.types.filter(t => t !== type) : [...f.types, type],
    }))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-800 shrink-0 transition-colors">← Back</button>
          <BrandLink className="font-bold text-slate-900 text-lg shrink-0" />
          <Link to="/my-bookings" className="text-xs text-slate-500 hover:text-indigo-600 shrink-0">Home</Link>
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="nail salon within 1 mile, or John's Barber"
              className="w-full bg-slate-100 border border-transparent rounded-xl pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
            )}
          </div>
        </div>

        {/* Location banners */}
        {locationStatus === 'requesting' && (
          <div className="bg-indigo-50 border-t border-indigo-100 px-4 py-2 text-xs text-indigo-700 text-center">Getting your location…</div>
        )}
        {locationStatus === 'failed' && isLocationQuery && (
          <div className="bg-amber-50 border-t border-amber-100 px-4 py-3">
            <p className="text-xs text-amber-700 text-center mb-2">Couldn't get your location — enter your postcode instead:</p>
            <form onSubmit={handlePostcodeSearch} className="flex items-center gap-2 max-w-xs mx-auto">
              <input
                type="text"
                value={postcodeInput}
                onChange={e => { setPostcodeInput(e.target.value.toUpperCase()); setPostcodeError(null) }}
                className="flex-1 border border-amber-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 uppercase bg-white"
                maxLength={8}
              />
              <button type="submit" disabled={geocodingPostcode || !postcodeInput.trim()} className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors">
                {geocodingPostcode ? '…' : 'Go'}
              </button>
            </form>
            {postcodeError && <p className="text-xs text-red-500 text-center mt-1">{postcodeError}</p>}
          </div>
        )}
        {locationStatus === 'granted' && isLocationQuery && (
          <div className="bg-green-50 border-t border-green-100 px-4 py-2 text-xs text-green-700 text-center">📍 Showing results near you</div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Controls row */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setFiltersOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              filtersOpen || activeFilterCount > 0
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-white text-indigo-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex-1" />

          <p className="text-xs text-slate-400">
            {loading ? 'Loading…' : pendingSearch ? 'Getting location…' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
          </p>

          {!loading && (
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="default">Sort: Default</option>
              <option value="rating">Top rated</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              {locationStatus === 'granted' && <option value="distance">Nearest first</option>}
            </select>
          )}
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 space-y-5">
            {/* Category */}
            {allTypes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  {allTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        filters.types.includes(type)
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Minimum rating */}
            <div>
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Minimum rating</p>
              <div className="flex gap-2">
                {[0, 3, 4, 5].map(r => (
                  <button
                    key={r}
                    onClick={() => setFilters(f => ({ ...f, minRating: r }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      filters.minRating === r
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                    }`}
                  >
                    {r === 0 ? 'Any' : `${r}★+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Price range */}
            <div>
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Avg price</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'any', label: 'Any' },
                  { value: 'under15', label: 'Under £15' },
                  { value: '15-30', label: '£15 – £30' },
                  { value: 'over30', label: 'Over £30' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFilters(f => ({ ...f, priceRange: opt.value }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      filters.priceRange === opt.value
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Has reviews toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-700">Reviewed businesses only</p>
                <p className="text-xs text-slate-400 mt-0.5">Only show businesses with at least one review</p>
              </div>
              <button
                onClick={() => setFilters(f => ({ ...f, hasReviews: !f.hasReviews }))}
                className={`relative w-10 h-6 rounded-full transition-colors ${filters.hasReviews ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${filters.hasReviews ? 'left-5' : 'left-1'}`} />
              </button>
            </div>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {!loading && results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🔍</p>
            <p className="font-semibold text-slate-900">No results found</p>
            {activeFilterCount > 0 ? (
              <p className="text-slate-500 text-sm mt-1">Try removing some filters</p>
            ) : locationStatus === 'failed' && isLocationQuery ? (
              <p className="text-slate-500 text-sm mt-1">Enter your postcode above to search by distance</p>
            ) : locationStatus === 'granted' && isLocationQuery ? (
              <p className="text-slate-500 text-sm mt-1">No businesses found nearby — try a wider distance</p>
            ) : (
              <p className="text-slate-500 text-sm mt-1">Try a different search or clear your filters</p>
            )}
            <div className="flex items-center justify-center gap-4 mt-4">
              {query && <button onClick={() => setQuery('')} className="text-indigo-600 text-sm hover:underline">Clear search</button>}
              {activeFilterCount > 0 && <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-indigo-600 text-sm hover:underline">Clear filters</button>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map(business => (
              <BusinessCard
                key={business.id}
                business={business}
                distance={showDistances ? business._distance : null}
              />
            ))}
          </div>
        )}

        {!query && !filtersOpen && (
          <p className="text-xs text-slate-400 mt-6 text-center">
            Try "barbershop near me" or "personal trainer within 2 miles"
          </p>
        )}
      </div>
    </div>
  )
}
