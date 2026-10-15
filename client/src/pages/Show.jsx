import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api, fmt } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useFetch } from '../useFetch.js'
import Countdown from '../Countdown.jsx'
import PayPanel from '../PayPanel.jsx'

const rowOf = (seatNumber) => seatNumber.match(/^[A-Za-z]+/)?.[0] || '#'

export default function Show() {
  const { id } = useParams()
  const showId = Number(id)
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const show = useFetch(`/shows/${id}`)
  const seatMap = useFetch(`/seatmap/${id}`)

  const [selected, setSelected] = useState([])
  // step: select -> held -> pending -> done
  const [step, setStep] = useState('select')
  const [hold, setHold] = useState(null)
  const [booking, setBooking] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const seats = useMemo(() => seatMap.data || [], [seatMap.data])
  const rows = useMemo(() => {
    const out = {}
    for (const s of seats) (out[rowOf(s.seat_number)] ||= []).push(s)
    for (const r of Object.values(out))
      r.sort((a, b) => parseInt(a.seat_number.slice(1)) - parseInt(b.seat_number.slice(1)))
    return Object.entries(out).sort(([a], [b]) => a.localeCompare(b))
  }, [seats])

  const types = useMemo(() => {
    const t = {}
    for (const s of seats) t[s.type_name] = s.seat_price
    return Object.entries(t).sort((a, b) => a[1] - b[1])
  }, [seats])

  const chosen = seats.filter((s) => selected.includes(s.show_seat_id))
  const subtotal = chosen.reduce((sum, s) => sum + Number(s.seat_price), 0)

  function toggle(seat) {
    if (step !== 'select' || seat.status !== 'available') return
    setSelected((cur) =>
      cur.includes(seat.show_seat_id)
        ? cur.filter((x) => x !== seat.show_seat_id)
        : cur.length >= 10 ? cur : [...cur, seat.show_seat_id],
    )
  }

  async function run(fn) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e.message)
      seatMap.reload()
    } finally {
      setBusy(false)
    }
  }

  const holdSeats = () => {
    if (!user) return navigate('/login', { state: { from: location.pathname } })
    run(async () => {
      const d = await api('/bookings/lock', { method: 'POST', body: { showId, showSeatIds: selected } })
      setHold(d.lockedUntil)
      setStep('held')
      seatMap.reload()
    })
  }

  const release = () =>
    run(async () => {
      await api('/bookings/lock', { method: 'DELETE', body: { showId, showSeatIds: selected } })
      reset()
    })

  const confirm = () =>
    run(async () => {
      const d = await api('/bookings/confirm', { method: 'POST', body: { showId, showSeatIds: selected } })
      setBooking({ ...d.booking, payBy: d.payBy })
      setStep('pending')
    })

  function reset() {
    setSelected([])
    setHold(null)
    setBooking(null)
    setStep('select')
    seatMap.reload()
  }

  function onPaid(r) {
    setResult(r)
    setStep('done')
    seatMap.reload()
  }

  if (show.loading) return <p className="muted">Loading…</p>
  if (show.error) return <p className="alert">{show.error.message}</p>
  const s = show.data

  return (
    <>
      <Link to={`/movies/${s.movie_id}`} className="back">← {s.movie_title}</Link>
      <section className="show-head">
        <div>
          <p className="eyebrow">{s.cinema_name} · {s.city}</p>
          <h1>{s.movie_title}</h1>
          <p className="muted">
            {fmt.date(s.show_time)} · {fmt.time(s.show_time)} · {s.screen_name}
          </p>
        </div>
      </section>

      <div className="booking-layout">
        <section className="card seat-panel">
          <div className="screen">Screen</div>
          {seatMap.loading && <p className="muted center">Loading seats…</p>}
          {seatMap.error && <p className="alert">{seatMap.error.message}</p>}
          <div className="seat-rows">
            {rows.map(([row, list]) => (
              <div key={row} className="seat-row">
                <span className="row-label">{row}</span>
                {list.map((seat) => {
                  const mine = selected.includes(seat.show_seat_id)
                  const cls = mine ? 'selected' : seat.status
                  return (
                    <button
                      key={seat.show_seat_id}
                      className={`seat ${cls} type-${seat.type_name.toLowerCase()}`}
                      disabled={!mine && seat.status !== 'available'}
                      onClick={() => toggle(seat)}
                      title={`${seat.seat_number} · ${seat.type_name} · ${fmt.money(seat.seat_price)}`}
                    >
                      {seat.seat_number.replace(/^[A-Za-z]+/, '')}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="legend small">
            <span><i className="seat-dot available" /> Available</span>
            <span><i className="seat-dot selected" /> Selected</span>
            <span><i className="seat-dot booked" /> Taken</span>
          </div>
          <div className="legend small muted">
            {types.map(([name, price]) => (
              <span key={name}>{name} {fmt.money(price)}</span>
            ))}
          </div>
        </section>

        <aside className="card summary">
          {step === 'done' ? (
            result.ok ? (
              <div className="done">
                <div className="done-icon">✓</div>
                <h3>You're booked</h3>
                <p className="muted small">Seats {chosen.map((c) => c.seat_number).join(', ')}. Enjoy the show.</p>
                <Link to="/bookings" className="btn btn-block">View my bookings</Link>
              </div>
            ) : (
              <div className="done">
                <div className="done-icon fail">!</div>
                <h3>Payment didn't go through</h3>
                <p className="muted small">{result.message}</p>
                <button className="btn btn-block" onClick={reset}>Choose seats again</button>
              </div>
            )
          ) : (
            <>
              <h3>Your seats</h3>
              {chosen.length === 0 ? (
                <p className="muted small">Tap seats on the map to select up to 10.</p>
              ) : (
                <ul className="seat-lines">
                  {chosen.map((c) => (
                    <li key={c.show_seat_id}>
                      <span>{c.seat_number} <span className="muted small">{c.type_name}</span></span>
                      <span>{fmt.money(c.seat_price)}</span>
                    </li>
                  ))}
                </ul>
              )}

              {error && <p className="alert">{error}</p>}

              {step === 'select' && (
                <>
                  <div className="pay-row">
                    <span className="muted">Subtotal</span>
                    <strong>{fmt.money(subtotal)}</strong>
                  </div>
                  <button className="btn btn-block" disabled={!chosen.length || busy} onClick={holdSeats}>
                    {busy ? 'Holding…' : user ? 'Hold seats' : 'Sign in to book'}
                  </button>
                </>
              )}

              {step === 'held' && (
                <>
                  <p className="small muted">
                    Seats held for <Countdown until={hold} onExpire={reset} />
                  </p>
                  <button className="btn btn-block" disabled={busy} onClick={confirm}>
                    {busy ? 'Confirming…' : 'Confirm booking'}
                  </button>
                  <button className="link-btn small" disabled={busy} onClick={release}>
                    Release seats
                  </button>
                </>
              )}

              {step === 'pending' && (
                <PayPanel
                  bookingId={booking.booking_id}
                  amount={booking.total_amount}
                  payBy={booking.payBy}
                  onDone={onPaid}
                />
              )}
            </>
          )}
        </aside>
      </div>
    </>
  )
}
