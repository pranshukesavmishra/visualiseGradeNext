import { useEffect, useRef, useState } from 'react'
import CodeEditor from '../components/CodeEditor'
import Stage from '../components/Stage'
import Player from '../components/Player'
import { PY_EXAMPLES, DEFAULT_PY_EXAMPLE } from '../python/examples'
import { runPython, PyRunResult } from '../python/pyodideRunner'
import { loadCode, saveCode } from '../lib/prefs'

interface Props {
  seedCode?: string
  reportCode: (code: string) => void
}

// "Real Python" mode: runs genuine Python (numpy, pandas, scikit-learn,
// matplotlib) in the browser via Pyodide, traces it line-by-line, and replays
// it in the SAME animated visualiser as Learn mode — plus charts and console.
export default function PythonLab({ seedCode, reportCode }: Props) {
  const [code, setCode] = useState(seedCode ?? loadCode('python') ?? DEFAULT_PY_EXAMPLE.code)
  const [activeExample, setActiveExample] = useState(DEFAULT_PY_EXAMPLE.id)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<PyRunResult | null>(null)

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const frames = result?.frames ?? []
  const total = frames.length
  const clampedIndex = Math.min(index, Math.max(total - 1, 0))
  const frame = total > 0 ? frames[clampedIndex] : null
  const activeLine = frame?.line ?? 0

  // Playback timer: advance frames while "playing".
  const intervalRef = useRef<number | null>(null)
  useEffect(() => {
    if (!playing) return
    const delay = 650 / speed
    intervalRef.current = window.setInterval(() => {
      setIndex((i) => {
        if (i >= total - 1) {
          setPlaying(false)
          return i
        }
        return i + 1
      })
    }, delay)
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    }
  }, [playing, speed, total])

  // Autosave + report code for the Share button.
  useEffect(() => {
    saveCode('python', code)
    reportCode(code)
  }, [code, reportCode])

  function togglePlay() {
    if (total === 0) return
    if (clampedIndex >= total - 1) {
      setIndex(0)
      setPlaying(true)
    } else {
      setPlaying((p) => !p)
    }
  }

  // Keyboard shortcuts for playback (ignored while typing in the editor).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (total === 0) return
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setPlaying(false)
        setIndex((i) => Math.min(total - 1, i + 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setPlaying(false)
        setIndex((i) => Math.max(0, i - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total, clampedIndex])

  async function handleRun() {
    setRunning(true)
    setPlaying(false)
    setResult(null)
    setIndex(0)
    setStatus('Getting Python ready…')
    const res = await runPython(code, setStatus)
    setResult(res)
    setStatus('')
    setRunning(false)
    setIndex(0)
    // Auto-play the visualisation like a video once steps are ready.
    if (res.frames.length > 1) setPlaying(true)
  }

  function loadExample(id: string) {
    const ex = PY_EXAMPLES.find((e) => e.id === id)
    if (!ex) return
    setActiveExample(id)
    setCode(ex.code)
    setResult(null)
    setIndex(0)
    setPlaying(false)
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

          <CodeEditor
            code={code}
            onChange={(c) => {
              setCode(c)
              setActiveExample('')
            }}
            activeLine={activeLine}
          />

          <div className="toolbar">
            <button className="btn primary" onClick={handleRun} disabled={running}>
              {running ? '⏳ Running…' : '▶ Run & Visualise'}
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

        {/* Right: animated visualisation + charts */}
        <section className="panel">
          <div className="panel-head">
            <h2>Visualiser</h2>
            <span className="grade-tag">live</span>
            <div className="panel-head-spacer" />
          </div>

          {running && (
            <div className="py-results">
              <div className="py-status">
                <span className="spinner" aria-hidden="true" />
                <span>{status || 'Working…'}</span>
              </div>
            </div>
          )}

          {!running && !result && (
            <div className="py-results">
              <div className="empty-hint">
                Press <strong>▶ Run &amp; Visualise</strong> to watch your Python run step by step.
                The first run downloads Python to your browser (about 10&nbsp;MB, just once).
              </div>
            </div>
          )}

          {!running && result && total === 0 && result.error && (
            <div className="py-results">
              <pre className="py-error">{result.error}</pre>
            </div>
          )}

          {!running && result && total > 0 && (
            <>
              <Stage frame={frame} />

              <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Player
                  index={clampedIndex}
                  total={total}
                  playing={playing}
                  speed={speed}
                  onPlayPause={togglePlay}
                  onSeek={(i) => {
                    setPlaying(false)
                    setIndex(i)
                  }}
                  onStepBack={() => {
                    setPlaying(false)
                    setIndex((i) => Math.max(0, i - 1))
                  }}
                  onStepForward={() => {
                    setPlaying(false)
                    setIndex((i) => Math.min(total - 1, i + 1))
                  }}
                  onRestart={() => {
                    setPlaying(false)
                    setIndex(0)
                  }}
                  onSpeed={setSpeed}
                />

                {result.truncated && (
                  <div className="py-note">
                    This program has many steps — showing the first {total} so it stays smooth.
                  </div>
                )}

                {result.error && <pre className="py-error">{result.error}</pre>}

                {result.images.length > 0 && (
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
            </>
          )}
        </section>
      </div>
    </>
  )
}
