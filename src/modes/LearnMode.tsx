import { useEffect, useMemo, useRef, useState } from 'react'
import { run } from '../lang/interpreter'
import { EXAMPLES, DEFAULT_EXAMPLE } from '../lang/examples'
import CodeEditor from '../components/CodeEditor'
import Stage from '../components/Stage'
import Player from '../components/Player'
import { loadCode, saveCode } from '../lib/prefs'

interface Props {
  seedCode?: string
  reportCode: (code: string) => void
}

// "Learn" mode: the animated, step-by-step visualiser for young learners.
export default function LearnMode({ seedCode, reportCode }: Props) {
  const [code, setCode] = useState(seedCode ?? loadCode('learn') ?? DEFAULT_EXAMPLE.code)
  const [activeExample, setActiveExample] = useState(DEFAULT_EXAMPLE.id)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  // Re-run the program whenever the code changes. Running is cheap and the
  // interpreter is capped, so this stays responsive.
  const result = useMemo(() => run(code), [code])
  const frames = result.frames
  const total = frames.length

  // Keep the current step inside the valid range as frames change.
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(total - 1, 0)))
  }, [total])

  const clampedIndex = Math.min(index, Math.max(total - 1, 0))
  const frame = total > 0 ? frames[clampedIndex] : null
  const activeLine = playing || clampedIndex > 0 || result.error ? frame?.line ?? 0 : 0

  // Playback timer: advance frames while "playing".
  const intervalRef = useRef<number | null>(null)
  useEffect(() => {
    if (!playing) return
    const delay = 700 / speed
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

  // Autosave the code and report it upward (for the Share button).
  useEffect(() => {
    saveCode('learn', code)
    reportCode(code)
  }, [code, reportCode])

  // Keyboard shortcuts: space = play/pause, ← → = step (ignored while typing).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.key === ' ') {
        e.preventDefault()
        handlePlayPause()
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

  function loadExample(id: string) {
    const ex = EXAMPLES.find((e) => e.id === id)
    if (!ex) return
    setActiveExample(id)
    setCode(ex.code)
    setIndex(0)
    setPlaying(false)
  }

  function handleCodeChange(next: string) {
    setCode(next)
    setActiveExample('') // no longer a pristine example
    setIndex(0)
    setPlaying(false)
  }

  function handlePlayPause() {
    if (total === 0) return
    if (clampedIndex >= total - 1) {
      setIndex(0)
      setPlaying(true)
    } else {
      setPlaying((p) => !p)
    }
  }

  function handleRunFromStart() {
    setIndex(0)
    setPlaying(true)
  }

  const currentExample = EXAMPLES.find((e) => e.id === activeExample)

  return (
    <>
      <div className="examples mode-examples">
        <span className="examples-label">Try one:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            className={`chip ${activeExample === ex.id ? 'active' : ''}`}
            onClick={() => loadExample(ex.id)}
            title={ex.description}
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
            <h2>Your Code</h2>
            {currentExample && <span className="grade-tag">{currentExample.grade}</span>}
            <div className="panel-head-spacer" />
          </div>

          <CodeEditor code={code} onChange={handleCodeChange} activeLine={activeLine} />

          {result.error && (
            <p className="error-banner">
              <span>🐛</span>
              <span>
                {result.error}
                {result.errorLine ? ` (line ${result.errorLine})` : ''}
              </span>
            </p>
          )}

          <div className="toolbar">
            <button className="btn primary" onClick={handleRunFromStart} disabled={total === 0}>
              ▶ Run &amp; Watch
            </button>
            <button className="btn ghost" onClick={() => loadExample(activeExample || DEFAULT_EXAMPLE.id)}>
              ↺ Reset example
            </button>
          </div>
        </section>

        {/* Right: visualisation */}
        <section className="panel">
          <div className="panel-head">
            <h2>Visualiser</h2>
            <span className="grade-tag">live</span>
            <div className="panel-head-spacer" />
          </div>

          <Stage frame={frame} />

          <div style={{ padding: '0 18px 16px' }}>
            <Player
              index={clampedIndex}
              total={total}
              playing={playing}
              speed={speed}
              onPlayPause={handlePlayPause}
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
          </div>
        </section>
      </div>
    </>
  )
}
