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
import CustomerPage from './pages/CustomerPage'
import LandingPage from './pages/LandingPage'
import SearchPage from './pages/SearchPage'

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
        </Route>
        <Route path="/search" element={<SearchPage />} />
        <Route path="/my-bookings" element={<CustomerPage />} />
        <Route path="/book/:slug" element={<BookingPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
