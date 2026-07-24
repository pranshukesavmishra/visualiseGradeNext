// Converts the raw line-by-line trace coming from Pyodide into the same Frame
// shape the animated visualiser already uses. It works out a friendly note for
// each step (the line of code that ran, plus what changed) and which list cells
// changed (so they can glow), by comparing each step to the one before it.

import { Access, Frame, StepKind, Value } from '../lang/types'
import { formatValue } from '../lang/interpreter'

export interface RawFrame {
  line: number
  vars: Record<string, Value>
  olen: number // number of complete console lines printed so far
  stack?: string[] // user function names, outermost → current
}

export function buildFrames(trace: RawFrame[], output: string, source: string): Frame[] {
  const outLines = output.length ? output.split('\n') : []
  const srcLines = source.split('\n')
  const frames: Frame[] = []
  let prev: Record<string, Value> | null = null

  for (let i = 0; i < trace.length; i++) {
    const raw = trace[i]
    const lineText = (srcLines[raw.line - 1] || '').trim()
    const change = diff(prev, raw.vars)

    let note: string
    let kind: StepKind
    if (i === 0) {
      note = lineText || 'Start'
      kind = 'start'
    } else {
      note = lineText
      if (change.desc) note = note ? `${note}   ·   ${change.desc}` : change.desc
      kind = change.printed ? 'print' : change.kind
    }

    // Detect a fresh print by checking whether the console grew this step.
    const printed = prev !== null && raw.olen > (trace[i - 1]?.olen ?? 0)
    if (printed && kind !== 'update') kind = 'print'

    frames.push({
      line: raw.line,
      vars: raw.vars,
      output: outLines.slice(0, raw.olen),
      note: note || `Line ${raw.line}`,
      accesses: change.accesses,
      kind,
      stack: raw.stack,
    })
    prev = raw.vars
  }

  return frames
}

interface Change {
  desc: string
  accesses: Access[]
  kind: StepKind
  printed: boolean
}

function diff(prev: Record<string, Value> | null, cur: Record<string, Value>): Change {
  if (!prev) return { desc: '', accesses: [], kind: 'assign', printed: false }

  const accesses: Access[] = []
  const descs: string[] = []
  let kind: StepKind = 'check'

  for (const key of Object.keys(cur)) {
    const before = prev[key]
    const after = cur[key]

    if (before === undefined) {
      descs.push(`${key} = ${short(after)}`)
      kind = Array.isArray(after) ? 'update' : 'assign'
      continue
    }

    if (!equal(before, after)) {
      if (Array.isArray(before) && Array.isArray(after)) {
        const n = Math.max(before.length, after.length)
        for (let idx = 0; idx < n; idx++) {
          if (!equal(before[idx], after[idx])) accesses.push({ name: key, index: idx, kind: 'write' })
        }
        descs.push(`${key} → ${short(after)}`)
        kind = 'update'
      } else {
        descs.push(`${key} → ${short(after)}`)
        if (kind !== 'update') kind = 'assign'
      }
    }
  }

  return { desc: descs.join(', '), accesses, kind, printed: false }
}

// Keep narration readable — long arrays/strings get shortened.
function short(v: Value): string {
  const s = formatValue(v)
  return s.length <= 60 ? s : s.slice(0, 57) + '…'
}

function equal(a: Value | undefined, b: Value | undefined): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => equal(x, b[i]))
  }
  return a === b
}
