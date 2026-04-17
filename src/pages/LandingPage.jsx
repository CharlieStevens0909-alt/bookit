import { Link } from 'react-router-dom'

const businesses = [
  { icon: '✂️', name: 'Barbershops' },
  { icon: '🏋️', name: 'Personal trainers' },
  { icon: '📚', name: 'Tutors' },
  { icon: '🧘', name: 'Therapists' },
  { icon: '💅', name: 'Nail technicians' },
  { icon: '🐶', name: 'Dog groomers' },
  { icon: '💆', name: 'Massage therapists' },
  { icon: '🎨', name: 'And more...' },
]

const steps = [
  {
    number: '1',
    title: 'Sign up and set up your business',
    description: 'Create a free account, add your business name, type, and location. Takes under two minutes.',
  },
  {
    number: '2',
    title: 'Add your services and hours',
    description: 'List what you offer, set your prices, and tell BookIt when you\'re available each week.',
  },
  {
    number: '3',
    title: 'Share your link — start getting bookings',
    description: 'Send customers your unique booking link. They pick a time, fill in their details, and you\'re confirmed.',
  },
]

const features = [
  {
    icon: '🔗',
    title: 'Your own booking page',
    description: 'A clean, shareable page at bookit.app/book/your-business that customers can visit any time.',
  },
  {
    icon: '🚫',
    title: 'No double bookings — ever',
    description: 'Slots are generated in real time based on your hours and existing bookings. If it\'s taken, it\'s gone.',
  },
  {
    icon: '📱',
    title: 'Works on any device',
    description: 'Your booking page is fully mobile-friendly. Customers can book from their phone in seconds.',
  },
  {
    icon: '📅',
    title: 'Dashboard calendar',
    description: 'See all your upcoming appointments in one place. Cancel bookings with a single click.',
  },
  {
    icon: '👤',
    title: 'No account needed to book',
    description: 'Customers don\'t need to create an account. Just pick a time and confirm — that\'s it.',
  },
  {
    icon: '💸',
    title: 'Completely free to start',
    description: 'No credit card. No hidden fees. Get your booking page live today at no cost.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <span className="font-bold text-slate-900 text-xl">BookIt</span>
          <div className="flex items-center gap-3">
            <Link to="/search" className="text-sm text-slate-600 hover:text-slate-900 hidden sm:block">
              Find a business
            </Link>
            <Link to="/login" className="text-sm text-slate-600 hover:text-slate-900">
              Log in
            </Link>
            <Link
              to="/signup"
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-medium px-3 py-1 rounded-full mb-5">
          ✨ Free for small businesses
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight tracking-tight mb-4">
          Online booking for your business —{' '}
          <span className="text-indigo-600">without the fuss</span>
        </h1>
        <p className="text-base text-slate-500 max-w-lg mx-auto mb-7 leading-relaxed">
          Set up in minutes. Share your link. Let customers book appointments 24/7 — no phone calls, no back-and-forth.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/signup"
            className="w-full sm:w-auto bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            Add your business — it's free
          </Link>
          <Link
            to="/book/example"
            className="w-full sm:w-auto border border-slate-200 text-slate-700 font-medium px-6 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            See an example →
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-3">No credit card required</p>
      </section>

      {/* Mock booking page preview */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-300" />
            <div className="w-3 h-3 rounded-full bg-yellow-300" />
            <div className="w-3 h-3 rounded-full bg-green-300" />
            <div className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1 mx-2 text-xs text-slate-400">
              bookit.app/book/jims-barber
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-white border-b border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Barbershop</p>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">Jim's Barber</h3>
              <p className="text-sm text-slate-500">Greenock, Inverclyde</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Select a service</p>
              <div className="space-y-2">
                {[
                  { name: 'Classic Haircut', price: '£15.00', notes: 'Scissor or clippers' },
                  { name: 'Beard Trim', price: '£8.00', notes: 'Shape and tidy' },
                  { name: 'Cut & Beard', price: '£20.00', notes: 'Full groom' },
                ].map(s => (
                  <div key={s.name} className="border border-slate-200 rounded-lg px-4 py-3 flex justify-between items-center hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer group">
                    <div>
                      <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-700">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.notes}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{s.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-slate-50 border-y border-slate-100 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Built for local service businesses</h2>
          <p className="text-slate-500 text-sm mb-10">If you take appointments, BookIt is for you</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {businesses.map(b => (
              <div key={b.name} className="bg-white rounded-xl border border-slate-200 py-4 px-3 text-center">
                <div className="text-2xl mb-1.5">{b.icon}</div>
                <p className="text-sm text-slate-700 font-medium">{b.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Up and running in minutes</h2>
          <p className="text-slate-500 text-sm">Three steps from signup to taking bookings</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-sm mb-4">
                {step.number}
              </div>
              <h3 className="font-semibold text-slate-900 mb-2 text-sm">{step.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="bg-slate-50 border-y border-slate-100 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Everything you need, nothing you don't</h2>
            <p className="text-slate-500 text-sm">Simple, focused, and built for small businesses</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{f.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
          Ready to stop missing bookings?
        </h2>
        <p className="text-slate-500 mb-7 max-w-md mx-auto text-sm leading-relaxed">
          Join businesses in Inverclyde and beyond who use BookIt to take appointments online. Free to get started.
        </p>
        <Link
          to="/signup"
          className="inline-block bg-indigo-600 text-white font-semibold px-8 py-4 rounded-xl hover:bg-indigo-700 transition-colors text-sm"
        >
          Add your business — it's free →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-bold text-slate-900">BookIt</span>
          <p className="text-xs text-slate-400">© 2026 BookIt. Built for local businesses.</p>
          <div className="flex gap-4">
            <Link to="/login" className="text-xs text-slate-400 hover:text-slate-600">Log in</Link>
            <Link to="/signup" className="text-xs text-slate-400 hover:text-slate-600">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
