import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  lines: string[]
}

// The "screen" where print() output appears, line by line.
export default function Console({ lines }: Props) {
  return (
    <div className="console">
      {lines.length === 0 && <div className="console-empty">Anything you print( ) will show up here…</div>}
      <AnimatePresence initial={false}>
        {lines.map((line, i) => (
          <motion.div
            key={i}
            className="console-line"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {line === '' ? ' ' : line}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
