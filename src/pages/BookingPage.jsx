import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// JS getDay() returns 0=Sun,1=Mon...6=Sat — convert to DB 0=Mon...6=Sun
function jsDayToDbDay(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

function formatTime(t) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
}

function toDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function generateSlots(startTime, endTime, durationMins, existingBookings) {
  const slots = []
  let cur = timeToMinutes(startTime.slice(0, 5))
  const end = timeToMinutes(endTime.slice(0, 5))

  while (cur + durationMins <= end) {
    const slotEnd = cur + durationMins
    const overlaps = existingBookings.some(b => {
      const bStart = timeToMinutes(b.start_time)
      const bEnd = timeToMinutes(b.end_time)
      return cur < bEnd && slotEnd > bStart
    })
    if (!overlaps) slots.push({ start: minutesToTime(cur), end: minutesToTime(slotEnd) })
    cur += durationMins
  }

  return slots
}

// Simple calendar component
function Calendar({ selected, onSelect, openDays }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Start week on Monday: shift firstDay
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1)

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  const monthLabel = viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  function canGoBack() {
    return viewDate > new Date(today.getFullYear(), today.getMonth(), 1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          disabled={!canGoBack()}
          className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-900">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1.5 rounded-lg hover:bg-slate-100"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-xs text-slate-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />

          const isPast = date < today
          const dbDay = jsDayToDbDay(date.getDay())
          const isClosed = !openDays.includes(dbDay)
          const disabled = isPast || isClosed
          const dateStr = toDateString(date)
          const isSelected = selected === dateStr
          const isToday = toDateString(date) === toDateString(today)

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(dateStr)}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm transition-colors
                ${disabled ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-indigo-50 cursor-pointer'}
                ${isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-600' : ''}
                ${isToday && !isSelected ? 'font-bold text-indigo-600' : ''}
                ${!disabled && !isSelected ? 'text-slate-700' : ''}
              `}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Step indicator
function Steps({ current }) {
  const steps = ['Service', 'Date', 'Time', 'Details']
  return (
    <div className="flex items-center gap-1 mb-8">
      {steps.map((label, i) => {
        const n = i + 1
        const done = current > n
        const active = current === n
        return (
          <div key={n} className="flex items-center gap-1 flex-1 last:flex-none">
            <div className={`
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0
              ${done ? 'bg-indigo-600 text-white' : active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}
            `}>
              {done ? '✓' : n}
            </div>
            <span className={`text-xs hidden sm:block ${active ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
              {label}
            </span>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-1" />}
          </div>
        )
      })}
    </div>
  )
}

export default function BookingPage() {
  const { slug } = useParams()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [availability, setAvailability] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!biz) { setNotFound(true); setLoading(false); return }
      setBusiness(biz)

      const [{ data: svcs }, { data: avail }] = await Promise.all([
        supabase.from('services').select('*').eq('business_id', biz.id).order('name'),
        supabase.from('availability').select('*').eq('business_id', biz.id),
      ])

      setServices(svcs || [])
      setAvailability(avail || [])
      setLoading(false)
    }
    load()
  }, [slug])

  async function loadSlots(date) {
    setSlotsLoading(true)
    setSlots([])
    setSelectedSlot(null)

    const jsDate = new Date(date + 'T00:00:00')
    const dbDay = jsDayToDbDay(jsDate.getDay())
    const dayAvail = availability.find(a => a.day_of_week === dbDay)

    if (!dayAvail) { setSlotsLoading(false); return }

    const { data: existing } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('business_id', business.id)
      .eq('date', date)
      .eq('status', 'confirmed')

    const generated = generateSlots(
      dayAvail.start_time,
      dayAvail.end_time,
      selectedService.duration_minutes,
      existing || []
    )

    setSlots(generated)
    setSlotsLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        business_id: business.id,
        service_id: selectedService.id,
        customer_name: name,
        customer_email: email,
        date: selectedDate,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        status: 'confirmed',
      })
      .select()
      .single()

    if (error) {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    setBooking(data)
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔍</p>
          <h1 className="text-xl font-bold text-slate-900">Page not found</h1>
          <p className="text-slate-500 text-sm mt-1">This booking page doesn't exist.</p>
        </div>
      </div>
    )
  }

  if (booking) {
    const bookingDate = new Date(booking.date + 'T00:00:00')
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">You're booked!</h1>
          <p className="text-slate-500 text-sm mb-6">A confirmation has been noted below.</p>

          <div className="bg-slate-50 rounded-lg p-4 text-left space-y-2 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-slate-500">Business</span>
              <span className="font-medium text-slate-900">{business.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Service</span>
              <span className="font-medium text-slate-900">{selectedService.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date</span>
              <span className="font-medium text-slate-900">
                {bookingDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Time</span>
              <span className="font-medium text-slate-900">{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Name</span>
              <span className="font-medium text-slate-900">{booking.customer_name}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400">If you need to cancel, contact {business.name} directly.</p>
        </div>
      </div>
    )
  }

  const openDays = availability.map(a => a.day_of_week)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Business header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-lg mx-auto px-4 py-5">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">{business.type}</p>
          <h1 className="text-2xl font-bold text-slate-900">{business.name}</h1>
          {business.location && <p className="text-sm text-slate-500 mt-0.5">{business.location}</p>}
          {business.description && <p className="text-sm text-slate-600 mt-2">{business.description}</p>}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <Steps current={step} />

        {/* Step 1: Service */}
        {step === 1 && (
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-4">Select a service</h2>
            {services.length === 0 ? (
              <p className="text-slate-400 text-sm">No services available yet.</p>
            ) : (
              <div className="space-y-2">
                {services.map(service => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => { setSelectedService(service); setStep(2) }}
                    className="w-full bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900 text-sm group-hover:text-indigo-700">{service.name}</span>
                      <span className="font-semibold text-slate-900 text-sm">£{Number(service.price).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{service.duration_minutes} minutes</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Date */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600 text-sm">← Back</button>
              <h2 className="text-base font-semibold text-slate-900">Pick a date</h2>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <Calendar
                selected={selectedDate}
                openDays={openDays}
                onSelect={(date) => {
                  setSelectedDate(date)
                  loadSlots(date)
                  setStep(3)
                }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Greyed-out dates are unavailable
            </p>
          </div>
        )}

        {/* Step 3: Time slot */}
        {step === 3 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep(2)} className="text-slate-400 hover:text-slate-600 text-sm">← Back</button>
              <h2 className="text-base font-semibold text-slate-900">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
            </div>

            {slotsLoading ? (
              <p className="text-slate-400 text-sm">Loading slots...</p>
            ) : slots.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                <p className="text-slate-400 text-sm">No available slots on this day.</p>
                <button onClick={() => setStep(2)} className="mt-2 text-indigo-600 text-sm hover:underline">
                  Choose another date
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map(slot => (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => { setSelectedSlot(slot); setStep(4) }}
                    className="bg-white border border-slate-200 rounded-lg py-2.5 text-sm font-medium text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  >
                    {formatTime(slot.start)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Details */}
        {step === 4 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep(3)} className="text-slate-400 hover:text-slate-600 text-sm">← Back</button>
              <h2 className="text-base font-semibold text-slate-900">Your details</h2>
            </div>

            {/* Booking summary */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-5 text-sm">
              <div className="flex justify-between text-slate-700">
                <span>{selectedService.name}</span>
                <span className="font-medium">£{Number(selectedService.price).toFixed(2)}</span>
              </div>
              <div className="text-slate-500 text-xs mt-1">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}
                {formatTime(selectedSlot.start)} – {formatTime(selectedSlot.end)}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Confirming...' : 'Confirm booking'}
              </button>

              <p className="text-xs text-slate-400 text-center">
                No account needed. Free to book.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
