// A tiny Python-ish syntax highlighter that turns source code into HTML with
// coloured token spans. Used behind the editor so code reads like a pro IDE
// (keywords, strings, numbers, comments, function calls all coloured).

const KEYWORDS = new Set([
  'def', 'return', 'for', 'while', 'if', 'elif', 'else', 'in', 'and', 'or',
  'not', 'True', 'False', 'None', 'break', 'continue', 'import', 'from', 'as',
  'class', 'lambda', 'pass', 'with', 'try', 'except', 'finally', 'raise',
  'global', 'nonlocal', 'yield', 'is', 'del', 'assert', 'await', 'async',
])

const BUILTINS = new Set([
  'print', 'len', 'range', 'append', 'int', 'str', 'float', 'bool', 'list',
  'dict', 'set', 'tuple', 'sum', 'min', 'max', 'abs', 'enumerate', 'zip',
  'map', 'filter', 'sorted', 'reversed', 'round', 'input', 'type', 'isinstance',
])

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const TOKEN =
  /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)|(\b\d+\.?\d*\b)|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z0-9_])/g

export function highlightCode(code: string): string {
  let out = ''
  let m: RegExpExecArray | null
  TOKEN.lastIndex = 0
  while ((m = TOKEN.exec(code))) {
    if (m[1] !== undefined) {
      out += `<span class="t-com">${esc(m[1])}</span>`
    } else if (m[2] !== undefined) {
      out += `<span class="t-str">${esc(m[2])}</span>`
    } else if (m[3] !== undefined) {
      out += `<span class="t-num">${esc(m[3])}</span>`
    } else if (m[4] !== undefined) {
      const word = m[4]
      // Peek ahead (skipping spaces) to see if this identifier is a call.
      let j = TOKEN.lastIndex
      while (j < code.length && (code[j] === ' ' || code[j] === '\t')) j++
      const isCall = code[j] === '('
      if (KEYWORDS.has(word)) out += `<span class="t-kw">${word}</span>`
      else if (BUILTINS.has(word)) out += `<span class="t-bi">${word}</span>`
      else if (isCall) out += `<span class="t-fn">${word}</span>`
      else out += `<span class="t-var">${word}</span>`
    } else if (m[5] !== undefined) {
      out += esc(m[5])
    } else {
      out += `<span class="t-op">${esc(m[6])}</span>`
    }
  }
  return out
}
