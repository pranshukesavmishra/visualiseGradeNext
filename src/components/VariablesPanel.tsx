import { AnimatePresence, motion } from 'framer-motion'
import { Access, Value } from '../lang/types'
import { formatValue } from '../lang/interpreter'
import ArrayViz from './ArrayViz'

interface Props {
  vars: Record<string, Value>
  accesses: Access[]
}

// Shows every variable: lists become the ArrayViz, scalars become "memory boxes".
export default function VariablesPanel({ vars, accesses }: Props) {
  const entries = Object.entries(vars)
  const lists = entries.filter(([, v]) => Array.isArray(v)) as [string, Value[]][]
  const scalars = entries.filter(([, v]) => !Array.isArray(v))

  if (entries.length === 0) {
    return <div className="empty-hint">No variables yet — they will pop up here as the code runs. ✨</div>
  }

  return (
    <>
      {lists.map(([name, values]) => (
        <ArrayViz key={name} name={name} values={values} accesses={accesses} />
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
                    initial={{ scale: 1.25, color: '#ec4899' }}
                    animate={{ scale: 1, color: isText ? '#22c55e' : '#1e293b' }}
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
