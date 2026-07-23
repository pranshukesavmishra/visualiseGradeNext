// A small recursive-descent parser for the beginner language.
// It first splits the source into indented logical lines, then builds an
// abstract syntax tree (AST) that the interpreter walks.

import { Token, tokenizeLine, TokenizeError } from './tokenizer'

export class ParseError extends Error {
  line: number
  constructor(message: string, line: number) {
    super(message)
    this.line = line
  }
}

// ---- AST node definitions -------------------------------------------------

export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'name'; name: string }
  | { kind: 'list'; elements: Expr[] }
  | { kind: 'index'; target: Expr; index: Expr }
  | { kind: 'unary'; op: string; operand: Expr }
  | { kind: 'binary'; op: string; left: Expr; right: Expr }
  | { kind: 'call'; name: string; args: Expr[] }

export type Stmt =
  | { kind: 'assign'; name: string; index: Expr | null; value: Expr; line: number }
  | { kind: 'print'; args: Expr[]; line: number }
  | { kind: 'expr'; expr: Expr; line: number }
  | { kind: 'if'; branches: { cond: Expr; body: Stmt[] }[]; elseBody: Stmt[] | null; line: number }
  | { kind: 'while'; cond: Expr; body: Stmt[]; line: number }
  | { kind: 'for'; varName: string; iter: Expr; body: Stmt[]; line: number }
  | { kind: 'break'; line: number }
  | { kind: 'continue'; line: number }

interface LogicalLine {
  indent: number
  tokens: Token[]
  lineNo: number // 1-based original line number
}

// ---- Public entry point ---------------------------------------------------

export function parse(source: string): Stmt[] {
  const lines = toLogicalLines(source)
  const parser = new Parser(lines)
  const program = parser.parseBlock(0)
  if (parser.pos < lines.length) {
    throw new ParseError('This line has unexpected indentation.', lines[parser.pos].lineNo)
  }
  return program
}

function toLogicalLines(source: string): LogicalLine[] {
  const rawLines = source.replace(/\r\n/g, '\n').split('\n')
  const result: LogicalLine[] = []

  rawLines.forEach((raw, idx) => {
    const lineNo = idx + 1
    let indent = 0
    for (const ch of raw) {
      if (ch === ' ') indent += 1
      else if (ch === '\t') indent += 4
      else break
    }
    let tokens: Token[]
    try {
      tokens = tokenizeLine(raw)
    } catch (e) {
      const msg = e instanceof TokenizeError ? e.message : 'I could not read this line.'
      throw new ParseError(msg, lineNo)
    }
    if (tokens.length === 0) return // blank or comment-only line
    result.push({ indent, tokens, lineNo })
  })

  return result
}

// ---- Parser ---------------------------------------------------------------

class Parser {
  pos = 0
  constructor(private lines: LogicalLine[]) {}

  // Parse consecutive statements that share the given indentation.
  parseBlock(indent: number): Stmt[] {
    const stmts: Stmt[] = []
    while (this.pos < this.lines.length && this.lines[this.pos].indent === indent) {
      stmts.push(this.parseStatement(indent))
    }
    return stmts
  }

  private parseStatement(indent: number): Stmt {
    const line = this.lines[this.pos]
    const first = line.tokens[0]

    if (first.type === 'kw') {
      switch (first.value) {
        case 'if':
          return this.parseIf(indent)
        case 'while':
          return this.parseWhile(indent)
        case 'for':
          return this.parseFor(indent)
        case 'break':
          this.pos++
          return { kind: 'break', line: line.lineNo }
        case 'continue':
          this.pos++
          return { kind: 'continue', line: line.lineNo }
        case 'elif':
        case 'else':
          throw new ParseError(`"${first.value}" needs a matching "if" above it.`, line.lineNo)
      }
    }

    // Simple (single-line) statement
    this.pos++
    return this.parseSimple(line)
  }

  private parseSimple(line: LogicalLine): Stmt {
    const tokens = line.tokens
    const ep = new ExprParser(tokens, line.lineNo)

    // print(...) is treated specially so we can narrate output nicely.
    if (tokens[0].type === 'name' && tokens[0].value === 'print') {
      const call = ep.parseFull()
      if (call.kind !== 'call' || call.name !== 'print') {
        throw new ParseError('"print" should look like print(something).', line.lineNo)
      }
      return { kind: 'print', args: call.args, line: line.lineNo }
    }

    // Assignment? Look for a top-level single "=".
    const eqIndex = findTopLevelAssign(tokens)
    if (eqIndex !== -1) {
      const targetTokens = tokens.slice(0, eqIndex)
      const valueTokens = tokens.slice(eqIndex + 1)
      if (valueTokens.length === 0) {
        throw new ParseError('This assignment is missing a value after "=".', line.lineNo)
      }
      const target = new ExprParser(targetTokens, line.lineNo).parseFull()
      const value = new ExprParser(valueTokens, line.lineNo).parseFull()

      if (target.kind === 'name') {
        return { kind: 'assign', name: target.name, index: null, value, line: line.lineNo }
      }
      if (target.kind === 'index' && target.target.kind === 'name') {
        return {
          kind: 'assign',
          name: target.target.name,
          index: target.index,
          value,
          line: line.lineNo,
        }
      }
      throw new ParseError('The left side of "=" must be a variable or list slot.', line.lineNo)
    }

    // Otherwise it's a bare expression (e.g. append(nums, 5)).
    const expr = ep.parseFull()
    return { kind: 'expr', expr, line: line.lineNo }
  }

  private parseHeaderCond(line: LogicalLine, keyword: string): Expr {
    const tokens = line.tokens
    // Strip the leading keyword and the trailing ":".
    const last = tokens[tokens.length - 1]
    if (!last || last.type !== 'colon') {
      throw new ParseError(`"${keyword}" lines must end with a colon ":".`, line.lineNo)
    }
    const inner = tokens.slice(1, tokens.length - 1)
    if (inner.length === 0) {
      throw new ParseError(`"${keyword}" needs a condition to check.`, line.lineNo)
    }
    return new ExprParser(inner, line.lineNo).parseFull()
  }

  private parseBody(headerIndent: number, keyword: string, headerLine: number): Stmt[] {
    if (this.pos >= this.lines.length || this.lines[this.pos].indent <= headerIndent) {
      throw new ParseError(`"${keyword}" needs indented lines beneath it.`, headerLine)
    }
    const bodyIndent = this.lines[this.pos].indent
    return this.parseBlock(bodyIndent)
  }

  private parseIf(indent: number): Stmt {
    const ifLine = this.lines[this.pos]
    const cond = this.parseHeaderCond(ifLine, 'if')
    this.pos++
    const body = this.parseBody(indent, 'if', ifLine.lineNo)
    const branches = [{ cond, body }]
    let elseBody: Stmt[] | null = null

    while (this.pos < this.lines.length && this.lines[this.pos].indent === indent) {
      const t = this.lines[this.pos].tokens[0]
      if (t.type === 'kw' && t.value === 'elif') {
        const elifLine = this.lines[this.pos]
        const elifCond = this.parseHeaderCond(elifLine, 'elif')
        this.pos++
        branches.push({ cond: elifCond, body: this.parseBody(indent, 'elif', elifLine.lineNo) })
      } else if (t.type === 'kw' && t.value === 'else') {
        const elseLine = this.lines[this.pos]
        if (elseLine.tokens.length !== 2 || elseLine.tokens[1].type !== 'colon') {
          throw new ParseError('"else" should be written as "else:".', elseLine.lineNo)
        }
        this.pos++
        elseBody = this.parseBody(indent, 'else', elseLine.lineNo)
        break
      } else {
        break
      }
    }

    return { kind: 'if', branches, elseBody, line: ifLine.lineNo }
  }

  private parseWhile(indent: number): Stmt {
    const line = this.lines[this.pos]
    const cond = this.parseHeaderCond(line, 'while')
    this.pos++
    const body = this.parseBody(indent, 'while', line.lineNo)
    return { kind: 'while', cond, body, line: line.lineNo }
  }

  private parseFor(indent: number): Stmt {
    const line = this.lines[this.pos]
    const tokens = line.tokens
    // for NAME in ITER :
    if (
      tokens.length < 5 ||
      tokens[1].type !== 'name' ||
      !(tokens[2].type === 'kw' && tokens[2].value === 'in') ||
      tokens[tokens.length - 1].type !== 'colon'
    ) {
      throw new ParseError('A loop should look like: for i in range(5):', line.lineNo)
    }
    const varName = tokens[1].value
    const iterTokens = tokens.slice(3, tokens.length - 1)
    const iter = new ExprParser(iterTokens, line.lineNo).parseFull()
    this.pos++
    const body = this.parseBody(indent, 'for', line.lineNo)
    return { kind: 'for', varName, iter, body, line: line.lineNo }
  }
}

// Find a top-level (not nested in () or []) single "=" that is an assignment.
function findTopLevelAssign(tokens: Token[]): number {
  let depth = 0
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.type === 'lparen' || t.type === 'lbracket') depth++
    else if (t.type === 'rparen' || t.type === 'rbracket') depth--
    else if (depth === 0 && t.type === 'op' && t.value === '=') return i
  }
  return -1
}

// ---- Expression parser ----------------------------------------------------

const COMPARISONS = new Set(['==', '!=', '<', '<=', '>', '>='])

class ExprParser {
  private pos = 0
  constructor(private tokens: Token[], private lineNo: number) {}

  parseFull(): Expr {
    if (this.tokens.length === 0) {
      throw new ParseError('I expected something here but the line ended.', this.lineNo)
    }
    const expr = this.parseOr()
    if (this.pos < this.tokens.length) {
      throw new ParseError(`I got stuck at "${this.tokens[this.pos].value}".`, this.lineNo)
    }
    return expr
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private parseOr(): Expr {
    let left = this.parseAnd()
    while (this.matchKw('or')) {
      const right = this.parseAnd()
      left = { kind: 'binary', op: 'or', left, right }
    }
    return left
  }

  private parseAnd(): Expr {
    let left = this.parseNot()
    while (this.matchKw('and')) {
      const right = this.parseNot()
      left = { kind: 'binary', op: 'and', left, right }
    }
    return left
  }

  private parseNot(): Expr {
    if (this.matchKw('not')) {
      return { kind: 'unary', op: 'not', operand: this.parseNot() }
    }
    return this.parseComparison()
  }

  private parseComparison(): Expr {
    let left = this.parseAdd()
    while (this.peekOp() && COMPARISONS.has(this.peek()!.value)) {
      const op = this.tokens[this.pos].value
      this.pos++
      const right = this.parseAdd()
      left = { kind: 'binary', op, left, right }
    }
    return left
  }

  private parseAdd(): Expr {
    let left = this.parseMul()
    while (this.peekOp() && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const op = this.tokens[this.pos].value
      this.pos++
      const right = this.parseMul()
      left = { kind: 'binary', op, left, right }
    }
    return left
  }

  private parseMul(): Expr {
    let left = this.parseUnary()
    while (
      this.peekOp() &&
      ['*', '/', '%', '//'].includes(this.peek()!.value)
    ) {
      const op = this.tokens[this.pos].value
      this.pos++
      const right = this.parseUnary()
      left = { kind: 'binary', op, left, right }
    }
    return left
  }

  private parseUnary(): Expr {
    if (this.peekOp() && this.peek()!.value === '-') {
      this.pos++
      return { kind: 'unary', op: '-', operand: this.parseUnary() }
    }
    return this.parsePostfix()
  }

  private parsePostfix(): Expr {
    let expr = this.parseAtom()
    while (this.peek() && this.peek()!.type === 'lbracket') {
      this.pos++ // [
      const index = this.parseOr()
      this.expect('rbracket', 'a closing "]"')
      expr = { kind: 'index', target: expr, index }
    }
    return expr
  }

  private parseAtom(): Expr {
    const t = this.peek()
    if (!t) throw new ParseError('I expected a value but the line ended.', this.lineNo)

    if (t.type === 'num') {
      this.pos++
      return { kind: 'num', value: Number(t.value) }
    }
    if (t.type === 'str') {
      this.pos++
      return { kind: 'str', value: t.value }
    }
    if (t.type === 'kw' && (t.value === 'True' || t.value === 'False')) {
      this.pos++
      return { kind: 'bool', value: t.value === 'True' }
    }
    if (t.type === 'name') {
      this.pos++
      // function call?
      if (this.peek() && this.peek()!.type === 'lparen') {
        this.pos++ // (
        const args = this.parseArgs()
        this.expect('rparen', 'a closing ")"')
        return { kind: 'call', name: t.value, args }
      }
      return { kind: 'name', name: t.value }
    }
    if (t.type === 'lparen') {
      this.pos++
      const inner = this.parseOr()
      this.expect('rparen', 'a closing ")"')
      return inner
    }
    if (t.type === 'lbracket') {
      this.pos++
      const elements: Expr[] = []
      if (this.peek() && this.peek()!.type !== 'rbracket') {
        elements.push(this.parseOr())
        while (this.peek() && this.peek()!.type === 'comma') {
          this.pos++
          elements.push(this.parseOr())
        }
      }
      this.expect('rbracket', 'a closing "]"')
      return { kind: 'list', elements }
    }

    throw new ParseError(`I did not expect "${t.value}" here.`, this.lineNo)
  }

  private parseArgs(): Expr[] {
    const args: Expr[] = []
    if (this.peek() && this.peek()!.type !== 'rparen') {
      args.push(this.parseOr())
      while (this.peek() && this.peek()!.type === 'comma') {
        this.pos++
        args.push(this.parseOr())
      }
    }
    return args
  }

  private matchKw(value: string): boolean {
    const t = this.peek()
    if (t && t.type === 'kw' && t.value === value) {
      this.pos++
      return true
    }
    return false
  }

  private peekOp(): boolean {
    const t = this.peek()
    return !!t && t.type === 'op'
  }

  private expect(type: string, description: string): void {
    const t = this.peek()
    if (!t || t.type !== type) {
      throw new ParseError(`I was looking for ${description}.`, this.lineNo)
    }
    this.pos++
  }
}
