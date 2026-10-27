// The browser half of the Pro documents: ask the server for the design system
// book or the brand guidelines. The server half is api/_lib/exportDocument.js
// (POST /api/ai?export=document), and it is the only place either document is
// built. Nothing in the browser can make one: the generators are not in the
// bundle, so a forged `isPro` in the panel buys nothing but a 403.
//
// Never throws. requestExportDocument resolves one of:
//   { status: 'ok', html }     the server built it
//   { status: 'signed-out' }   no account, or the server refused the session twice
//                              in a row (401, then 401 again on a fresh token)
//   { status: 'pro-required' } signed in, but not Pro (403)
//   { status: 'too-large' }    the design is over the server's size limit (413)
//   { status: 'too-many-colours' }  a palette or gradient over the colour limit
//                              (400 with code too_many_colours)
//   { status: 'error' }        anything else: network failure, 5xx (an auth outage
//                              included), a bad body. The caller treats this as
//                              "no file", never as a reason to send a paying user
//                              to /plans.
//
// `loadAuth` and `fetchImpl` are injected so a test can run this without Firebase
// or a network; the panel passes loadAuthSdk and uses the real fetch.

import { readIdentity } from './kitIdentity.js'

export const EXPORT_DOCUMENT_URL = '/api/ai?export=document'

// What the browser sends: only the fields the documents are drawn from, and only
// the ones that exist. The server picks the same fields again; this just keeps a
// project's other state out of the request. Of the identity only the description
// goes (the brand guidelines print it on the cover); the name is the projectName.
export function documentDesign(design) {
  const d = design && typeof design === 'object' ? design : {}
  const { description } = readIdentity(d)
  return {
    palette: d.palette, gradient: d.gradient, fonts: d.fonts, typeScale: d.typeScale, logo: d.logo,
    identity: description ? { description } : undefined,
  }
}

// `template` is the id the user picked for this format; the server checks it and
// answers with the id it used.
export async function requestExportDocument({ format, design, projectName, template }, { loadAuth, fetchImpl } = {}) {
  try {
    const sdk = await loadAuth?.()
    const user = sdk?.auth?.currentUser
    const token = user ? await user.getIdToken() : null
    if (!token) return { status: 'signed-out' }

    const doFetch = fetchImpl || globalThis.fetch
    const payload = JSON.stringify({ format, projectName, template, design: documentDesign(design) })
    const ask = (idToken) => doFetch(EXPORT_DOCUMENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: payload,
    })
    let response = await ask(token)
    if (response.status === 401) {
      // A cached token can be a minute past its expiry while the account is
      // perfectly good. Ask Firebase for a fresh one and try once more; only a
      // second refusal means the session is really gone.
      const fresh = await user.getIdToken(true)
      if (!fresh) return { status: 'signed-out' }
      response = await ask(fresh)
      if (response.status === 401) return { status: 'signed-out' }
    }
    if (response.status === 403) return { status: 'pro-required' }
    // Two refusals that retrying cannot fix, so the panel names them rather than
    // asking for a connection check. Any 413 counts, the platform's own as well
    // as the function's design_too_large.
    if (response.status === 413) return { status: 'too-large' }
    if (response.status === 400) {
      const refusal = await response.json().catch(() => null)
      return { status: refusal?.code === 'too_many_colours' ? 'too-many-colours' : 'error' }
    }
    if (!response.ok) return { status: 'error' }
    const body = await response.json().catch(() => null)
    // A 200 must also say it is for this format and carry a document, so a stray
    // cached or proxied 200 for something else cannot be printed as the book.
    if (body?.ok === true && body.format === format && typeof body.html === 'string' && body.html) {
      return { status: 'ok', html: body.html, ...(typeof body.template === 'string' ? { template: body.template } : {}) }
    }
    return { status: 'error' }
  } catch {
    return { status: 'error' }
  }
}

// ── The print window ────────────────────────────────────────────────────────
// Safari only lets window.open through when it runs inside the click that asked
// for it. The server round trip is a network wait, so a window opened after it is
// blocked and a paying user's book downloads as a file instead of printing. The
// panel therefore reserves a blank window first (reservePrintWindow, before any
// await), then points it at the finished document (showInPrintWindow) or closes it
// if nothing is going to be shown (releasePrintWindow).
//
// `open` is injectable so a test can run these without a browser.
const browserOpen = () => (typeof window !== 'undefined' && window.open ? window.open.bind(window) : null)

/** A blank window opened now, or null when the browser refused it. */
export function reservePrintWindow(open = browserOpen()) {
  try { return open ? open('', '_blank') || null : null } catch { return null }
}

/**
 * One line in a reserved window while the server builds, so the tab reads as
 * progress and not a glitch. Replaced when the document is shown. Safe on null, a
 * closed window, or one the browser will not let us write to.
 */
export function labelPrintWindow(handle, text) {
  try {
    if (!handle || handle.closed) return
    const doc = handle.document
    doc.title = text
    const style = doc.createElement('style')
    style.textContent = 'body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.5 system-ui,sans-serif;background:#f6f6f4;color:#2a2a28}'
      + '@media(prefers-color-scheme:dark){body{background:#1b1b1a;color:#e8e8e6}}'
    doc.head.appendChild(style)
    doc.body.textContent = text
  } catch { /* cross-origin or already gone: the tab simply stays blank */ }
}

/** Close a window reserved above that will not be used. Safe on null or a closed window. */
export function releasePrintWindow(handle) {
  try { if (handle && !handle.closed) handle.close() } catch { /* already gone */ }
}

/**
 * Point the reserved window at `url`. A window the visitor has closed meanwhile,
 * or none at all, falls back to a fresh window.open (which still works for a
 * Chromium click a few seconds old). Returns the window shown in, or null when the
 * browser blocked both, and the caller downloads the file instead.
 */
export function showInPrintWindow(handle, url, open = browserOpen()) {
  if (handle && !handle.closed) {
    try {
      handle.location.href = url
      return handle
    } catch { /* fall through to a fresh window */ }
  }
  try { return open ? open(url, '_blank') || null : null } catch { return null }
}

/**
 * The document with the print bootstrap added. Appended HERE, to the copy that
 * goes to the window, never to what the server returns or what is downloaded: the
 * saved file keeps its no-script guarantee.
 */
export function withPrintBootstrap(html) {
  return html.replace(
    '</body>',
    '<script>(function(){function go(){try{window.focus();window.print()}catch(e){}}'
    + 'if(document.fonts&&document.fonts.ready){document.fonts.ready.then(function(){setTimeout(go,200)})}'
    // The closing tag is split rather than escaped: a literal </scr+ipt> in a
    // bundled string can terminate an inline script tag early if this bundle is
    // ever inlined, and `<\/` is a useless escape the linter rejects.
    + `else{window.addEventListener("load",function(){setTimeout(go,400)})}})()<${'/'}script></body>`,
  )
}
