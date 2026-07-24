import { AnimatePresence, motion } from 'framer-motion'
import { Access, DictValue, isDict, Value } from '../lang/types'
import { formatValue } from '../lang/interpreter'
import ArrayViz, { Pointer } from './ArrayViz'
import DictView from './DictView'

interface Props {
  vars: Record<string, Value>
  accesses: Access[]
}

// Shows every variable: lists become the ArrayViz (with pointer badges for the
// index variables that point into them), dicts become key→value chips, and
// scalars become "memory boxes".
export default function VariablesPanel({ vars, accesses }: Props) {
  const entries = Object.entries(vars)
  const lists = entries.filter(([, v]) => Array.isArray(v)) as [string, Value[]][]
  const dicts = entries.filter(([, v]) => isDict(v)) as [string, DictValue][]
  const scalars = entries.filter(([, v]) => !Array.isArray(v) && !isDict(v))

  // Integer scalars can act as pointers into a list of the same length range.
  const intScalars = scalars.filter(
    ([, v]) => typeof v === 'number' && Number.isInteger(v),
  ) as [string, number][]

  // Assign each index variable a stable colour so i, j, k read distinctly.
  const colorOf = new Map(intScalars.map(([n], i) => [n, i % 4]))

  const pointersFor = (listName: string, len: number): Pointer[] =>
    intScalars
      .filter(([, idx]) => idx >= 0 && idx < len)
      // Heuristic: only treat short-named counters as pointers, and only when
      // the list is non-trivial, to avoid noise from unrelated numbers.
      .filter(([n]) => n.length <= 12 && len > 1 && isIndexLike(n, listName))
      .map(([n, idx]) => ({ name: n, index: idx, colorIndex: colorOf.get(n) ?? 0 }))

  if (entries.length === 0) {
    return <div className="empty-hint">No variables yet — they will pop up here as the code runs. ✨</div>
  }

  return (
    <>
      {lists.map(([name, values]) => (
        <ArrayViz
          key={name}
          name={name}
          values={values}
          accesses={accesses}
          pointers={pointersFor(name, values.length)}
        />
      ))}

      {dicts.map(([name, dict]) => (
        <DictView key={name} name={name} dict={dict} />
      ))}

      {scalars.length > 0 && (
        <div className="vars-grid">
          <AnimatePresence>
            {scalars.map(([name, value]) => {
              const isText = typeof value === 'string'
              return (
                <motion.div
                  key={name}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                  className="var-box"
                >
                  <div className="var-name">{name}</div>
                  <motion.div
                    key={String(value)}
                    initial={{ scale: 1.25 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.35 }}
                    className={`var-value ${isText ? 'text' : ''}`}
                  >
                    {formatValue(value)}
                  </motion.div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </>
  )
}

// Common index/counter names get pointer badges regardless of list; other
// integer variables only when their name hints at indexing that list.
const INDEX_NAMES = new Set([
  'i', 'j', 'k', 'l', 'm', 'n',
  'idx', 'index', 'pos', 'p', 'q', 'lo', 'hi', 'low', 'high', 'mid',
  'left', 'right', 'start', 'end', 'min_index', 'max_index', 'pivot',
])

function isIndexLike(varName: string, listName: string): boolean {
  const v = varName.toLowerCase()
  if (INDEX_NAMES.has(v)) return true
  // e.g. "nums_i", "i_nums", or names mentioning the list
  return v.includes(listName.toLowerCase()) || v.endsWith('_index') || v.endsWith('idx')
}
