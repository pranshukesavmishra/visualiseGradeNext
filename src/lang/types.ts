// Shared types for the tiny beginner language that powers GradeNext.
//
// The language is a small, safe subset of Python that is friendly for
// young learners: variables, numbers, strings, lists, print, if/elif/else,
// while and for loops, and a handful of built-in helpers.

export type Value = number | string | boolean | Value[] | DictValue

// A Python dict, kept structured so the UI can show key → value chips.
export interface DictValue {
  __kind__: 'dict'
  entries: [string, Value][]
}

export function isDict(v: Value): v is DictValue {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && (v as DictValue).__kind__ === 'dict'
}

// A single access to a list element during a step. Used to highlight
// which cells were touched (and how) while animating the visualisation.
export type AccessKind = 'read' | 'write' | 'compare'

export interface Access {
  name: string // the list variable that was touched
  index: number // which cell
  kind: AccessKind
}

// One "movie frame" of the running program. The player steps through these
// like frames of a video. Each frame is a snapshot of the whole program
// state plus a friendly note describing what just happened.
export interface Frame {
  line: number // 1-based source line to highlight (0 = none)
  vars: Record<string, Value> // every variable and its current value
  output: string[] // console output produced so far
  note: string // kid-friendly narration of this step
  accesses: Access[] // list cells touched in this step (for highlighting)
  kind: StepKind // used to pick an icon / colour for the step
  stack?: string[] // call stack of user function names (outermost → current)
  nodeId?: number // active recursion-tree node id for this step (-1 = none)
}

// A single call in the recursion tree (built from call/return trace events).
export interface TreeNode {
  id: number
  parent: number // -1 for a root call
  label: string // e.g. "fib(6)"
  depth: number
  born: number // step index when the call started
  dead: number // step index when it returned (-1 = still on the stack)
}

export type StepKind =
  | 'start'
  | 'assign'
  | 'print'
  | 'check'
  | 'loop'
  | 'update'
  | 'done'

export interface RunResult {
  frames: Frame[]
  error: string | null
  errorLine: number | null
}
