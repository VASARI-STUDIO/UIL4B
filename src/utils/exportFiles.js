// The browser half of the two Pro files the server makes: the app bundle (a zip) and the
// book's pages (draw operations that src/utils/bookPainter.js paints). The server half is
// api/_lib/exportDocument.js (POST /api/ai?export=document, formats `app-bundle` and
// `book-png`), the only place either is built; nothing here can make one, so a forged
// `isPro` in the panel buys nothing but a 403.
//
// Never throws. requestExportFile resolves one of:
//   { status: 'ok', zip }      app-bundle: the zip as a base64 string
//   { status: 'ok', book }     book-png: { pages, fonts, paper, contents, page, scale }
//   { status: 'signed-out' }   no account, or the server refused the session twice in a row
//   { status: 'pro-required' } signed in, but not Pro (403)
//   { status: 'too-large' }    the design is over the server's size limit (413)
//   { status: 'too-many-colours' }  a palette or gradient over the colour limit
//   { status: 'error' }        anything else (network, 5xx, a body of the wrong shape, a
//                              400 for the extra fields): "no file", never a reason to
//                              send a paying user to /plans.
//
// The status handling is the same as requestExportDocument (utils/exportDocument.js, which
// expects an HTML body); `loadAuth` and `fetchImpl` are injected for tests in the same way.

import { EXPORT_DOCUMENT_URL, documentDesign } from './exportDocument.js'

/** The design as the files need it: the document fields, and for the app bundle the tint and state settings. */
export function fileDesign(design, format) {
  const base = documentDesign(design)
  if (format !== 'app-bundle') return base
  const d = design && typeof design === 'object' ? design : {}
  return { ...base, tints: d.tints, states: d.states }
}

// A 200 must say it is for this format and carry the right thing, so a stray cached or
// proxied 200 for something else cannot be saved as the file.
function readFile(format, body) {
  if (body?.ok !== true || body.format !== format) return null
  if (format === 'app-bundle') return typeof body.zip === 'string' && body.zip ? { zip: body.zip } : null
  if (format === 'book-png') {
    const { pages, fonts, paper, contents, page, scale } = body
    const book = { pages, fonts, paper, contents, page, scale }
    return Array.isArray(book.pages) && book.pages.length ? { book } : null
  }
  return null
}

/**
 * `extra` carries the format's own fields: for `app-bundle` { date, name }, for `book-png`
 * { metrics, missingFonts, date, watermark }. The server checks them.
 */
export async function requestExportFile({ format, design, projectName, extra = {} }, { loadAuth, fetchImpl } = {}) {
  try {
    const sdk = await loadAuth?.()
    const user = sdk?.auth?.currentUser
    const token = user ? await user.getIdToken() : null
    if (!token) return { status: 'signed-out' }

    const doFetch = fetchImpl || globalThis.fetch
    const payload = JSON.stringify({ ...extra, format, projectName, design: fileDesign(design, format) })
    const ask = (idToken) => doFetch(EXPORT_DOCUMENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: payload,
    })
    let response = await ask(token)
    if (response.status === 401) {
      // A cached token can be a minute past its expiry while the account is good: one retry on a fresh one.
      const fresh = await user.getIdToken(true)
      if (!fresh) return { status: 'signed-out' }
      response = await ask(fresh)
      if (response.status === 401) return { status: 'signed-out' }
    }
    if (response.status === 403) return { status: 'pro-required' }
    if (response.status === 413) return { status: 'too-large' }
    if (response.status === 400) {
      const refusal = await response.json().catch(() => null)
      return { status: refusal?.code === 'too_many_colours' ? 'too-many-colours' : 'error' }
    }
    if (!response.ok) return { status: 'error' }
    const found = readFile(format, await response.json().catch(() => null))
    return found ? { status: 'ok', ...found } : { status: 'error' }
  } catch {
    return { status: 'error' }
  }
}

/** A base64 zip as a Blob the browser can save. */
export function zipBlob(base64) {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: 'application/zip' })
}

/**
 * The words for an answer that is not `ok`, in the panel's voice (the same lines the book and
 * guidelines use); null for an ok answer. `noun` is what was being made, for example `book`.
 */
export function fileRefusal(answer, noun) {
  switch (answer?.status) {
    case 'ok': return null
    case 'pro-required': return `We couldn’t find a Pro plan on this account, so the ${noun} wasn’t made.`
    case 'signed-out': return `You’re signed out. Sign in again, then export the ${noun}.`
    case 'too-large': return 'This design is too large to export. Try a smaller logo.'
    case 'too-many-colours': return 'This palette has more colours than the document can hold (200 max).'
    default: return `The ${noun} couldn’t be made. Check your connection and try again.`
  }
}
