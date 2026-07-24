// Runs real Python in the browser using Pyodide (CPython compiled to
// WebAssembly), AND traces it line-by-line so the UI can replay execution as
// an animated visualisation (highlighting the running line, showing variables
// as boxes, and lists as animated bars) — not just print text.
//
// Note: Pyodide downloads its runtime from a CDN the first time it is used, so
// this mode needs an internet connection and does NOT work inside a sandboxed
// preview that blocks outside requests. Failures are reported clearly.

import { Frame, Value } from '../lang/types'
import { buildFrames, RawFrame } from './buildFrames'

export interface PyRunResult {
  frames: Frame[] // step-by-step trace, for the animated visualiser
  output: string // full console output
  images: string[] // base64-encoded PNGs from matplotlib figures
  error: string | null
  truncated: boolean // true if the trace hit the step cap
}

// Pyodide is exposed on the global scope by its loader script.
type Pyodide = {
  runPythonAsync: (code: string) => Promise<unknown>
  loadPackagesFromImports: (code: string) => Promise<unknown>
  setStdout: (opts: { batched: (s: string) => void }) => void
  setStderr: (opts: { batched: (s: string) => void }) => void
  globals: { set: (name: string, value: unknown) => void }
}

const PYODIDE_VERSION = 'v0.26.2'
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`

const FRIENDLY_LOAD_ERROR =
  "Couldn't start Python. The Real Python mode needs an internet connection to download " +
  'Python the first time, and it cannot run inside the sandboxed preview. Run the app with ' +
  '`npm run dev` (or deploy it) to use this mode.'

let pyodidePromise: Promise<Pyodide> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-pyodide]`)
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.dataset.pyodide = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(FRIENDLY_LOAD_ERROR))
    document.head.appendChild(script)
  })
}

// Loads (and caches) the Pyodide runtime. Safe to call repeatedly.
export function getPyodide(onStatus?: (msg: string) => void): Promise<Pyodide> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      onStatus?.('Downloading Python… (first time only)')
      const g = globalThis as unknown as {
        loadPyodide?: (opts: { indexURL: string }) => Promise<Pyodide>
      }
      if (!g.loadPyodide) {
        await loadScript(PYODIDE_BASE + 'pyodide.js')
      }
      if (!g.loadPyodide) throw new Error(FRIENDLY_LOAD_ERROR)
      onStatus?.('Starting Python…')
      return g.loadPyodide({ indexURL: PYODIDE_BASE })
    })().catch((e) => {
      pyodidePromise = null // allow a later retry
      throw e
    })
  }
  return pyodidePromise
}

// Python-side setup: a non-interactive matplotlib backend, quiet warnings, and
// a line-by-line tracer that records a snapshot of the local variables (and the
// console output so far) after every line of the user's own code.
const PY_SETUP = `
import os, sys, io, json, math, types, contextlib, traceback
os.environ.setdefault('MPLBACKEND', 'AGG')
import warnings
warnings.filterwarnings('ignore')

_GN_FILE = '<your_code>'

def _gn_snap(v):
    try:
        if isinstance(v, bool):
            return v
        if isinstance(v, int):
            return v
        if isinstance(v, float):
            return v if math.isfinite(v) else repr(v)
        if isinstance(v, str):
            return v if len(v) <= 120 else v[:120] + '\\u2026'
        if isinstance(v, (list, tuple)):
            out = []
            for x in list(v)[:60]:
                if isinstance(x, bool):
                    out.append(x)
                elif isinstance(x, int):
                    out.append(x)
                elif isinstance(x, float):
                    out.append(x if math.isfinite(x) else repr(x))
                elif isinstance(x, str):
                    out.append(x if len(x) <= 40 else x[:40] + '\\u2026')
                else:
                    out.append(repr(x)[:40])
            return out
        return (type(v).__name__ + ': ' + repr(v))[:120]
    except Exception:
        return '<unshowable>'

def _gn_capture(frame):
    d = {}
    for k, val in list(frame.f_locals.items()):
        if k.startswith('_'):
            continue
        if callable(val):
            continue
        if isinstance(val, types.ModuleType):
            continue
        d[k] = _gn_snap(val)
    return d

def _gn_run(_src):
    _frames = []
    _MAX = 1500
    _truncated = [False]
    _buf = io.StringIO()

    def _tracer(frame, event, arg):
        if frame.f_code.co_filename != _GN_FILE:
            return None
        if event == 'line':
            if len(_frames) < _MAX:
                _frames.append({
                    'line': frame.f_lineno,
                    'vars': _gn_capture(frame),
                    'olen': _buf.getvalue().count('\\n'),
                })
            else:
                _truncated[0] = True
                return None
        return _tracer

    try:
        _code = compile(_src, _GN_FILE, 'exec')
    except SyntaxError:
        return json.dumps({'frames': [], 'output': '', 'error': traceback.format_exc(), 'truncated': False})

    _err = None
    _g = {'__name__': '__main__'}
    with contextlib.redirect_stdout(_buf):
        sys.settrace(_tracer)
        try:
            exec(_code, _g)
        except Exception:
            _err = traceback.format_exc()
        finally:
            sys.settrace(None)

    return json.dumps({
        'frames': _frames,
        'output': _buf.getvalue(),
        'error': _err,
        'truncated': _truncated[0],
    })
`

// After the user's code runs, grab any matplotlib figures as PNG images.
const FIGURE_CAPTURE = `
import base64 as _b64, io as _io, json as _json
_imgs = []
try:
    import matplotlib.pyplot as _plt
    for _n in _plt.get_fignums():
        _fig = _plt.figure(_n)
        _buf2 = _io.BytesIO()
        _fig.savefig(_buf2, format='png', bbox_inches='tight', dpi=110)
        _imgs.append(_b64.b64encode(_buf2.getvalue()).decode())
    _plt.close('all')
except Exception:
    pass
_json.dumps(_imgs)
`

interface RawResult {
  frames: RawFrame[]
  output: string
  error: string | null
  truncated: boolean
}

export async function runPython(code: string, onStatus?: (msg: string) => void): Promise<PyRunResult> {
  try {
    const pyodide = await getPyodide(onStatus)

    onStatus?.('Getting things ready…')
    await pyodide.runPythonAsync(PY_SETUP)

    onStatus?.('Installing libraries…')
    await pyodide.loadPackagesFromImports(code)

    onStatus?.('Running & recording every step…')
    pyodide.globals.set('_gn_src', code)
    const raw = (await pyodide.runPythonAsync('_gn_run(_gn_src)')) as string
    const parsed = JSON.parse(raw) as RawResult

    let images: string[] = []
    try {
      const json = (await pyodide.runPythonAsync(FIGURE_CAPTURE)) as string
      images = JSON.parse(json)
    } catch {
      // no plots, or matplotlib not used
    }

    return {
      frames: buildFrames(parsed.frames, parsed.output, code),
      output: parsed.output,
      images,
      error: parsed.error ? cleanTraceback(parsed.error) : null,
      truncated: parsed.truncated,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { frames: [], output: '', images: [], error: cleanTraceback(message), truncated: false }
  }
}

// Trim Pyodide's internal frames from tracebacks; keep the part about the
// learner's own code.
function cleanTraceback(message: string): string {
  const marker = 'File "<your_code>"'
  const idx = message.indexOf(marker)
  if (idx > 0) {
    return 'Traceback (most recent call last):\n' + message.slice(idx)
  }
  return message
}

export type { Value }
