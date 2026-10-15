import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Movies from './pages/Movies.jsx'
import Movie from './pages/Movie.jsx'
import Show from './pages/Show.jsx'
import AuthPage from './pages/AuthPage.jsx'
import MyBookings from './pages/MyBookings.jsx'

function RequireAuth({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return null
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return children
}

export default function App() {
  const { user, logout } = useAuth()
  const displayName = user?.name || user?.email?.split('@')[0]

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">M</span> Marquee
          </Link>
          <nav className="nav-links">
            <NavLink to="/" end>Movies</NavLink>
            {user && <NavLink to="/bookings">My bookings</NavLink>}
            {user ? (
              <>
                <span className="nav-user">{displayName}</span>
                <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
              </>
            ) : (
              <Link to="/login" className="btn btn-sm">Sign in</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="container main">
        <Routes>
          <Route path="/" element={<Movies />} />
          <Route path="/movies/:id" element={<Movie />} />
          <Route path="/shows/:id" element={<Show />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/bookings" element={<RequireAuth><MyBookings /></RequireAuth>} />
          <Route path="*" element={<p className="muted center">Page not found.</p>} />
        </Routes>
      </main>
    </>
  )
}
