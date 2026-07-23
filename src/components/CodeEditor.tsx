import { useMemo } from 'react'

interface Props {
  code: string
  onChange: (code: string) => void
  activeLine: number // 1-based; 0 = none
}

const LINE_HEIGHT = 24 // keep in sync with --line-height in styles.css
const PADDING_TOP = 14 // keep in sync with .code-input padding-top

// A lightweight code editor: a plain <textarea> on top of a highlight strip
// that marks the line currently being executed. No heavy editor dependency,
// which keeps the app fast and the line-highlighting perfectly in sync.
export default function CodeEditor({ code, onChange, activeLine }: Props) {
  const lineCount = useMemo(() => Math.max(code.split('\n').length, 1), [code])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Insert spaces on Tab so young learners don't lose focus to the page.
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = e.currentTarget
      const start = el.selectionStart
      const end = el.selectionEnd
      const next = code.slice(0, start) + '    ' + code.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 4
      })
    }
  }

  return (
    <div className="editor">
      <div className="gutter" aria-hidden="true">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className={`gutter-num ${i + 1 === activeLine ? 'active' : ''}`}>
            {i + 1}
          </div>
        ))}
      </div>
      <div className="code-area">
        {activeLine > 0 && (
          <div
            className="active-strip"
            style={{ top: PADDING_TOP + (activeLine - 1) * LINE_HEIGHT }}
          />
        )}
        <textarea
          className="code-input"
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          aria-label="Code editor"
        />
      </div>
    </div>
  )
}
