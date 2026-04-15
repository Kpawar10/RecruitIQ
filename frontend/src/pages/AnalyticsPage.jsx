import React, { useState, useEffect } from 'react'
import { useAnalysis } from '../context/AnalysisContext.jsx'

//const { analysis } = useAnalysis()
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { fetchAnalytics } from '../api/client.js'

const COLORS = ['#6c8dff', '#4fc3a0', '#f0a030', '#f06060', '#a78bfa', '#34d399', '#fb923c', '#60a5fa']

function StatCard({ label, value, color, sub }) {
  return (
    <div className="card">
      <div style={{ fontSize: '2rem', fontWeight: 600, fontFamily: 'var(--mono)', color: color || 'var(--text)', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading analytics…</div>
  if (error) return <div style={{ padding: '2rem', color: 'var(--danger)' }}>Error: {error}</div>
  if (!data || data.total === 0) return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 8 }}>Analytics</h1>
      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📊</div>
        <div style={{ fontWeight: 500 }}>No data yet</div>
        <div style={{ fontSize: '0.85rem', marginTop: 6 }}>Analyze some resumes first to see trends here.</div>
      </div>
    </div>
  )

  const passRate = data.total > 0 ? Math.round((data.selected / data.total) * 100) : 0

  const pieData = [
    { name: 'Selected', value: data.selected },
    { name: 'Rejected', value: data.rejected },
  ]

  // Score distribution buckets
  const buckets = { '0–20%': 0, '20–40%': 0, '40–60%': 0, '60–80%': 0, '80–100%': 0 }
  data.score_distribution.forEach(s => {
    const pct = s * 100
    if (pct < 20) buckets['0–20%']++
    else if (pct < 40) buckets['20–40%']++
    else if (pct < 60) buckets['40–60%']++
    else if (pct < 80) buckets['60–80%']++
    else buckets['80–100%']++
  })
  const distData = Object.entries(buckets).map(([range, count]) => ({ range, count }))

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 4 }}>Analytics</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Aggregate insights across all screened resumes.</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '2rem' }}>
        <StatCard label="Total Screened" value={data.total} />
        <StatCard label="Selected" value={data.selected} color="var(--success)" />
        <StatCard label="Rejected" value={data.rejected} color="var(--danger)" />
        <StatCard label="Pass Rate" value={`${passRate}%`} color="var(--accent)" sub={`Avg score: ${Math.round(data.avg_score * 100)}%`} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Pie chart */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: '0.875rem' }}>Selection breakdown</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#4fc3a0' : '#f06060'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8}
                formatter={(v) => <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Score distribution */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: '0.875rem' }}>Score distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={distData} barSize={32}>
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Resumes" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Missing skills */}
      {data.top_missing_skills.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: '0.875rem' }}>Top missing skills</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 16 }}>Skills most frequently absent across all screened candidates</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.top_missing_skills} layout="vertical" barSize={18}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="skill" width={130} tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'var(--mono)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Candidates missing" fill="var(--danger)" radius={[0, 4, 4, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Matched skills */}
      {data.top_matched_skills.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: '0.875rem' }}>Top matched skills</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 16 }}>Skills most frequently present in screened candidates</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.top_matched_skills.map(({ skill, count }, i) => (
              <div key={skill} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '6px 12px', fontSize: '0.8rem',
              }}>
                <span style={{ fontFamily: 'var(--mono)', color: COLORS[i % COLORS.length] }}>{skill}</span>
                <span style={{
                  background: 'var(--bg2)', borderRadius: 99, padding: '1px 7px',
                  fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--mono)',
                }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}