import React, { useState } from 'react'
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { AnalysisProvider } from './context/AnalysisContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AuthPage from './pages/AuthPage.jsx'
import ScreenerPage from './pages/ScreenerPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx' 


export default function App() {
  return (
    <AuthProvider>
  <AnalysisProvider>
    <AppRoutes />
  </AnalysisProvider>
</AuthProvider>
  )
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      } />
    </Routes>
  )
}

function AppShell() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        <Routes>
          <Route path="/" element={<ScreenerPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Routes>
      </main>
    </div>
  )
}

function Sidebar() {
  const { user, logout } = useAuth()

  const navItems = [
    { to: '/', label: 'Screener', icon: '⚡' },
    { to: '/dashboard', label: 'Dashboard', icon: '◫' },
    { to: '/analytics', label: 'Analytics', icon: '◈' },
  ]

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <aside style={{
      width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '1.5rem 0', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #6c8dff 0%, #4fc3a0 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>R</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>RecruitIQ</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>AI Screener v2</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0.6rem 0.75rem', borderRadius: 8, textDecoration: 'none',
            fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.15s',
            color: isActive ? 'var(--text)' : 'var(--muted)',
            background: isActive ? 'var(--bg3)' : 'transparent',
          })}>
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '1rem 0.75rem 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.5rem', borderRadius: 8, marginBottom: 4 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #6c8dff 0%, #4fc3a0 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', fontWeight: 700, color: '#fff',
          }}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'Recruiter'}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email || ''}
            </div>
          </div>
        </div>

        <button onClick={logout} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '0.5rem 0.5rem', borderRadius: 8, border: 'none',
          background: 'transparent', color: 'var(--muted)',
          fontFamily: 'var(--font)', fontSize: '0.8rem', cursor: 'pointer',
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(240,96,96,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}
        >
          <span>↩</span> Sign out
        </button>
      </div>
    </aside>
  )
}
