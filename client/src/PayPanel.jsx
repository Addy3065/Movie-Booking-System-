import { useState } from 'react'
import { api, fmt } from './api.js'
import Countdown from './Countdown.jsx'

// Pays a pending booking. The API only simulates payments, so both outcomes are offered.
export default function PayPanel({ bookingId, amount, payBy, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function pay(simulate) {
    setBusy(true)
    setError(null)
    try {
      await api('/payments/pay', { method: 'POST', body: { bookingId, simulate } })
      onDone({ ok: true })
    } catch (e) {
      // 402 / 410 mean the booking was cancelled by the server
      if (e.status === 402 || e.status === 410) onDone({ ok: false, message: e.message })
      else setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pay">
      <div className="pay-row">
        <span className="muted">Total</span>
        <strong className="total">{fmt.money(amount)}</strong>
      </div>
      {payBy && (
        <p className="small muted">
          Pay within <Countdown until={payBy} /> or the seats are released.
        </p>
      )}
      {error && <p className="alert">{error}</p>}
      <button className="btn btn-block" disabled={busy} onClick={() => pay('success')}>
        {busy ? 'Processing…' : `Pay ${fmt.money(amount)}`}
      </button>
      <button className="link-btn small" disabled={busy} onClick={() => pay('failure')}>
        Simulate a failed payment
      </button>
    </div>
  )
}
