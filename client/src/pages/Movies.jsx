import { Link } from 'react-router-dom'
import { useFetch } from '../useFetch.js'
import { fmt } from '../api.js'

// deterministic warm gradient per movie so cards have some colour without posters
export function posterStyle(id) {
  const hues = [18, 32, 345, 200, 265, 150, 8, 220]
  const h = hues[id % hues.length]
  return {
    background: `linear-gradient(160deg, hsl(${h} 55% 32%), hsl(${(h + 30) % 360} 45% 12%))`,
  }
}

export default function Movies() {
  const { data: movies, error, loading } = useFetch('/movies')

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Now showing</p>
        <h1>Find a film. Pick a seat.</h1>
      </section>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="alert">{error.message}</p>}
      {movies?.length === 0 && <p className="muted">No movies yet.</p>}

      <div className="grid">
        {movies?.map((m) => (
          <Link key={m.movie_id} to={`/movies/${m.movie_id}`} className="card movie-card">
            <div className="poster" style={posterStyle(m.movie_id)}>
              <span>{m.title.charAt(0)}</span>
            </div>
            <div className="card-body">
              <h3>{m.title}</h3>
              <p className="muted small">
                {m.language} · {fmt.duration(m.duration_min)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
