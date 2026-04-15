import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const BASE = '/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('riq_token'))
  const [loading, setLoading] = useState(true)

  // On mount, verify stored token
  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUser(data); else clearAuth() })
      .catch(() => clearAuth())
      .finally(() => setLoading(false))
  }, [])

  const saveAuth = (token, user) => {
    localStorage.setItem('riq_token', token)
    setToken(token)
    setUser(user)
  }

  const clearAuth = () => {
    localStorage.removeItem('riq_token')
    setToken(null)
    setUser(null)
  }

  const signup = async (name, email, password) => {
    const res = await fetch(`${BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Signup failed')
    saveAuth(data.token, data.user)
    return data.user
  }

  const login = async (email, password) => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Login failed')
    saveAuth(data.token, data.user)
    return data.user
  }

  const logout = () => clearAuth()

  return (
    <AuthContext.Provider value={{ user, token, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)