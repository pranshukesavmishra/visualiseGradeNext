import { motion } from 'framer-motion'
import { Frame, StepKind } from '../lang/types'
import VariablesPanel from './VariablesPanel'
import Console from './Console'

interface Props {
  frame: Frame | null
}

const ICONS: Record<StepKind, string> = {
  start: '🎬',
  assign: '📦',
  print: '🖨️',
  check: '🤔',
  loop: '🔁',
  update: '✏️',
  done: '🎉',
}

// The right-hand "movie screen": narration, live variables, and the console.
export default function Stage({ frame }: Props) {
  const vars = frame?.vars ?? {}
  const accesses = frame?.accesses ?? []
  const output = frame?.output ?? []
  const note = frame?.note ?? 'Press play to watch your code come alive.'
  const kind = frame?.kind ?? 'start'

  return (
    <div className="stage">
      <motion.div
        className="narration"
        key={note}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="icon">{ICONS[kind]}</div>
        <div className="text">{note}</div>
      </motion.div>

      <div className="stage-section-title">Variables — the computer's memory</div>
      <VariablesPanel vars={vars} accesses={accesses} />

      <div className="stage-section-title">Output screen</div>
      <Console lines={output} />
    </div>
  )
}
