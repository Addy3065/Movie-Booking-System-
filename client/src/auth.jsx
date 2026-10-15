import { createContext, useContext, useEffect, useState } from 'react'
import { api, tokenStore } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!tokenStore.get())

  useEffect(() => {
    if (!tokenStore.get()) return
    api('/auth/me')
      .then((d) => setUser({ ...d.user, name: tokenStore.name() }))
      .catch(() => tokenStore.clear())
      .finally(() => setReady(true))
  }, [])

  async function authenticate(path, body) {
    const d = await api(path, { method: 'POST', body })
    tokenStore.set(d.token, d.user.name)
    const me = await api('/auth/me')
    setUser({ ...me.user, name: d.user.name })
  }

  const value = {
    user,
    ready,
    login: (email, password) => authenticate('/auth/login', { email, password }),
    register: (name, email, password) => authenticate('/auth/register', { name, email, password }),
    logout: () => {
      tokenStore.clear()
      setUser(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
