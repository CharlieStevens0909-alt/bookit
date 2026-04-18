import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardLayout from './pages/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import ServicesPage from './pages/ServicesPage'
import HoursPage from './pages/AvailabilityPage'
import ProfilePage from './pages/ProfilePage'
import BookingPage from './pages/BookingPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ReviewsFullPage from './pages/ReviewsFullPage'
import UpcomingBookingsPage from './pages/UpcomingBookingsPage'
import CalendarPage from './pages/CalendarPage'
import CustomerPage from './pages/CustomerPage'
import LandingPage from './pages/LandingPage'
import SearchPage from './pages/SearchPage'
import ReviewPage from './pages/ReviewPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/onboarding"
          element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>}
        />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}
        >
          <Route index element={<DashboardPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="hours" element={<HoursPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="all-reviews" element={<ReviewsFullPage />} />
          <Route path="upcoming" element={<UpcomingBookingsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
        </Route>
        <Route path="/search" element={<SearchPage />} />
        <Route path="/my-bookings" element={<CustomerPage />} />
        <Route path="/book/:slug" element={<BookingPage />} />
        <Route path="/review/:bookingId" element={<ReviewPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
