import { Link, useParams } from 'react-router-dom'
import { useFetch } from '../useFetch.js'
import { fmt } from '../api.js'
import { posterStyle } from './Movies.jsx'

export default function Movie() {
  const { id } = useParams()
  const movie = useFetch(`/movies/${id}`)
  const shows = useFetch(`/shows?movie_id=${id}`)

  if (movie.loading) return <p className="muted">Loading…</p>
  if (movie.error) return <p className="alert">{movie.error.message}</p>
  const m = movie.data

  // group shows by day
  const byDay = {}
  for (const s of shows.data || []) {
    const day = fmt.date(s.show_time)
    ;(byDay[day] ||= []).push(s)
  }

  return (
    <>
      <Link to="/" className="back">← All movies</Link>
      <section className="movie-head">
        <div className="poster poster-lg" style={posterStyle(m.movie_id)}>
          <span>{m.title.charAt(0)}</span>
        </div>
        <div>
          <p className="eyebrow">{m.language}</p>
          <h1>{m.title}</h1>
          <p className="muted">{fmt.duration(m.duration_min)}</p>
        </div>
      </section>

      <h2 className="section-title">Showtimes</h2>
      {shows.loading && <p className="muted">Loading…</p>}
      {shows.error && <p className="alert">{shows.error.message}</p>}
      {shows.data?.length === 0 && <p className="muted">No upcoming shows for this movie.</p>}

      {Object.entries(byDay).map(([day, list]) => (
        <div key={day} className="day">
          <h3 className="day-label">{day}</h3>
          <div className="show-list">
            {list.map((s) => (
              <Link key={s.show_id} to={`/shows/${s.show_id}`} className="show-chip">
                <strong>{fmt.time(s.show_time)}</strong>
                <span className="small muted">
                  {s.cinema_name}, {s.city} · {s.screen_name}
                </span>
                <span className="small">from {fmt.money(s.base_price)}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
