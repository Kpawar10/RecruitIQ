import React, { useState, useEffect } from 'react'
import { listResumes, deleteResume } from '../api/client.js'
//const { analysis } = useAnalysis()

function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', fontWeight: 600, fontFamily: 'var(--mono)', color: color || 'var(--text)', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = await listResumes()
      setResumes(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    await deleteResume(id)
    setResumes(prev => prev.filter(r => r.id !== id))
  }

  const analyzed = resumes.filter(r => r.analyzed)
  const pending = resumes.filter(r => !r.analyzed)

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>All uploaded resumes and their screening status.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '2rem' }}>
        <StatCard label="Total Uploaded" value={resumes.length} />
        <StatCard label="Analyzed" value={analyzed.length} color="var(--accent)" />
        <StatCard label="Pending Analysis" value={pending.length} color="var(--warn)" />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem' }}>Loading…</div>
      ) : resumes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>No resumes yet</div>
          <div style={{ fontSize: '0.85rem' }}>Upload resumes from the Screener tab to get started.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                {['Filename', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resumes.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < resumes.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.1rem' }}>📄</span>
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{r.filename}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge ${r.analyzed ? 'badge-green' : 'badge-gray'}`}>
                      {r.analyzed ? '✓ Analyzed' : '○ Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button className="btn btn-danger" style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                      onClick={() => handleDelete(r.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button className="btn btn-ghost" onClick={load}>↻ Refresh</button>
      </div>
    </div>
  )
}