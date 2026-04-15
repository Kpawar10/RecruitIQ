const BASE = 'http://127.0.0.1:8000'

function authHeaders() {
  const token = localStorage.getItem('riq_token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}
 
async function checkOk(res) {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `Request failed (${res.status})`)
  }
  return res.json()
}

export async function uploadResume(file) {
  console.log("API CALLED")
  const form = new FormData()
  form.append('file', file)
  const token = localStorage.getItem('riq_token')
  const res = await fetch(`${BASE}/upload`, { method: 'POST',headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form })
  if (!res.ok) throw new Error((await res.json()).detail)
  return checkOk(res)
}

export async function analyzeResumes(resumeIds, jobDescription) {
  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ resume_ids: resumeIds, job_description: jobDescription }),
  })
  if (!res.ok) throw new Error((await res.json()).detail)
  return checkOk(res)
}

export async function fetchAnalytics() {
  const res = await fetch(`${BASE}/analytics`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch analytics')
  return checkOk(res)
}

export async function listResumes() {
  const res = await fetch(`${BASE}/resumes`, { headers: authHeaders() })
  return checkOk(res)
}

export async function deleteResume(id) {
  await fetch(`${BASE}/resumes/${id}`, { method: 'DELETE', headers: authHeaders() })
}

/**
 * Stream SSE from /feedback/stream
 * onChunk(text) called for each streamed chunk
 */
export async function streamFeedback(resumeId, jobDescription, onChunk) {
  const token = localStorage.getItem('riq_token')
  const url = `${BASE}/feedback/stream?resume_id=${encodeURIComponent(resumeId)}&job_description=${encodeURIComponent(jobDescription)}`
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok || !res.body) {
  console.error("Feedback stream failed")
  return
}
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    for (const line of decoder.decode(value).split('\n')) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') return
        try { onChunk(JSON.parse(data).text) } catch {}
      }
    }
  }
}
 
export async function streamChat(resumeId, question, history, onChunk) {
  try {
    const res = await fetch(`${BASE}/chat/stream`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ resume_id: resumeId, question, history }),
    })

    // ✅ HANDLE ERROR RESPONSE FIRST
    if (!res.ok) {
      const text = await res.text()
      console.error("Chat API error:", text)
      throw new Error("Chat API failed")
    }

    if (!res.body) {
      throw new Error("No response body (stream failed)")
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })

      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)

          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data)
            onChunk(parsed.text)
          } catch (err) {
            console.error("Parse error:", err, data)
          }
        }
      }
    }
  } catch (err) {
    console.error("StreamChat crashed:", err)
  }
}