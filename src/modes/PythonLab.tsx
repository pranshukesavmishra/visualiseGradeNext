import { useState } from 'react'
import CodeEditor from '../components/CodeEditor'
import { PY_EXAMPLES, DEFAULT_PY_EXAMPLE } from '../python/examples'
import { runPython, PyRunResult } from '../python/pyodideRunner'

// "Real Python" mode: runs genuine Python (numpy, pandas, scikit-learn,
// matplotlib) in the browser via Pyodide, and shows console output + charts.
export default function PythonLab() {
  const [code, setCode] = useState(DEFAULT_PY_EXAMPLE.code)
  const [activeExample, setActiveExample] = useState(DEFAULT_PY_EXAMPLE.id)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<PyRunResult | null>(null)

  async function handleRun() {
    setRunning(true)
    setResult(null)
    setStatus('Getting Python ready…')
    const res = await runPython(code, setStatus)
    setResult(res)
    setStatus('')
    setRunning(false)
  }

  function loadExample(id: string) {
    const ex = PY_EXAMPLES.find((e) => e.id === id)
    if (!ex) return
    setActiveExample(id)
    setCode(ex.code)
    setResult(null)
  }

  return (
    <>
      <div className="examples mode-examples">
        <span className="examples-label">Try one:</span>
        {PY_EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            className={`chip ${activeExample === ex.id ? 'active' : ''}`}
            onClick={() => loadExample(ex.id)}
            title={ex.tag}
          >
            <span>{ex.emoji}</span>
            <span>{ex.title}</span>
          </button>
        ))}
      </div>

      <div className="workspace">
        {/* Left: code */}
        <section className="panel">
          <div className="panel-head">
            <h2>Python Code</h2>
            <span className="grade-tag">real Python 🐍</span>
            <div className="panel-head-spacer" />
          </div>

          <CodeEditor code={code} onChange={setCode} activeLine={0} />

          <div className="toolbar">
            <button className="btn primary" onClick={handleRun} disabled={running}>
              {running ? '⏳ Running…' : '▶ Run Python'}
            </button>
            <button
              className="btn ghost"
              onClick={() => loadExample(activeExample || DEFAULT_PY_EXAMPLE.id)}
              disabled={running}
            >
              ↺ Reset
            </button>
          </div>
        </section>

        {/* Right: results */}
        <section className="panel">
          <div className="panel-head">
            <h2>Output</h2>
            <span className="grade-tag">live</span>
            <div className="panel-head-spacer" />
          </div>

          <div className="py-results">
            {running && (
              <div className="py-status">
                <span className="spinner" aria-hidden="true" />
                <span>{status || 'Working…'}</span>
              </div>
            )}

            {!running && !result && (
              <div className="empty-hint">
                Press <strong>▶ Run Python</strong> to run real Python code. The first run
                downloads Python to your browser (about 10&nbsp;MB, just once).
              </div>
            )}

            {result?.error && (
              <pre className="py-error">{result.error}</pre>
            )}

            {result && (result.stdout || !result.error) && (
              <>
                <div className="stage-section-title">Console</div>
                <pre className="py-console">
                  {result.stdout ? result.stdout : '(no text output)'}
                </pre>
              </>
            )}

            {result && result.images.length > 0 && (
              <>
                <div className="stage-section-title">Charts</div>
                <div className="py-plots">
                  {result.images.map((img, i) => (
                    <img key={i} src={`data:image/png;base64,${img}`} alt={`chart ${i + 1}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
