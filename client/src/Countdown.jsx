import { useEffect, useState } from 'react'

export default function Countdown({ until, onExpire }) {
  const [now, setNow] = useState(Date.now())
  const left = Math.max(0, new Date(until).getTime() - now)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (left === 0) onExpire?.()
  }, [left === 0]) // eslint-disable-line react-hooks/exhaustive-deps

  const m = Math.floor(left / 60000)
  const s = Math.floor((left % 60000) / 1000)
  return (
    <span className={`countdown ${left < 60000 ? 'urgent' : ''}`}>
      {m}:{String(s).padStart(2, '0')}
    </span>
  )
}
