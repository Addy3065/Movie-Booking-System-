const BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'marquee_token'
const NAME_KEY = 'marquee_name'

// /auth/me doesn't return the name, so it is kept alongside the token
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  name: () => localStorage.getItem(NAME_KEY),
  set: (t, name) => {
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(NAME_KEY, name)
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(NAME_KEY)
  },
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const fmt = {
  money: (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n)),
  date: (d) =>
    new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
  time: (d) =>
    new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
  duration: (m) => `${Math.floor(m / 60)}h ${m % 60}m`,
}
