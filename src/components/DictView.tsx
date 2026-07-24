import { AnimatePresence, motion } from 'framer-motion'
import { DictValue } from '../lang/types'
import { formatValue } from '../lang/interpreter'

interface Props {
  name: string
  dict: DictValue
}

// Shows a Python dict / hash map as animated key → value chips.
export default function DictView({ name, dict }: Props) {
  return (
    <div className="dict-card">
      <div className="var-name">{name}</div>
      <div className="dict-entries">
        {dict.entries.length === 0 && <span className="empty-hint">empty {'{}'}</span>}
        <AnimatePresence initial={false}>
          {dict.entries.map(([k, v]) => (
            <motion.div
              key={k}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              className="dict-entry"
            >
              <span className="dict-key">{k}</span>
              <span className="dict-arrow">→</span>
              <span className="dict-val">{formatValue(v)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
