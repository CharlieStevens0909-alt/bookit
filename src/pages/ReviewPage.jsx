import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PageNav from '../components/PageNav'

function Stars({ value, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`text-4xl transition-colors leading-none ${readonly ? 'cursor-default' : 'cursor-pointer'} ${
            star <= (hovered || value) ? 'text-yellow-400' : 'text-slate-200'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

const STAR_LABELS = { 1: 'Poor', 2: 'Below average', 3: 'Average', 4: 'Good', 5: 'Excellent' }

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

function formatTime(t) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
}

export default function ReviewPage() {
  const { bookingId } = useParams()
  const [booking, setBooking] = useState(null)
  const [existing, setExisting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: b } = await supabase
        .from('bookings')
        .select('*, services(name), businesses(name, slug)')
        .eq('id', bookingId)
        .single()

      if (!b) { setNotFound(true); setLoading(false); return }
      setBooking(b)

      const { data: rev } = await supabase
        .from('reviews')
        .select('*')
        .eq('booking_id', bookingId)
        .single()

      if (rev) setExisting(rev)
      setLoading(false)
    }
    load()
  }, [bookingId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (rating === 0) { setError('Please select a star rating.'); return }
    setError(null)
    setSubmitting(true)

    const { error } = await supabase.from('reviews').insert({
      business_id: booking.business_id,
      booking_id: booking.id,
      customer_name: booking.customer_name,
      rating,
      comment: comment.trim() || null,
    })

    if (error) {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400">Loading…</p>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-slate-50">
      <PageNav />
      <div className="flex items-center justify-center px-4 py-20">
        <div className="text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold text-slate-900">Booking not found</p>
          <Link to="/my-bookings" className="mt-4 inline-block text-indigo-600 text-sm hover:underline">Back to my bookings</Link>
        </div>
      </div>
    </div>
  )

  if (submitted || existing) {
    const rev = existing || { rating, comment }
    return (
      <div className="min-h-screen bg-slate-50">
        <PageNav />
        <div className="flex items-center justify-center px-4 py-16">
          <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">★</div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">
              {existing && !submitted ? 'Review already submitted' : 'Review submitted!'}
            </h1>
            <p className="text-slate-500 text-sm mb-5">Thanks for your feedback.</p>
            <Stars value={rev.rating} readonly />
            {rev.comment && <p className="text-slate-600 text-sm mt-3 italic">"{rev.comment}"</p>}
            <Link
              to={`/book/${booking.businesses?.slug}`}
              className="mt-6 inline-block text-indigo-600 text-sm hover:underline"
            >
              Back to {booking.businesses?.name}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageNav />
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h1 className="text-xl font-bold text-slate-900 mb-1">Leave a review</h1>
            <p className="text-slate-500 text-sm mb-5">
              {booking.businesses?.name} · {booking.services?.name} · {formatDate(booking.date)} at {formatTime(booking.start_time)}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Your rating</label>
                <Stars value={rating} onChange={setRating} />
                {rating > 0 && (
                  <p className="text-xs text-slate-400 mt-1">{STAR_LABELS[rating]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Comments <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-slate-300 text-right mt-0.5">{comment.length}/500</p>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Submitting…' : 'Submit review'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
