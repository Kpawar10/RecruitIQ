import { createContext, useContext, useState, useEffect } from 'react'

const AnalysisContext = createContext()

export const AnalysisProvider = ({ children }) => {
  const [analysis, setAnalysis] = useState(null)
  const [jd, setJd] = useState('')
  const [uploads, setUploads] = useState([])
  const [results, setResults] = useState({})
  const [fileName, setFileName] = useState('')

  // 🔁 Load from localStorage on refresh
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('analysisData'))
    if (saved) {
      setAnalysis(saved.analysis)
      setJd(saved.jd)
      setFileName(saved.fileName)
    }
  }, [])

  // 💾 Save whenever data changes
  useEffect(() => {
    localStorage.setItem(
      'analysisData',
      JSON.stringify({ analysis, jd, fileName })
    )
  }, [analysis, jd, fileName])

  return (
  <AnalysisContext.Provider value={{
    analysis,
    setAnalysis,
    jd,
    setJd,
    fileName,
    setFileName,
    uploads,
    setUploads,
    results,
    setResults
  }}>
      {children}
    </AnalysisContext.Provider>
  )
}

export const useAnalysis = () => useContext(AnalysisContext)