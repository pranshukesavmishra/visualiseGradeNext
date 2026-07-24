import { motion, AnimatePresence } from 'framer-motion'
import { Access, Value } from '../lang/types'
import { formatValue } from '../lang/interpreter'

export interface Pointer {
  name: string // the variable that holds this index
  index: number // the cell it points at
  colorIndex?: number // which pointer colour to use (0..3)
}

interface Props {
  name: string
  values: Value[]
  accesses: Access[]
  pointers?: Pointer[] // index variables pointing into this list
}

// Strongest highlight for a cell: write (green) > compare (amber) > read (blue).
function kindFor(accesses: Access[], name: string, index: number): string | null {
  let result: string | null = null
  for (const a of accesses) {
    if (a.name !== name || a.index !== index) continue
    if (a.kind === 'write') return 'write'
    if (a.kind === 'compare') result = 'compare'
    else if (!result) result = 'read'
  }
  return result
}

// Draws a list as animated bars (numbers) or chips, with pointer badges below
// the cells that index-variables currently point to.
export default function ArrayViz({ name, values, accesses, pointers = [] }: Props) {
  const allNumbers = values.length > 0 && values.every((v) => typeof v === 'number')
  const pointersAt = (i: number) => pointers.filter((p) => p.index === i)

  if (!allNumbers) {
    return (
      <div className="array-card">
        <div className="var-name">{name}</div>
        <div className="chip-list">
          {values.length === 0 && <span className="empty-hint">empty list</span>}
          {values.map((v, i) => {
            const kind = kindFor(accesses, name, i)
            const ptrs = pointersAt(i)
            return (
              <div className="chip-cell" key={i}>
                <motion.span
                  layout
                  className={`value-chip ${kind ?? ''} ${ptrs.length ? 'pointed' : ''}`}
                  animate={{ scale: kind || ptrs.length ? 1.06 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                >
                  {formatValue(v)}
                </motion.span>
                <PointerBadges pointers={ptrs} />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const nums = values as number[]
  const max = Math.max(1, ...nums.map((n) => Math.abs(n)))

  return (
    <div className="array-card">
      <div className="var-name">{name}</div>
      <div className="bars">
        {nums.map((n, i) => {
          const write = kindFor(accesses, name, i) === 'write'
          const ptrs = pointersAt(i)
          const state = write ? 'write' : ptrs.length ? 'pointed' : ''
          const heightPct = (Math.abs(n) / max) * 100
          return (
            <div className="bar-col" key={i}>
              <span className="bar-value">{n}</span>
              <div className="bar-track">
                <motion.div
                  className={`bar ${state}`}
                  animate={{ height: `${heightPct}%`, scale: state ? 1.03 : 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                />
              </div>
              <span className="bar-index">{i}</span>
              <PointerBadges pointers={ptrs} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PointerBadges({ pointers }: { pointers: Pointer[] }) {
  return (
    <div className="ptr-stack">
      <AnimatePresence>
        {pointers.map((p) => (
          <motion.span
            key={p.name}
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`ptr-badge c${(p.colorIndex ?? 0) % 4}`}
          >
            <span className="ptr-arrow">▲</span>
            {p.name}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
