import { useState } from 'react'
import LearnMode from './modes/LearnMode'
import PythonLab from './modes/PythonLab'

type Mode = 'learn' | 'python'

export default function App() {
  const [mode, setMode] = useState<Mode>('learn')

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          <div className="brand-badge">✨</div>
          <div>
            <h1>GradeNext</h1>
            <p>Write code. Watch it come alive.</p>
          </div>
        </div>
        <div className="masthead-spacer" />
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
      </header>

      {mode === 'learn' ? <LearnMode /> : <PythonLab />}

      <p className="footer-note">
        {mode === 'learn'
          ? 'Learn mode · Type real code on the left and watch every step on the right 💡'
          : 'Real Python mode · Runs genuine Python (pandas, scikit-learn, matplotlib) in your browser 🐍'}
      </p>
    </div>
  )
}
