// Small helpers for theme, autosave, and share-by-link.

export type Theme = 'light' | 'dark'
export type ModeName = 'learn' | 'python'

const THEME_KEY = 'gradenext:theme'

export function getInitialTheme(): Theme {
  const saved = safeGet(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  // Default to the dark "tech" look unless the user has chosen otherwise.
  return 'dark'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  safeSet(THEME_KEY, theme)
}

// ---- Autosave (per mode) ----

export function codeKey(mode: ModeName): string {
  return `gradenext:code:${mode}`
}

export function loadCode(mode: ModeName): string | null {
  return safeGet(codeKey(mode))
}

export function saveCode(mode: ModeName, code: string): void {
  safeSet(codeKey(mode), code)
}

// ---- Share by link ----

export interface SharedState {
  mode: ModeName
  code: string
}

// Encode the current program into a URL hash so it can be shared.
export function buildShareUrl(state: SharedState): string {
  const json = JSON.stringify(state)
  const b64 = base64UrlEncode(json)
  const base = window.location.origin + window.location.pathname
  return `${base}#s=${b64}`
}

// Read a shared program from the URL hash, if present.
export function readSharedState(): SharedState | null {
  const hash = window.location.hash
  const m = hash.match(/[#&]s=([^&]+)/)
  if (!m) return null
  try {
    const json = base64UrlDecode(m[1])
    const parsed = JSON.parse(json)
    if ((parsed.mode === 'learn' || parsed.mode === 'python') && typeof parsed.code === 'string') {
      return { mode: parsed.mode, code: parsed.code }
    }
  } catch {
    // ignore malformed links
  }
  return null
}

// ---- internals ----

function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage unavailable (private mode) — ignore
  }
}
