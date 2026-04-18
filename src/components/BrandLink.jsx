import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function BrandLink({ className }) {
  const { user } = useAuth()
  const role = user?.user_metadata?.role
  const to = role === 'business' ? '/dashboard' : role === 'customer' ? '/my-bookings' : '/'

  return (
    <Link to={to} className={className}>
      Inverclyde.Bookit
    </Link>
  )
}
