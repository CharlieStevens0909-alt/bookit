import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../lib/BusinessContext'

const RANGES = [
  { label: 'Day', key: '1d', days: 1 },
  { label: 'Week', key: '7d', days: 7 },
  { label: 'Month', key: '30d', days: 30 },
  { label: 'Year', key: '12m', days: 365 },
]

function formatDateLabel(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getDates(days) {
  const arr = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    arr.push(d.toISOString().split('T')[0])
  }
  return arr
}

function getMonths(count) {
  const arr = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    arr.push({ year: d.getFullYear(), month: d.getMonth() })
  }
  return arr
}

function downloadAsExcel(rows, headers, filename) {
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename + '.csv'; a.click()
  URL.revokeObjectURL(url)
}

function downloadChartAsPng(svgEl, filename) {
  const W = 800, H = 320
  const clone = svgEl.cloneNode(true)
  clone.setAttribute('width', W); clone.setAttribute('height', H)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('font-family', 'system-ui, -apple-system, sans-serif')
  const svgStr = new XMLSerializer().serializeToString(clone)
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
  const img = new Image()
  img.onload = () => {
    ctx.drawImage(img, 0, 0, W, H)
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = filename + '.png'
    a.click()
    URL.revokeObjectURL(url)
  }
  img.src = url
}

function LineChart({ data, color, yLabel, svgRef }) {
  const [hovered, setHovered] = useState(null)
  const W = 600, H = 260
  const pL = 56, pR = 20, pT = 24, pB = 44
  const cW = W - pL - pR
  const cH = H - pT - pB

  const max = Math.max(...data.map(d => d.value), 1)
  const yTicks = 4
  const step = max <= yTicks ? 1 : Math.ceil(max / yTicks)
  const adjustedMax = Math.max(step * yTicks, 1)

  const pts = data.map((d, i) => ({
    x: data.length > 1 ? pL + (i / (data.length - 1)) * cW : pL + cW / 2,
    y: pT + cH - (d.value / adjustedMax) * cH,
    ...d, index: i,
  }))

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = pts.length > 1
    ? `${linePath} L${pts[pts.length - 1].x},${pT + cH} L${pts[0].x},${pT + cH} Z`
    : ''

  const gradId = `grad${color.replace(/[^a-z0-9]/gi, '')}`

  function handleMouseMove(e) {
    const el = svgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const nearest = pts.reduce((a, b) => Math.abs(b.x - svgX) < Math.abs(a.x - svgX) ? b : a)
    setHovered(nearest)
  }

  const showEvery = Math.ceil(data.length / 10)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full cursor-crosshair select-none"
      style={{ background: 'white' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = i * step
        const y = pT + cH - (val / adjustedMax) * cH
        return (
          <g key={i}>
            <line x1={pL} y1={y} x2={W - pR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={pL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{val}</text>
          </g>
        )
      })}

      <line x1={pL} y1={pT + cH} x2={W - pR} y2={pT + cH} stroke="#e2e8f0" strokeWidth="1" />
      {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {data.length <= 30 && pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} opacity="0.7" />
      ))}

      {pts.map((p, i) => i % showEvery === 0 && (
        <text key={i} x={p.x} y={pT + cH + 16} textAnchor="middle" fontSize="9" fill="#94a3b8">{p.label}</text>
      ))}

      {hovered && (() => {
        const tipW = 100, tipH = 42
        const tipX = Math.min(Math.max(hovered.x - tipW / 2, pL), W - pR - tipW)
        const tipY = Math.max(pT + 4, hovered.y - tipH - 10)
        return (
          <g>
            <line x1={hovered.x} y1={pT} x2={hovered.x} y2={pT + cH} stroke={color} strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
            <circle cx={hovered.x} cy={hovered.y} r="5" fill={color} stroke="white" strokeWidth="2.5" />
            <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="7" fill="#0f172a" opacity="0.92" />
            <text x={tipX + tipW / 2} y={tipY + 14} textAnchor="middle" fontSize="9" fill="#94a3b8">{hovered.label}</text>
            <text x={tipX + tipW / 2} y={tipY + 31} textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">{hovered.value}</text>
          </g>
        )
      })()}
    </svg>
  )
}

function RatingDistChart({ reviews, svgRef }) {
  const [hovered, setHovered] = useState(null)
  const W = 500, H = 200
  const pL = 40, pR = 80, pT = 16, pB = 16
  const cW = W - pL - pR
  const cH = H - pT - pB
  const rowH = cH / 5

  const counts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }))
  const max = Math.max(...counts.map(c => c.count), 1)

  function handleMouseMove(e) {
    const el = svgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const svgY = ((e.clientY - rect.top) / rect.height) * H
    const rowIndex = Math.floor((svgY - pT) / rowH)
    if (rowIndex >= 0 && rowIndex < 5) setHovered(counts[rowIndex])
    else setHovered(null)
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full cursor-crosshair select-none"
      style={{ background: 'white' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
    >
      {counts.map(({ star, count }, i) => {
        const y = pT + i * rowH
        const barW = (count / max) * cW
        const isHov = hovered?.star === star
        return (
          <g key={star}>
            <rect x={pL} y={y + 2} width={cW} height={rowH - 4} fill={isHov ? '#fef3c7' : 'transparent'} rx="3" />
            <text x={pL - 6} y={y + rowH / 2 + 4} textAnchor="end" fontSize="11" fill={isHov ? '#b45309' : '#64748b'}>{'★'.repeat(star)}</text>
            <rect x={pL} y={y + 4} width={Math.max(barW, count > 0 ? 4 : 0)} height={rowH - 8} fill={isHov ? '#f59e0b' : '#fbbf24'} rx="3" />
            <text x={pL + Math.max(barW, count > 0 ? 4 : 0) + 6} y={y + rowH / 2 + 4} fontSize="11" fill={isHov ? '#b45309' : '#64748b'} fontWeight={isHov ? 'bold' : 'normal'}>{count}</text>
            {isHov && count > 0 && (() => {
              const pct = Math.round((count / reviews.length) * 100)
              return (
                <text x={W - pR + 4} y={y + rowH / 2 + 4} fontSize="10" fill="#b45309">{pct}%</text>
              )
            })()}
          </g>
        )
      })}
    </svg>
  )
}

export default function ReviewsFullPage() {
  const { business } = useBusiness()
  const navigate = useNavigate()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterRating, setFilterRating] = useState(0)
  const [sort, setSort] = useState('newest')
  const [range, setRange] = useState('30d')
  const chartRef = useRef()
  const trendSvgRef = useRef()

  useEffect(() => {
    if (!business) return
    supabase.from('reviews').select('*').eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setReviews(data || []); setLoading(false) })
  }, [business])

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null

  const rangeObj = RANGES.find(r => r.key === range)

  const trendData = (() => {
    if (range === '12m') {
      return getMonths(12).map(({ year, month }) => {
        const label = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
        const value = reviews.filter(r => {
          const d = new Date(r.created_at)
          return d.getFullYear() === year && d.getMonth() === month
        }).length
        return { label, value }
      })
    }
    const dates = getDates(rangeObj.days)
    return dates.map(date => ({
      label: formatDateLabel(date),
      value: reviews.filter(r => r.created_at.startsWith(date)).length,
    }))
  })()

  const filtered = reviews
    .filter(r => filterRating === 0 || r.rating === filterRating)
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sort === 'highest') return b.rating - a.rating
      if (sort === 'lowest') return a.rating - b.rating
      return 0
    })

  if (loading) return <p className="text-slate-400">Loading...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="text-sm text-slate-500 hover:text-slate-800">← Back</button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reviews</h1>
          <p className="text-slate-500 text-sm">{business.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Total reviews</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{reviews.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Average rating</p>
          <p className="text-2xl font-bold text-yellow-500 mt-0.5">
            {avgRating != null ? avgRating.toFixed(1) : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">5 star reviews</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">
            {reviews.filter(r => r.rating === 5).length}
          </p>
        </div>
      </div>

      {reviews.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Rating breakdown</h2>
            <button
              onClick={() => chartRef.current && downloadChartAsPng(chartRef.current, 'rating-breakdown')}
              className="text-xs text-yellow-600 hover:text-yellow-800 font-medium border border-yellow-200 px-3 py-1.5 rounded-lg hover:bg-yellow-50 transition-colors">
              ↓ PNG
            </button>
          </div>
          <RatingDistChart reviews={reviews} svgRef={chartRef} />
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Reviews over time</h2>
          <div className="flex gap-2">
            <button onClick={() => trendSvgRef.current && downloadChartAsPng(trendSvgRef.current, `reviews-trend-${range}`)}
              className="text-xs text-yellow-600 font-medium border border-yellow-200 px-3 py-1.5 rounded-lg hover:bg-yellow-50 transition-colors">↓ PNG</button>
            <button onClick={() => downloadAsExcel(trendData.map(d => [d.label, d.value]), ['Period', 'Reviews'], `reviews-trend-${range}`)}
              className="text-xs text-green-700 font-medium border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors">↓ Excel</button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${range === r.key ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-slate-600 border-slate-200 hover:border-yellow-300'}`}>
              {r.label}
            </button>
          ))}
        </div>
        <LineChart data={trendData} color="#f59e0b" yLabel="" svgRef={trendSvgRef} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Export reviews</p>
          <p className="text-xs text-slate-400 mt-0.5">Name, rating, comment and date</p>
        </div>
        <button
          onClick={() => downloadAsExcel(
            filtered.map(r => [
              r.customer_name,
              r.rating,
              r.comment || '',
              new Date(r.created_at).toLocaleDateString('en-GB'),
            ]),
            ['Name', 'Rating', 'Comment', 'Date'],
            'reviews-export'
          )}
          className="text-sm text-green-700 font-medium border border-green-300 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors">
          ↓ Download Excel
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {[0, 5, 4, 3, 2, 1].map(star => (
            <button key={star} onClick={() => setFilterRating(star)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterRating === star ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
              {star === 0 ? 'All' : `${'★'.repeat(star)}`}
            </button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="ml-auto border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="highest">Highest rating</option>
          <option value="lowest">Lowest rating</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate-400 text-sm">No reviews match this filter.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold shrink-0">
                  {r.customer_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{r.customer_name}</p>
                    <span className="text-yellow-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <span className="text-xs text-slate-400 ml-auto">
                      {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-slate-600 mt-1">{r.comment}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
