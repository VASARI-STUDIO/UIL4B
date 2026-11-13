// The browser half of the themed exports: ask POST /api/ai?export=document for one row in one theme (the server half is
// api/_lib/exportThemeRoute.js) and hand the answer back. Nothing here can build a theme; the engine is server-only.
//
// requestThemeExport never throws. It resolves one of:
//   { status: 'ok', zip: Blob, name }     a zip row, with the file name the server chose
//   { status: 'ok', html }                a print row: a script-free document for the print window
//   { status: 'error', code, line }       a refusal; `line` is fixed copy (ERROR_LINES), never the server's words
//                                         code: signed-out | unknown | invalid-project | pro-required | too-large | rate-limited
//                                         | build-failed | network
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
  'build-failed': 'That file didn’t build. Try again.',
  network: 'The file couldn’t be made. Check your connection and try again.',
})

const CODE_STATUS = Object.freeze({
  unknown_theme: 'unknown', unknown_row: 'unknown', unknown_format: 'unknown', invalid_project: 'invalid-project',
  pro_required: 'pro-required', design_too_large: 'too-large', rate_limited: 'rate-limited', build_failed: 'build-failed',
  auth_required: 'signed-out',
})

// Retry-After in whole seconds only: digits and nothing else (not 1e1, 0x10, a sign, a fraction or an HTTP date), else NaN.
const retryAfterSeconds = (header) => (/^\d+$/.test(String(header ?? '')) ? Number(header) : NaN)

const fail = (code, retryAfter) => {
  let line = ERROR_LINES[code]
  // The one number a fixed line may carry: how long the server asked us to wait, when it said so in whole seconds.
  const wait = code === 'rate-limited' && Number.isInteger(retryAfter) && retryAfter > 0 && retryAfter <= 600 ? retryAfter : 0
  if (wait) line = wait < 90 ? `Too many exports just now. Try again in ${wait} ${wait === 1 ? 'second' : 'seconds'}.` : line
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
// inline handler. The server guarantees this; the check keeps a stray or tampered 200 from ever reaching a window.
export function isPrintSafe(html) {
  if (typeof html !== 'string' || !html) return false
  const head = html.indexOf('<head>')
  if (head < 0 || head > 200) return false
  if (!html.startsWith('<meta http-equiv="Content-Security-Policy"', head + '<head>'.length)) return false
  return !/<script[\s>]/i.test(html) && !/\son[a-z]+\s*=/i.test(html)
}

// ── The print window ───────────────────────────────────────────────────────
// The window is reserved inside the click (exportDocument.js reservePrintWindow) and written here with the document. The
// document runs no script (its CSP allows none), and nothing is loaded from a URL, so there is no same-origin blob to execute.
// print() is called from this page, after the fonts have loaded.

/** Writes a print document into a reserved window and prints it. Returns false when there is no usable window. */
export function printInWindow(win, html, { title = '' } = {}) {
  try {
    if (!win || win.closed || !isPrintSafe(html)) return false
    const doc = win.document
    doc.open()
    doc.write(html)
    doc.close()
    if (title && /^[a-z0-9-]+$/.test(title)) doc.title = title
    const go = () => { try { win.focus(); win.print() } catch { /* the window was closed */ } }
    const ready = doc.fonts?.ready
    if (ready && typeof ready.then === 'function') ready.then(() => setTimeout(go, 200), () => setTimeout(go, 200))
    else setTimeout(go, 400)
    return true
  } catch {
    return false
  }
}
