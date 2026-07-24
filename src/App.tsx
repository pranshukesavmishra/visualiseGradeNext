import { useEffect, useRef, useState } from 'react'
import LearnMode from './modes/LearnMode'
import PythonLab from './modes/PythonLab'
import {
  applyTheme,
  buildShareUrl,
  getInitialTheme,
  ModeName,
  readSharedState,
  Theme,
} from './lib/prefs'

const shared = readSharedState()

export default function App() {
  const [mode, setMode] = useState<ModeName>(shared?.mode ?? 'learn')
  const [theme, setTheme] = useState<Theme>(getInitialTheme())
  const [toast, setToast] = useState<string | null>(null)

  // Latest code from each mode, so "Share" can capture it.
  const codes = useRef<Record<ModeName, string>>({ learn: '', python: '' })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  async function handleShare() {
    const url = buildShareUrl({ mode, code: codes.current[mode] })
    try {
      window.history.replaceState(null, '', url)
      await navigator.clipboard.writeText(url)
      setToast('Share link copied to clipboard 🔗')
    } catch {
      setToast('Share link is in your address bar 🔗')
    }
  }

  return (
    <div className="app">
      <div className="bg-fx" aria-hidden="true" />
      <header className="masthead">
        <div className="brand">
          <div className="brand-badge">⬡</div>
          <div>
            <h1>Grade<span className="acc">Next</span></h1>
            <p>// watch your code execute</p>
          </div>
        </div>

        <div className="masthead-spacer" />

        <div className="header-actions">
          <div className="mode-toggle" role="tablist" aria-label="Choose a mode">
            <button
              role="tab"
              aria-selected={mode === 'learn'}
              className={`mode-btn ${mode === 'learn' ? 'active' : ''}`}
              onClick={() => setMode('learn')}
            >
              🎓 Learn
            </button>
            <button
              role="tab"
              aria-selected={mode === 'python'}
              className={`mode-btn ${mode === 'python' ? 'active' : ''}`}
              onClick={() => setMode('python')}
            >
              🐍 Real Python
            </button>
          </div>

          <button className="icon-btn labeled" onClick={handleShare} title="Copy a share link">
            🔗 <span>Share</span>
          </button>

          <button
            className="icon-btn"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            title="Toggle light / dark"
            aria-label="Toggle light or dark theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {mode === 'learn' ? (
        <LearnMode
          seedCode={shared?.mode === 'learn' ? shared.code : undefined}
          reportCode={(c) => (codes.current.learn = c)}
        />
      ) : (
        <PythonLab
          seedCode={shared?.mode === 'python' ? shared.code : undefined}
          reportCode={(c) => (codes.current.python = c)}
        />
      )}

      <p className="footer-note">
        {mode === 'learn'
          ? 'Learn mode · Type code on the left and watch every step on the right. Space = play/pause · ← → = step 💡'
          : 'Real Python mode · Runs genuine Python (pandas, scikit-learn, matplotlib) in your browser 🐍'}
      </p>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
