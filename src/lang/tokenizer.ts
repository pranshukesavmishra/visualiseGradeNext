// Turns a single line of source text into a flat list of tokens.
// Indentation and line structure are handled later by the parser.

export type TokenType =
  | 'num'
  | 'str'
  | 'name'
  | 'kw'
  | 'op' // + - * / % // == != < <= > >= = (compound handled in parser)
  | 'lparen'
  | 'rparen'
  | 'lbracket'
  | 'rbracket'
  | 'comma'
  | 'colon'

export interface Token {
  type: TokenType
  value: string
  col: number // column where the token starts (for error messages)
}

const KEYWORDS = new Set([
  'if',
  'elif',
  'else',
  'for',
  'while',
  'in',
  'and',
  'or',
  'not',
  'True',
  'False',
  'break',
  'continue',
])

const TWO_CHAR_OPS = new Set(['==', '!=', '<=', '>=', '//'])

export class TokenizeError extends Error {}

export function tokenizeLine(text: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const n = text.length

  while (i < n) {
    const ch = text[i]

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      i++
      continue
    }

    // Comment — the rest of the line is ignored
    if (ch === '#') break

    const startCol = i

    // Numbers (integers and decimals)
    if (isDigit(ch)) {
      let num = ''
      while (i < n && (isDigit(text[i]) || text[i] === '.')) {
        num += text[i]
        i++
      }
      tokens.push({ type: 'num', value: num, col: startCol })
      continue
    }

    // Strings (single or double quoted)
    if (ch === '"' || ch === "'") {
      const quote = ch
      i++
      let str = ''
      while (i < n && text[i] !== quote) {
        if (text[i] === '\\' && i + 1 < n) {
          const next = text[i + 1]
          str += next === 'n' ? '\n' : next === 't' ? '\t' : next
          i += 2
        } else {
          str += text[i]
          i++
        }
      }
      if (i >= n) throw new TokenizeError('This text is missing a closing quote.')
      i++ // closing quote
      tokens.push({ type: 'str', value: str, col: startCol })
      continue
    }

    // Names and keywords
    if (isNameStart(ch)) {
      let name = ''
      while (i < n && isNameChar(text[i])) {
        name += text[i]
        i++
      }
      tokens.push({ type: KEYWORDS.has(name) ? 'kw' : 'name', value: name, col: startCol })
      continue
    }

    // Two-character operators
    const two = text.slice(i, i + 2)
    if (TWO_CHAR_OPS.has(two)) {
      tokens.push({ type: 'op', value: two, col: startCol })
      i += 2
      continue
    }

    // Single-character structural tokens and operators
    switch (ch) {
      case '(':
        tokens.push({ type: 'lparen', value: ch, col: startCol })
        break
      case ')':
        tokens.push({ type: 'rparen', value: ch, col: startCol })
        break
      case '[':
        tokens.push({ type: 'lbracket', value: ch, col: startCol })
        break
      case ']':
        tokens.push({ type: 'rbracket', value: ch, col: startCol })
        break
      case ',':
        tokens.push({ type: 'comma', value: ch, col: startCol })
        break
      case ':':
        tokens.push({ type: 'colon', value: ch, col: startCol })
        break
      case '=':
      case '+':
      case '-':
      case '*':
      case '/':
      case '%':
      case '<':
      case '>':
        tokens.push({ type: 'op', value: ch, col: startCol })
        break
      default:
        throw new TokenizeError(`I don't understand the symbol "${ch}".`)
    }
    i++
  }

  return tokens
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

function isNameStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'
}

function isNameChar(ch: string): boolean {
  return isNameStart(ch) || isDigit(ch)
}
