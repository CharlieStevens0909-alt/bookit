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
  const a = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click()
  URL.revokeObjectURL(url)
}

function downloadChartAsPng(svgEl, filename) {
  const W = 1200, H = 480
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
    const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = filename + '.png'; a.click()
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

      {/* Y grid + labels */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = i * step
        const y = pT + cH - (val / adjustedMax) * cH
        return (
          <g key={i}>
            <line x1={pL} y1={y} x2={W - pR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={pL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              {yLabel === '£' ? `£${val}` : val}
            </text>
          </g>
        )
      })}

      {/* X axis */}
      <line x1={pL} y1={pT + cH} x2={W - pR} y2={pT + cH} stroke="#e2e8f0" strokeWidth="1" />

      {/* Area fill */}
      {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}

      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {data.length <= 30 && pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} opacity="0.7" />
      ))}

      {/* X labels */}
      {pts.map((p, i) => i % showEvery === 0 && (
        <text key={i} x={p.x} y={pT + cH + 16} textAnchor="middle" fontSize="9" fill="#94a3b8">{p.label}</text>
      ))}

      {/* Hover */}
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
            <text x={tipX + tipW / 2} y={tipY + 31} textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">
              {yLabel === '£' ? `£${Number(hovered.value).toFixed(2)}` : hovered.value}
            </text>
          </g>
        )
      })()}
    </svg>
  )
}

export default function AnalyticsPage() {
  const { business } = useBusiness()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('30d')
  const bookingsSvgRef = useRef()
  const revenueSvgRef = useRef()

  useEffect(() => {
    if (!business) return
    supabase.from('bookings').select('*, services(name, price)')
      .eq('business_id', business.id).eq('status', 'confirmed')
      .then(({ data }) => { setBookings(data || []); setLoading(false) })
  }, [business])

  const rangeObj = RANGES.find(r => r.key === range)

  const { bookingData, revenueData, totalBookings, totalRevenue } = (() => {
    if (range === '12m') {
      const months = getMonths(12)
      const bd = months.map(({ year, month }) => {
        const label = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
        const value = bookings.filter(b => {
          const d = new Date(b.date + 'T00:00:00')
          return d.getFullYear() === year && d.getMonth() === month
        }).length
        return { label, value }
      })
      const rd = months.map(({ year, month }) => {
        const label = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
        const value = bookings.filter(b => {
          const d = new Date(b.date + 'T00:00:00')
          return d.getFullYear() === year && d.getMonth() === month
        }).reduce((s, b) => s + Number(b.services?.price || 0), 0)
        return { label, value: Math.round(value * 100) / 100 }
      })
      return { bookingData: bd, revenueData: rd, totalBookings: bd.reduce((s, d) => s + d.value, 0), totalRevenue: rd.reduce((s, d) => s + d.value, 0) }
    }

    const dates = getDates(rangeObj.days)
    const bd = dates.map(date => ({ label: formatDateLabel(date), value: bookings.filter(b => b.date === date).length }))
    const rd = dates.map(date => ({
      label: formatDateLabel(date),
      value: Math.round(bookings.filter(b => b.date === date).reduce((s, b) => s + Number(b.services?.price || 0), 0) * 100) / 100,
    }))
    return { bookingData: bd, revenueData: rd, totalBookings: bd.reduce((s, d) => s + d.value, 0), totalRevenue: rd.reduce((s, d) => s + d.value, 0) }
  })()

  if (loading) return <p className="text-slate-400">Loading...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="text-sm text-slate-500 hover:text-slate-800">← Back</button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm">{business.name}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {RANGES.map(r => (
          <button key={r.key} onClick={() => setRange(r.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${range === r.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">{rangeObj.label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalBookings}</p>
          <p className="text-xs text-slate-400">bookings</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">{rangeObj.label}</p>
          <p className="text-2xl font-bold text-emerald-600 mt-0.5">£{totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-slate-400">revenue</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Bookings over time</h2>
          <div className="flex gap-2">
            <button onClick={() => bookingsSvgRef.current && downloadChartAsPng(bookingsSvgRef.current, `bookings-${range}`)}
              className="text-xs text-indigo-600 font-medium border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">↓ PNG</button>
            <button onClick={() => downloadAsExcel(bookingData.map(d => [d.label, d.value]), ['Period', 'Bookings'], `bookings-${range}`)}
              className="text-xs text-green-700 font-medium border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors">↓ Excel</button>
          </div>
        </div>
        <LineChart data={bookingData} color="#6366f1" yLabel="" svgRef={bookingsSvgRef} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Revenue over time</h2>
          <div className="flex gap-2">
            <button onClick={() => revenueSvgRef.current && downloadChartAsPng(revenueSvgRef.current, `revenue-${range}`)}
              className="text-xs text-emerald-600 font-medium border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">↓ PNG</button>
            <button onClick={() => downloadAsExcel(revenueData.map(d => [d.label, d.value]), ['Period', 'Revenue (£)'], `revenue-${range}`)}
              className="text-xs text-green-700 font-medium border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors">↓ Excel</button>
          </div>
        </div>
        <LineChart data={revenueData} color="#10b981" yLabel="£" svgRef={revenueSvgRef} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Export all data</p>
          <p className="text-xs text-slate-400 mt-0.5">Period, bookings and revenue in one sheet</p>
        </div>
        <button onClick={() => downloadAsExcel(
          bookingData.map((d, i) => [d.label, d.value, revenueData[i]?.value ?? 0]),
          ['Period', 'Bookings', 'Revenue (£)'],
          `analytics-${range}`
        )} className="text-sm text-green-700 font-medium border border-green-300 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors">
          ↓ Download Excel
        </button>
      </div>
    </div>
  )
}
