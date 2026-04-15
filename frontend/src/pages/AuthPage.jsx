import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function InputField({ label, type = 'text', value, onChange, placeholder, error }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'var(--bg3)',
          border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--accent)' : 'var(--border2)'}`,
          borderRadius: 10,
          padding: '0.75rem 1rem',
          color: 'var(--text)',
          fontFamily: 'var(--font)',
          fontSize: '0.9rem',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
      />
      {error && <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 5 }}>{error}</div>}
    </div>
  )
}

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, signup } = useAuth()
  const navigate = useNavigate()

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (mode === 'signup' && !form.name.trim()) errs.name = 'Name is required'
    if (!form.email.includes('@')) errs.email = 'Enter a valid email'
    if (form.password.length < 6) errs.password = 'At least 6 characters'
    return errs
  }

  const handleSubmit = async () => {
    setServerError('')
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await signup(form.name, form.email, form.password)
      }
      navigate('/')
    } catch (e) {
      setServerError(e.message)
    }
    setLoading(false)
  }

  const switchMode = (m) => {
    setMode(m)
    setErrors({})
    setServerError('')
    setForm({ name: '', email: '', password: '' })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600,
        background: 'radial-gradient(ellipse at center, rgba(108,141,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '10%',
        width: 400, height: 400,
        background: 'radial-gradient(ellipse at center, rgba(79,195,160,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #6c8dff 0%, #4fc3a0 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 auto 16px',
            boxShadow: '0 0 40px rgba(108,141,255,0.25)',
          }}>R</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 600, letterSpacing: '-0.04em', marginBottom: 6 }}>
            RecruitIQ
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your recruiter account'}
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', background: 'var(--bg2)', borderRadius: 10,
          padding: 4, marginBottom: '1.75rem',
          border: '1px solid var(--border)',
        }}>
          {[['login', 'Sign in'], ['signup', 'Create account']].map(([m, label]) => (
            <button key={m} onClick={() => switchMode(m)} style={{
              flex: 1, padding: '0.55rem', borderRadius: 8, border: 'none',
              fontFamily: 'var(--font)', fontSize: '0.875rem', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
              background: mode === m ? 'var(--bg3)' : 'transparent',
              color: mode === m ? 'var(--text)' : 'var(--muted)',
            }}>{label}</button>
          ))}
        </div>

        {/* Form card */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '1.75rem',
        }}>
          {mode === 'signup' && (
            <InputField label="Full name" value={form.name} onChange={set('name')}
              placeholder="Jane Smith" error={errors.name} />
          )}
          <InputField label="Email" type="email" value={form.email} onChange={set('email')}
            placeholder="you@company.com" error={errors.email} />
          <InputField label="Password" type="password" value={form.password} onChange={set('password')}
            placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'} error={errors.password} />

          {serverError && (
            <div style={{
              background: 'rgba(240,96,96,0.1)', border: '1px solid rgba(240,96,96,0.25)',
              borderRadius: 8, padding: '10px 14px', color: 'var(--danger)',
              fontSize: '0.85rem', marginBottom: 16,
            }}>
              {serverError}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '0.8rem',
              background: loading ? 'rgba(108,141,255,0.5)' : 'var(--accent)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontFamily: 'var(--font)', fontSize: '0.9rem', fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
            }}
          >
            {loading && (
              <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            )}
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </div>

        {/* Footer hint */}
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', marginTop: '1.5rem' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font)', padding: 0 }}>
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>

        <p style={{ textAlign: 'center', color: 'var(--border2)', fontSize: '0.72rem', marginTop: 24 }}>
          Powered by Claude · SentenceTransformers · FAISS
        </p>
      </div>
    </div>
  )
}