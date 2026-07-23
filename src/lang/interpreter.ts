// Walks the AST and records a "movie frame" after every small step so the
// UI can replay the program like a video. Designed to be safe: it caps the
// number of steps and frames so a runaway loop can never freeze the browser.

import { parse, ParseError, Stmt, Expr } from './parser'
import { Access, AccessKind, Frame, RunResult, StepKind, Value } from './types'

class RuntimeError extends Error {
  line: number
  constructor(message: string, line: number) {
    super(message)
    this.line = line
  }
}

type Signal = 'normal' | 'break' | 'continue'

const MAX_STEPS = 20000
const MAX_FRAMES = 4000

class Interpreter {
  private env: Record<string, Value> = {}
  private output: string[] = []
  private frames: Frame[] = []
  private pending: Access[] = []
  private accessMode: AccessKind = 'read'
  private steps = 0
  private lastCallNote = ''
  private execLine = 0 // line of the statement currently executing

  run(program: Stmt[]): Frame[] {
    const firstLine = program.length > 0 ? program[0].line : 0
    this.snap(firstLine, 'Ready to run! Press play. ▶️', 'start')
    this.execBlock(program)
    this.snap(0, 'All done! 🎉', 'done')
    return this.frames
  }

  // ---- Frame recording ----------------------------------------------------

  private snap(line: number, note: string, kind: StepKind): void {
    this.frames.push({
      line,
      vars: deepCopyEnv(this.env),
      output: [...this.output],
      note,
      accesses: this.pending,
      kind,
    })
    this.pending = []
    if (this.frames.length > MAX_FRAMES) {
      throw new RuntimeError(
        'This program has too many steps to show as a movie. Try smaller numbers or shorter loops.',
        line,
      )
    }
  }

  private tick(line: number): void {
    this.steps++
    if (this.steps > MAX_STEPS) {
      throw new RuntimeError(
        'This program runs for too long — it might be stuck in a loop that never ends.',
        line,
      )
    }
  }

  // ---- Statements ---------------------------------------------------------

  private execBlock(stmts: Stmt[]): Signal {
    for (const stmt of stmts) {
      const sig = this.execStmt(stmt)
      if (sig !== 'normal') return sig
    }
    return 'normal'
  }

  private execStmt(stmt: Stmt): Signal {
    this.tick(stmt.line)
    this.execLine = stmt.line
    switch (stmt.kind) {
      case 'assign':
        return this.execAssign(stmt)
      case 'print': {
        const parts = stmt.args.map((a) => formatForPrint(this.eval(a)))
        const text = parts.join(' ')
        this.output.push(text)
        this.snap(stmt.line, `Show on screen: “${text}”`, 'print')
        return 'normal'
      }
      case 'expr':
        this.lastCallNote = 'Ran a command.'
        this.eval(stmt.expr)
        this.snap(stmt.line, this.lastCallNote, 'update')
        return 'normal'
      case 'if':
        return this.execIf(stmt)
      case 'while':
        return this.execWhile(stmt)
      case 'for':
        return this.execFor(stmt)
      case 'break':
        return 'break'
      case 'continue':
        return 'continue'
    }
  }

  private execAssign(stmt: Extract<Stmt, { kind: 'assign' }>): Signal {
    const value = this.eval(stmt.value)
    if (stmt.index === null) {
      this.env[stmt.name] = value
      this.snap(stmt.line, `Set ${stmt.name} = ${formatValue(value)}`, 'assign')
      return 'normal'
    }
    // list[index] = value
    const list = this.env[stmt.name]
    if (!Array.isArray(list)) {
      throw new RuntimeError(`"${stmt.name}" is not a list, so I can't put a value inside it.`, stmt.line)
    }
    const idx = this.toIndex(this.eval(stmt.index), list.length, stmt.name, stmt.line)
    list[idx] = value
    this.pending.push({ name: stmt.name, index: idx, kind: 'write' })
    this.snap(stmt.line, `Put ${formatValue(value)} into ${stmt.name}[${idx}]`, 'assign')
    return 'normal'
  }

  private execIf(stmt: Extract<Stmt, { kind: 'if' }>): Signal {
    for (const branch of stmt.branches) {
      const cond = this.evalCond(branch.cond)
      this.snap(stmt.line, `Check the rule → ${cond ? 'YES, it is true ✅' : 'no, not true ❌'}`, 'check')
      if (cond) return this.execBlock(branch.body)
    }
    if (stmt.elseBody) {
      this.snap(stmt.line, 'None of the rules matched — do the “else” part.', 'check')
      return this.execBlock(stmt.elseBody)
    }
    return 'normal'
  }

  private execWhile(stmt: Extract<Stmt, { kind: 'while' }>): Signal {
    while (true) {
      this.tick(stmt.line)
      const cond = this.evalCond(stmt.cond)
      this.snap(stmt.line, `Should the loop keep going? → ${cond ? 'yes, again 🔁' : 'no, stop ⏹️'}`, 'check')
      if (!cond) break
      const sig = this.execBlock(stmt.body)
      if (sig === 'break') break
      // 'continue' and 'normal' both fall through to re-check the condition
    }
    return 'normal'
  }

  private execFor(stmt: Extract<Stmt, { kind: 'for' }>): Signal {
    const iter = this.eval(stmt.iter)
    if (!Array.isArray(iter)) {
      throw new RuntimeError('A "for" loop needs a list or range to walk through.', stmt.line)
    }
    for (const item of [...iter]) {
      this.tick(stmt.line)
      this.env[stmt.varName] = item
      this.snap(stmt.line, `Loop: ${stmt.varName} = ${formatValue(item)}`, 'loop')
      const sig = this.execBlock(stmt.body)
      if (sig === 'break') break
      // 'continue' moves on to the next item automatically
    }
    return 'normal'
  }

  // ---- Expressions --------------------------------------------------------

  // Evaluate a condition, marking any list reads as "compare" so the UI can
  // highlight the cells being compared.
  private evalCond(expr: Expr): boolean {
    const prev = this.accessMode
    this.accessMode = 'compare'
    try {
      return isTruthy(this.eval(expr))
    } finally {
      this.accessMode = prev
    }
  }

  private eval(expr: Expr): Value {
    switch (expr.kind) {
      case 'num':
        return expr.value
      case 'str':
        return expr.value
      case 'bool':
        return expr.value
      case 'name': {
        if (!(expr.name in this.env)) {
          throw new RuntimeError(`I don't know a variable called "${expr.name}" yet.`, this.currentLine())
        }
        return this.env[expr.name]
      }
      case 'list':
        return expr.elements.map((e) => this.eval(e))
      case 'index':
        return this.evalIndex(expr)
      case 'unary':
        return this.evalUnary(expr)
      case 'binary':
        return this.evalBinary(expr)
      case 'call':
        return this.evalCall(expr)
    }
  }

  private evalIndex(expr: Extract<Expr, { kind: 'index' }>): Value {
    const target = this.eval(expr.target)
    if (!Array.isArray(target)) {
      throw new RuntimeError('Only lists can be looked up with [ ].', this.currentLine())
    }
    const idx = this.toIndex(this.eval(expr.index), target.length, describe(expr.target), this.currentLine())
    if (expr.target.kind === 'name') {
      this.pending.push({ name: expr.target.name, index: idx, kind: this.accessMode })
    }
    return target[idx]
  }

  private evalUnary(expr: Extract<Expr, { kind: 'unary' }>): Value {
    const v = this.eval(expr.operand)
    if (expr.op === '-') {
      if (typeof v !== 'number') throw new RuntimeError('Only numbers can be made negative.', this.currentLine())
      return -v
    }
    // not
    return !isTruthy(v)
  }

  private evalBinary(expr: Extract<Expr, { kind: 'binary' }>): Value {
    // Short-circuit logical operators
    if (expr.op === 'and') {
      const l = this.eval(expr.left)
      return isTruthy(l) ? this.eval(expr.right) : l
    }
    if (expr.op === 'or') {
      const l = this.eval(expr.left)
      return isTruthy(l) ? l : this.eval(expr.right)
    }

    const left = this.eval(expr.left)
    const right = this.eval(expr.right)
    const line = this.currentLine()

    switch (expr.op) {
      case '==':
        return valuesEqual(left, right)
      case '!=':
        return !valuesEqual(left, right)
      case '<':
      case '<=':
      case '>':
      case '>=':
        return compareOrdered(expr.op, left, right, line)
      case '+':
        if (typeof left === 'string' && typeof right === 'string') return left + right
        if (Array.isArray(left) && Array.isArray(right)) return [...left, ...right]
        return this.numeric(left, line) + this.numeric(right, line)
      case '-':
        return this.numeric(left, line) - this.numeric(right, line)
      case '*':
        return this.numeric(left, line) * this.numeric(right, line)
      case '/': {
        const d = this.numeric(right, line)
        if (d === 0) throw new RuntimeError('Oops — you cannot divide by zero.', line)
        return this.numeric(left, line) / d
      }
      case '//': {
        const d = this.numeric(right, line)
        if (d === 0) throw new RuntimeError('Oops — you cannot divide by zero.', line)
        return Math.floor(this.numeric(left, line) / d)
      }
      case '%': {
        const d = this.numeric(right, line)
        if (d === 0) throw new RuntimeError('Oops — you cannot divide by zero.', line)
        return this.numeric(left, line) % d
      }
    }
    throw new RuntimeError(`I don't understand the operator "${expr.op}".`, line)
  }

  private evalCall(expr: Extract<Expr, { kind: 'call' }>): Value {
    const line = this.currentLine()
    const name = expr.name
    switch (name) {
      case 'range':
        return this.builtinRange(expr, line)
      case 'len': {
        const v = this.eval(this.oneArg(expr, line))
        if (Array.isArray(v)) return v.length
        if (typeof v === 'string') return v.length
        throw new RuntimeError('len() only works on lists and text.', line)
      }
      case 'append': {
        if (expr.args.length !== 2) throw new RuntimeError('append(list, value) needs two things.', line)
        const listArg = expr.args[0]
        const list = this.eval(listArg)
        if (!Array.isArray(list)) throw new RuntimeError('append() needs a list as its first item.', line)
        const value = this.eval(expr.args[1])
        list.push(value)
        if (listArg.kind === 'name') {
          this.pending.push({ name: listArg.name, index: list.length - 1, kind: 'write' })
          this.lastCallNote = `Add ${formatValue(value)} to the end of ${listArg.name}`
        } else {
          this.lastCallNote = `Add ${formatValue(value)} to the list`
        }
        return value
      }
      case 'int': {
        const v = this.eval(this.oneArg(expr, line))
        if (typeof v === 'number') return Math.trunc(v)
        if (typeof v === 'string') {
          const n = parseInt(v, 10)
          if (Number.isNaN(n)) throw new RuntimeError(`I can't turn "${v}" into a whole number.`, line)
          return n
        }
        throw new RuntimeError('int() needs a number or text.', line)
      }
      case 'abs':
        return Math.abs(this.numeric(this.eval(this.oneArg(expr, line)), line))
      case 'sum':
        return this.reduceList(expr, line, 'sum')
      case 'min':
        return this.reduceList(expr, line, 'min')
      case 'max':
        return this.reduceList(expr, line, 'max')
      default:
        throw new RuntimeError(`I don't know a command called "${name}".`, line)
    }
  }

  private builtinRange(expr: Extract<Expr, { kind: 'call' }>, line: number): Value {
    const args = expr.args.map((a) => this.numeric(this.eval(a), line))
    let start = 0
    let stop = 0
    let step = 1
    if (args.length === 1) [stop] = args
    else if (args.length === 2) [start, stop] = args
    else if (args.length === 3) [start, stop, step] = args
    else throw new RuntimeError('range() takes 1, 2, or 3 numbers.', line)
    if (step === 0) throw new RuntimeError('range() step cannot be zero.', line)
    const out: number[] = []
    if (step > 0) for (let i = start; i < stop; i += step) out.push(i)
    else for (let i = start; i > stop; i += step) out.push(i)
    return out
  }

  private reduceList(expr: Extract<Expr, { kind: 'call' }>, line: number, mode: 'sum' | 'min' | 'max'): number {
    const v = this.eval(this.oneArg(expr, line))
    if (!Array.isArray(v) || v.length === 0) {
      throw new RuntimeError(`${mode}() needs a list with at least one number.`, line)
    }
    const nums = v.map((x) => this.numeric(x, line))
    if (mode === 'sum') return nums.reduce((a, b) => a + b, 0)
    if (mode === 'min') return Math.min(...nums)
    return Math.max(...nums)
  }

  // ---- Helpers ------------------------------------------------------------

  private oneArg(expr: Extract<Expr, { kind: 'call' }>, line: number): Expr {
    if (expr.args.length !== 1) throw new RuntimeError(`${expr.name}() needs exactly one thing.`, line)
    return expr.args[0]
  }

  private numeric(v: Value, line: number): number {
    if (typeof v !== 'number') throw new RuntimeError('I expected a number here.', line)
    return v
  }

  private toIndex(v: Value, length: number, name: string, line: number): number {
    if (typeof v !== 'number' || !Number.isInteger(v)) {
      throw new RuntimeError('A list position must be a whole number like 0, 1, 2…', line)
    }
    if (v < 0 || v >= length) {
      throw new RuntimeError(`Position ${v} is outside of ${name} (it has ${length} slots).`, line)
    }
    return v
  }

  private currentLine(): number {
    return this.execLine
  }
}

// ---- Value helpers (module-level, pure) -----------------------------------

function isTruthy(v: Value): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return v.length > 0
  if (Array.isArray(v)) return v.length > 0
  return false
}

function valuesEqual(a: Value, b: Value): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => valuesEqual(x, b[i]))
  }
  return a === b
}

function compareOrdered(op: string, a: Value, b: Value, line: number): boolean {
  const bothNumbers = typeof a === 'number' && typeof b === 'number'
  const bothStrings = typeof a === 'string' && typeof b === 'string'
  if (!bothNumbers && !bothStrings) {
    throw new RuntimeError('I can only compare numbers with numbers, or words with words.', line)
  }
  switch (op) {
    case '<':
      return a < b
    case '<=':
      return a <= b
    case '>':
      return a > b
    default:
      return a >= b
  }
}

function deepCopyEnv(env: Record<string, Value>): Record<string, Value> {
  const out: Record<string, Value> = {}
  for (const key of Object.keys(env)) out[key] = deepCopyValue(env[key])
  return out
}

function deepCopyValue(v: Value): Value {
  return Array.isArray(v) ? v.map(deepCopyValue) : v
}

function describe(expr: Expr): string {
  return expr.kind === 'name' ? expr.name : 'the list'
}

// Numbers show as whole numbers when possible; otherwise trimmed to 4 dp.
function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return String(Math.round(n * 10000) / 10000)
}

export function formatValue(v: Value): string {
  if (typeof v === 'number') return formatNumber(v)
  if (typeof v === 'string') return `"${v}"`
  if (typeof v === 'boolean') return v ? 'True' : 'False'
  return `[${v.map(formatValue).join(', ')}]`
}

function formatForPrint(v: Value): string {
  if (typeof v === 'number') return formatNumber(v)
  if (typeof v === 'string') return v // no quotes when printed
  if (typeof v === 'boolean') return v ? 'True' : 'False'
  return `[${v.map(formatValue).join(', ')}]`
}

// ---- Public entry point ---------------------------------------------------

export function run(source: string): RunResult {
  let program: Stmt[]
  try {
    program = parse(source)
  } catch (e) {
    if (e instanceof ParseError) return { frames: [], error: e.message, errorLine: e.line }
    return { frames: [], error: 'I could not read this program.', errorLine: null }
  }

  const interpreter = new Interpreter()
  try {
    const frames = interpreter.run(program)
    return { frames, error: null, errorLine: null }
  } catch (e) {
    if (e instanceof RuntimeError) {
      // Keep the frames gathered so far so the learner sees where it stopped.
      const frames = (interpreter as unknown as { frames: Frame[] }).frames
      return { frames, error: e.message, errorLine: e.line }
    }
    return { frames: [], error: 'Something went wrong while running.', errorLine: null }
  }
}
