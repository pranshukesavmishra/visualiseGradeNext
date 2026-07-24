// Runs real Python in the browser using Pyodide (CPython compiled to
// WebAssembly). This is what powers the "Real Python" mode, so learners can
// run genuine data-science / ML code (numpy, pandas, scikit-learn, matplotlib).
//
// Note: Pyodide downloads its runtime from a CDN the first time it is used, so
// this mode needs an internet connection and does NOT work inside a sandboxed
// preview that blocks outside requests. Failures are reported clearly.

export interface PyRunResult {
  stdout: string
  images: string[] // base64-encoded PNGs from matplotlib figures
  error: string | null
}

// Pyodide is exposed on the global scope by its loader script.
type Pyodide = {
  runPythonAsync: (code: string) => Promise<unknown>
  loadPackagesFromImports: (code: string) => Promise<unknown>
  setStdout: (opts: { batched: (s: string) => void }) => void
  setStderr: (opts: { batched: (s: string) => void }) => void
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

// After the user's code runs, grab any matplotlib figures as PNG images.
const FIGURE_CAPTURE = `
import base64 as _b64, io as _io, json as _json
_imgs = []
try:
    import matplotlib.pyplot as _plt
    for _n in _plt.get_fignums():
        _fig = _plt.figure(_n)
        _buf = _io.BytesIO()
        _fig.savefig(_buf, format='png', bbox_inches='tight', dpi=110)
        _imgs.append(_b64.b64encode(_buf.getvalue()).decode())
    _plt.close('all')
except Exception:
    pass
_json.dumps(_imgs)
`

export async function runPython(code: string, onStatus?: (msg: string) => void): Promise<PyRunResult> {
  const out: string[] = []
  try {
    const pyodide = await getPyodide(onStatus)

    // Pyodide's batched stdout callback delivers one line at a time WITHOUT
    // its trailing newline, so we collect the lines and rejoin them below.
    pyodide.setStdout({ batched: (s) => out.push(s) })
    pyodide.setStderr({ batched: (s) => out.push(s) })

    // Use a non-interactive matplotlib backend so figures render to images,
    // and hide noisy library warnings so the output stays clean for learners.
    await pyodide.runPythonAsync(
      "import os, warnings\n" +
        "os.environ.setdefault('MPLBACKEND', 'AGG')\n" +
        "warnings.filterwarnings('ignore')",
    )

    onStatus?.('Installing libraries…')
    await pyodide.loadPackagesFromImports(code)

    onStatus?.('Running your code…')
    await pyodide.runPythonAsync(code)

    let images: string[] = []
    try {
      const json = (await pyodide.runPythonAsync(FIGURE_CAPTURE)) as string
      images = JSON.parse(json)
    } catch {
      // no plots, or matplotlib not used
    }

    return { stdout: out.join('\n'), images, error: null }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { stdout: out.join('\n'), images: [], error: cleanTraceback(message) }
  }
}

// Pyodide prepends its own internal frames to tracebacks; trim to the part a
// learner actually cares about.
function cleanTraceback(message: string): string {
  const marker = 'File "<exec>"'
  const idx = message.indexOf(marker)
  if (idx > 0) {
    const head = 'Traceback (most recent call last):\n'
    return head + message.slice(idx)
  }
  return message
}
