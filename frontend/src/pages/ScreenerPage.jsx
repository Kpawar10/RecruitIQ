import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { uploadResume, analyzeResumes, streamFeedback, streamChat, deleteResume } from '../api/client.js'

import { useAnalysis } from '../context/AnalysisContext.jsx'

//const { analysis, setAnalysis } = useAnalysis()
// ─── Drop Zone ─────────────────────────────────────────────────────────────

function DropZone({ onFiles }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)

    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.name.endsWith('.pdf')
    )

    if (files.length) onFiles(files)
  }

  return (
    <div
      ref={inputRef}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => {
        const input = inputRef.current?.querySelector('input')
        if (input) input.click()
      }}
      style={{
        border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border2)'}`,
        borderRadius: 10,
        padding: '2rem 1rem',
        textAlign: 'center',
        cursor: 'pointer',
        background: dragging ? 'rgba(108,141,255,0.05)' : 'transparent',
        transition: 'all 0.2s',
      }}
    >
      <input
        type="file"
        accept=".pdf"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => onFiles(Array.from(e.target.files))}
      />

      <div style={{ fontSize: '2rem', marginBottom: 8 }}>📄</div>
      <div style={{ fontWeight: 500, marginBottom: 4 }}>
        Drop PDF resumes here
      </div>
      <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
        or click to browse · multiple files supported
      </div>
    </div>
  )
}
// ─── Score Ring ─────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80 }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - score)
  const color = score >= 0.6 ? 'var(--success)' : score >= 0.4 ? 'var(--warn)' : 'var(--danger)'

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg3)" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px`,
          fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 500, fill: color }}>
        {Math.round(score * 100)}%
      </text>
    </svg>
  )
}

// ─── Resume Card ─────────────────────────────────────────────────────────────

function ResumeCard({ resume, result, jobDesc, onDelete, onSelect, selected }) {
  const [feedbackText, setFeedbackText] = useState('')
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  const getFeedback = async () => {
    if (feedbackText) { setShowFeedback(s => !s); return }
    setShowFeedback(true); setLoadingFeedback(true); setFeedbackText('')
    await streamFeedback(resume.resume_id, jobDesc, (chunk) => {
      setFeedbackText(p => p + chunk)
    })
    setLoadingFeedback(false)
  }

  if (!result) return null

  return (
    <div className="card fade-in" style={{ marginBottom: 12, border: selected ? '1px solid var(--accent)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <ScoreRing score={result.final_score} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              #{result.rank} {resume.filename}
            </span>
            <span className={`badge ${result.status === 'selected' ? 'badge-green' : 'badge-red'}`}>
              {result.status === 'selected' ? '✓ Selected' : '✗ Rejected'}
            </span>
          </div>

          {/* Score bars */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: 10 }}>
            {[
              { label: 'Semantic', value: result.semantic_score },
              { label: 'Skills', value: result.skill_score },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 3 }}>
                  <span>{label}</span><span style={{ fontFamily: 'var(--mono)' }}>{Math.round(value * 100)}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2 }}>
                  <div style={{ height: 4, width: `${value * 100}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Skills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
            {result.matched_skills.slice(0, 8).map(s => <span key={s} className="skill-tag skill-matched">{s}</span>)}
            {result.missing_skills.slice(0, 5).map(s => <span key={s} className="skill-tag skill-missing">−{s}</span>)}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={getFeedback} disabled={loadingFeedback}>
              {loadingFeedback ? '⟳ Generating...' : showFeedback ? '↑ Hide feedback' : '◆ AI Feedback'}
            </button>
            <button className="btn btn-ghost" onClick={() => onSelect(resume.resume_id)}>
              {selected ? '✕ Close chat' : '💬 Chat'}
            </button>
            <button className="btn btn-danger" onClick={() => onDelete(resume.resume_id)}>✕</button>
          </div>
        </div>
      </div>

      {showFeedback && feedbackText && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div className={`prose ${loadingFeedback ? 'typing-cursor' : ''}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{feedbackText}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Chat Panel ─────────────────────────────────────────────────────────────

function ChatPanel({ resumeId, filename }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! I've read **${filename}**. Ask me anything about this candidate — experience, skills, fit for the role, improvement areas, anything.` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    const q = input.trim(); if (!q || loading) return
    setInput('')
    const userMsg = { role: 'user', content: q }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    const history = messages.map(m => ({ role: m.role, content: m.content }))
    let answer = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    await streamChat(resumeId, q, history, (chunk) => {
      answer += chunk
      setMessages(prev => {
        const msgs = [...prev]
        msgs[msgs.length - 1] = { role: 'assistant', content: answer, streaming: true }
        return msgs
      })
    })

    setMessages(prev => {
      const msgs = [...prev]
      msgs[msgs.length - 1] = { role: 'assistant', content: answer }
      return msgs
    })
    setLoading(false)
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 480, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 500, fontSize: '0.85rem', color: 'var(--muted)' }}>
        💬 Chat — {filename}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '10px 14px', borderRadius: 10,
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg3)',
              color: msg.role === 'user' ? '#fff' : 'var(--text)',
              fontSize: '0.875rem', lineHeight: 1.6,
            }} className={msg.streaming ? 'typing-cursor' : ''}>
              <div className="prose" style={{ color: msg.role === 'user' ? '#fff' : undefined }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || ' '}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about this candidate…"
          style={{
            flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '0.6rem 1rem', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: '0.875rem',
            outline: 'none',
          }}
        />
        <button className="btn btn-primary" onClick={send} disabled={loading || !input.trim()}>
          {loading ? '⟳' : '↑'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ScreenerPage() {
  const { analysis, setAnalysis, jd, setJd,uploads,
    setUploads,
    results,
    setResults
  } = useAnalysis() 
  //const [uploads, setUploads] = useState([])      // { resume_id, filename, uploading }
  //const [jobDesc, setJobDesc] = useState('')
  //const [results, setResults] = useState({})      // resume_id -> result  
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedChat, setSelectedChat] = useState(null)
  const [error, setError] = useState('')

  const handleFiles = async (files) => {
    console.log("FILES RECEIVED:", files)
    setError('')
    for (const file of files) {
      const tempId = `temp-${Date.now()}-${Math.random()}`
      setUploads(prev => [...prev, { resume_id: tempId, filename: file.name, uploading: true }])
      try {
        const data = await uploadResume(file)
        console.log("UPLOADING:", file)
        setUploads(prev => prev.map(u => u.resume_id === tempId ? { ...data, uploading: false } : u))
      } catch (e) {
        setError(`Upload failed: ${e.message}`)
        setUploads(prev => prev.filter(u => u.resume_id !== tempId))
      }
    }
  }

  const handleAnalyze = async () => {
    const validIds = uploads.filter(u => !u.uploading).map(u => u.resume_id)
    if (!validIds.length || !jd.trim()) return
    setAnalyzing(true); setError(''); setResults({})
    try {
      const data = await analyzeResumes(validIds, jd)
      const resultMap = {}
      data.results.forEach((r, i) => { resultMap[r.resume_id] = { ...r, rank: i + 1 } })
      setResults(resultMap)
    } catch (e) {
      setError(`Analysis failed: ${e.message}`)
    }
    setAnalyzing(false)
  }

  const handleDelete = async (id) => {
    await deleteResume(id)
    setUploads(prev => prev.filter(u => u.resume_id !== id))
    setResults(prev => { const n = { ...prev }; delete n[id]; return n })
    if (selectedChat === id) setSelectedChat(null)
  }

  const selectedResume = uploads?.find(u => u.resume_id === selectedChat)
  const hasResults = Object.keys(results).length > 0
  const canAnalyze = uploads.some(u => !u.uploading) && jd.trim()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: hasResults && selectedChat ? '1fr 400px' : '1fr', gap: 0, minHeight: '100vh' }}>
      {/* Left panel */}
      <div style={{ padding: '2rem', overflow: 'auto', borderRight: selectedChat ? '1px solid var(--border)' : 'none' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>

          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 4 }}>Resume Screener</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Upload multiple resumes, paste a job description, and get AI-powered ranking with streaming feedback.</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(240,96,96,0.1)', border: '1px solid rgba(240,96,96,0.25)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Upload */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.875rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>01 — Upload Resumes</div>
            <DropZone onFiles={handleFiles} />

            {uploads.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {uploads.map(u => (
                  <div key={u.resume_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8, fontSize: '0.85rem' }}>
                    <span style={{ color: u.uploading ? 'var(--warn)' : 'var(--success)' }}>{u.uploading ? '⟳' : '✓'}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.filename}</span>
                    {results[u.resume_id] && (
                      <span className={`badge ${results[u.resume_id].status === 'selected' ? 'badge-green' : 'badge-red'}`}>
                        #{results[u.resume_id].rank}
                      </span>
                    )}
                    {!u.uploading && <button onClick={() => handleDelete(u.resume_id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Job description */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.875rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>02 — Job Description</div>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here…"
              rows={8}
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '0.75rem 1rem', color: 'var(--text)',
                fontFamily: 'var(--font)', fontSize: '0.875rem', resize: 'vertical',
                outline: 'none', lineHeight: 1.7,
              }}
            />
          </div>

          {/* Analyze button */}
          <div style={{ display: 'flex', gap: 10, marginBottom: '2rem' }}>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '0.75rem' }}
              onClick={handleAnalyze} disabled={!canAnalyze || analyzing}>
              {analyzing ? '⟳ Analyzing resumes…' : `⚡ Analyze ${uploads.filter(u => !u.uploading).length} Resume${uploads.length !== 1 ? 's' : ''}`}
            </button>
          </div>

          {/* Results */}
          {hasResults && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 14, fontSize: '0.875rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                03 — Results ({Object.values(results).filter(r => r.status === 'selected').length} selected / {Object.keys(results).length} total)
              </div>
              {uploads
                .filter(u => results[u.resume_id])
                .sort((a, b) => results[a.resume_id].rank - results[b.resume_id].rank)
                .map(u => (
                  <ResumeCard
                    key={u.resume_id}
                    resume={{ resume_id: u.resume_id, filename: u.filename }}
                    result={results[u.resume_id]}
                    jobDesc={jd}
                    onDelete={handleDelete}
                    onSelect={id => setSelectedChat(prev => prev === id ? null : id)}
                    selected={selectedChat === u.resume_id}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Chat panel */}
      {selectedChat && selectedResume && (
        <div style={{ padding: '2rem', overflow: 'auto', position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.875rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>04 — Chat with Resume</div>
          <div style={{ flex: 1 }}>
            <ChatPanel resumeId={selectedChat} filename={selectedResume.filename} />
          </div>
        </div>
      )}
    </div>
  )
}