// The browser half of the themed exports: ask POST /api/ai?export=document for one row in one theme (the server half is
// api/_lib/exportThemeRoute.js) and hand the answer back. Nothing here can build a theme; the engine is server-only.
//
// requestThemeExport never throws. It resolves one of:
//   { status: 'ok', zip: Blob, name }     a zip row, with the file name the server chose
//   { status: 'ok', html }                a print row: a script-free document for the print window
//   { status: 'error', code, line }       a refusal; `line` is fixed copy (ERROR_LINES), never the server's words
//                                         code: signed-out | unknown | invalid-project | pro-required | too-large | rate-limited
//                                         | low-contrast | font-missing | build-failed | network
//                                         a rate-limited refusal also carries `retryAfter`: the whole seconds (1..600) the server
//                                         asked us to wait, when it said so; the dialog counts them down on its button
// `loadAuth` and `fetchImpl` are injected so a test runs this without Firebase or a network.

import { EXPORT_DOCUMENT_URL, documentDesign } from './exportDocument.js'

export const ERROR_LINES = Object.freeze({
  'signed-out': 'You’re signed out. Sign in again, then export.',
  unknown: 'That theme or file isn’t available. Pick another and try again.',
  'invalid-project': 'This project can’t be exported yet. Check its colours and fonts, then try again.',
  'pro-required': 'We couldn’t find a Pro plan on this account, so this file wasn’t made.',
  'too-large': 'This design is too large to export. Try a smaller logo.',
  'rate-limited': 'Too many exports just now. Try again in a minute.',
  // 422s: trying again gives the same answer, so these lines say what to change instead.
  'low-contrast': 'Some text in this theme would be too hard to read in these colours. Change a colour or pick another theme.',
  'font-missing': 'This theme couldn’t load one of the project’s fonts. Pick another font or theme.',
  'build-failed': 'That file didn’t build. Try again.',
  network: 'The file couldn’t be made. Check your connection and try again.',
})

const CODE_STATUS = Object.freeze({
  unknown_theme: 'unknown', unknown_row: 'unknown', unknown_format: 'unknown', invalid_project: 'invalid-project',
  pro_required: 'pro-required', design_too_large: 'too-large', rate_limited: 'rate-limited', build_failed: 'build-failed',
  auth_required: 'signed-out', contrast: 'low-contrast', font_missing: 'font-missing',
})

// Retry-After in whole seconds only: digits and nothing else (not 1e1, 0x10, a sign, a fraction or an HTTP date), else NaN.
const retryAfterSeconds = (header) => (/^\d+$/.test(String(header ?? '')) ? Number(header) : NaN)

const fail = (code, retryAfter) => {
  let line = ERROR_LINES[code]
  // A valid wait (whole seconds, 1..600) rides on the result and is counted down on the dialog's button, so the line does not repeat it.
  // Without one the fixed line says "in a minute".
  const wait = code === 'rate-limited' && Number.isInteger(retryAfter) && retryAfter > 0 && retryAfter <= 600 ? retryAfter : 0
  if (wait) line = 'Too many exports just now.'
  return wait ? { status: 'error', code, line, retryAfter: wait } : { status: 'error', code, line }
}

// The file name from Content-Disposition, only when it is a plain name of the kind the route writes.
export function zipNameFrom(header) {
  const m = /filename="([a-z0-9][a-z0-9-]{0,120}\.zip)"/.exec(String(header || ''))
  return m ? m[1] : ''
}

export async function requestThemeExport({ theme, row, format, design, projectName }, { loadAuth, fetchImpl } = {}) {
  try {
    const sdk = await loadAuth?.()
    const user = sdk?.auth?.currentUser
    const token = user ? await user.getIdToken() : null
    if (!token) return fail('signed-out')
    const doFetch = fetchImpl || globalThis.fetch
    const payload = JSON.stringify({ theme, row, format, projectName, design: documentDesign(design) })
    const ask = (idToken) => doFetch(EXPORT_DOCUMENT_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }, body: payload,
    })
    let res = await ask(token)
    if (res.status === 401) {
      const fresh = await user.getIdToken(true)
      if (!fresh) return fail('signed-out')
      res = await ask(fresh)
      if (res.status === 401) return fail('signed-out')
    }
    if (res.status === 413) return fail('too-large')
    if (res.status === 429) return fail('rate-limited', retryAfterSeconds(res.headers?.get?.('Retry-After')))
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const code = CODE_STATUS[body?.code]
      if (code) return fail(code)
      return fail(res.status === 403 ? 'pro-required' : res.status === 400 ? 'unknown' : 'build-failed')
    }
    const type = String(res.headers?.get?.('Content-Type') || '')
    if (type.startsWith('application/zip')) {
      const name = zipNameFrom(res.headers.get('Content-Disposition'))
      const blob = await res.blob()
      return name && blob.size ? { status: 'ok', zip: blob, name } : fail('build-failed')
    }
    const body = await res.json().catch(() => null)
    // A 200 must be for this request and carry a document; the document must be the script-free one the server writes.
    if (body?.ok === true && body.theme === theme && body.row === row && body.format === format && isPrintSafe(body.html)) {
      return { status: 'ok', html: body.html }
    }
    return fail('build-failed')
  } catch {
    return fail('network')
  }
}

// What a print document must look like before it is written into a window: the CSP meta first in the head, no script element, no
// form element, no inline handler. The server guarantees this; the check keeps a stray or tampered 200 from ever reaching a window.
export function isPrintSafe(html) {
  if (typeof html !== 'string' || !html) return false
  const head = html.indexOf('<head>')
  if (head < 0 || head > 200) return false
  if (!html.startsWith('<meta http-equiv="Content-Security-Policy"', head + '<head>'.length)) return false
  return !/<script[\s>/]/i.test(html) && !/<form[\s>/]/i.test(html) && !/\son[a-z]+\s*=/i.test(html)
}

// ── The print window ───────────────────────────────────────────────────────
// The window is reserved inside the click (exportDocument.js reservePrintWindow). It gets a small shell page of our own, script-free,
// holding one full-viewport iframe whose srcdoc is the print document. The iframe is sandboxed with allow-same-origin (so this page
// can reach it to wait for its fonts and print it) and allow-modals (so print() may open the dialog), and never allow-scripts: the
// document cannot run script even if its CSP were stripped, and it cannot reach the opener. Nothing is loaded from a URL, so there is
// no same-origin blob to execute. print() is called from this page, on the iframe's window, after its fonts have loaded.

export const PRINT_FRAME_SANDBOX = 'allow-same-origin allow-modals'
const PRINT_SHELL = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title></title>'
  + '<style>html,body{margin:0;padding:0;overflow:hidden;background:#fff}iframe{display:block;margin:0;padding:0;border:0;width:100vw;height:100vh;background:#fff}</style>'
  + '</head><body></body></html>'

/** Writes a print document into a sandboxed iframe in a reserved window and prints it. Returns false when there is no usable window. */
export function printInWindow(win, html, { title = '' } = {}) {
  try {
    if (!win || win.closed || !isPrintSafe(html)) return false
    const doc = win.document
    doc.open()
    doc.write(PRINT_SHELL)
    doc.close()
    // The outer document's title is the one the print dialog offers as the file name.
    if (title && /^[a-z0-9-]+$/.test(title)) doc.title = title
    const frame = doc.createElement('iframe')
    frame.setAttribute('sandbox', PRINT_FRAME_SANDBOX)
    frame.setAttribute('title', 'Print preview')
    let printed = false
    frame.addEventListener('load', () => {
      const inner = frame.contentWindow
      const go = () => {
        if (printed) return
        printed = true
        try { inner.focus(); inner.print() } catch { /* the window was closed */ }
      }
      const ready = inner?.document?.fonts?.ready
      if (ready && typeof ready.then === 'function') ready.then(() => setTimeout(go, 200), () => setTimeout(go, 200))
      else setTimeout(go, 400)
    })
    frame.srcdoc = html
    doc.body.appendChild(frame)
    return true
  } catch {
    return false
  }
}
