import { motion } from 'framer-motion'
import { Access, Value } from '../lang/types'
import { formatValue } from '../lang/interpreter'

interface Props {
  name: string
  values: Value[]
  accesses: Access[]
}

// Picks the strongest highlight for a cell (write > compare > read).
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

// Draws a list as animated bars (when every item is a number) or as chips.
export default function ArrayViz({ name, values, accesses }: Props) {
  const allNumbers = values.length > 0 && values.every((v) => typeof v === 'number')

  if (!allNumbers) {
    return (
      <div className="array-card">
        <div className="var-name">{name}</div>
        <div className="chip-list">
          {values.length === 0 && <span className="empty-hint">empty list</span>}
          {values.map((v, i) => {
            const kind = kindFor(accesses, name, i)
            return (
              <motion.span
                key={i}
                layout
                className={`value-chip ${kind ?? ''}`}
                animate={{ scale: kind ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                {formatValue(v)}
              </motion.span>
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
          const kind = kindFor(accesses, name, i)
          const heightPct = (Math.abs(n) / max) * 100
          return (
            <div className="bar-col" key={i}>
              <span className="bar-value">{n}</span>
              <motion.div
                className={`bar ${kind ?? ''}`}
                animate={{ height: `${heightPct}%`, scale: kind === 'compare' || kind === 'write' ? 1.02 : 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              />
              <span className="bar-index">{i}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
