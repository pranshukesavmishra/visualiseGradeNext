import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  lines: string[]
}

// The "screen" where print() output appears, line by line — styled like a
// little terminal with a title bar.
export default function Console({ lines }: Props) {
  return (
    <div className="console">
      <div className="console-bar">
        <span className="dot r" />
        <span className="dot y" />
        <span className="dot g" />
        <span className="console-title">output</span>
      </div>
      <div className="console-body">
        {lines.length === 0 && <div className="console-empty">Anything you print( ) shows up here…</div>}
        <AnimatePresence initial={false}>
          {lines.map((line, i) => (
            <motion.div
              key={i}
              className="console-line"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
            >
              {line === '' ? ' ' : line}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
