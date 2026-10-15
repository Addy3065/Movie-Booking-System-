import { useState } from 'react'
import { useFetch } from '../useFetch.js'
import { fmt } from '../api.js'
import PayPanel from '../PayPanel.jsx'

const LABELS = { confirmed: 'Confirmed', pending: 'Awaiting payment', cancelled: 'Cancelled' }

export default function MyBookings() {
  const { data, error, loading, reload } = useFetch('/bookings/mine')
  const [paying, setPaying] = useState(null)

  return (
    <>
      <section className="hero hero-sm">
        <p className="eyebrow">Your tickets</p>
        <h1>My bookings</h1>
      </section>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="alert">{error.message}</p>}
      {data?.bookings.length === 0 && <p className="muted">No bookings yet.</p>}

      <div className="ticket-list">
        {data?.bookings.map((b) => {
          const payable = b.status === 'pending' && b.pay_by && new Date(b.pay_by) > new Date()
          return (
            <article key={b.booking_id} className={`card ticket ${b.status}`}>
              <div className="ticket-main">
                <span className={`badge ${b.status}`}>{LABELS[b.status] || b.status}</span>
                <h3>{b.movie_title}</h3>
                <p className="muted small">
                  {b.cinema_name}, {b.city} · {b.screen_name}
                </p>
                <p className="small">
                  {fmt.date(b.show_time)} · {fmt.time(b.show_time)}
                </p>
              </div>
              <div className="ticket-side">
                <span className="muted small">Seats</span>
                <strong>{b.seats.join(', ') || '—'}</strong>
                <span className="muted small">{fmt.money(b.total_amount)}</span>
                {payable && paying !== b.booking_id && (
                  <button className="btn btn-sm" onClick={() => setPaying(b.booking_id)}>Pay now</button>
                )}
              </div>
              {paying === b.booking_id && (
                <div className="ticket-pay">
                  <PayPanel
                    bookingId={b.booking_id}
                    amount={b.total_amount}
                    payBy={b.pay_by}
                    onDone={() => {
                      setPaying(null)
                      reload()
                    }}
                  />
                </div>
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}
