// GET /api/ai?export=preview&theme=<id>&row=<slides|ui-kit|book>&n=<page>&dpr=2
//
// The clean, full-density picture of one page of a Pro export theme, for a Pro account only. The public 1x pictures of Pro pairs are
// watermarked and live under public/export-themes/pages; the clean 2x lives under api/_lib/pro/export-previews (fetched at build time from the private data repository and never committed), which the client
// bundle never imports and which is not copied into dist (see tests/unit/export-previews.test.js). This is the one way to it.
//
//   200  image/webp, the clean 2x               a Pro account, a Pro pair
//   400  { error: 'bad_request' }               a theme, row, page or dpr the manifest does not hold
//   403  { error: 'pro_required' }              signed out, a bad token, or a Free plan
//   404  { error: 'public_preview' }            a Free pair: its pictures are public, there is no server copy to send
//   404  { error: 'not_found' }                 the manifest lists it but the file is missing
//   500/503 { error: 'auth_unavailable' }       the service credential or the revocation lookup failed, not a verdict on the caller
//
// The bearer header is the check: no signed URL, so a copied link is useless without the token. Every answer carries
// Cache-Control: private, no-store and Vary: Authorization, so a shared cache cannot hand a Pro response to a Free account.
// Order: validate the request (no account read for a made-up id), then the session, then the plan, then assertThemeAccess.

import fs from 'node:fs'
import { assertThemeAccess } from './themeAccess.js'
import { isTokenRefusal, planOf } from './exportDocument.js'
import { THEME_ROW_FORMATS, isThemeExportPro } from '../../src/data/exportThemes.js'
import { previewPages } from '../../src/config/exportPreviews.js'

const MAX_N = /^[1-9]\d{0,3}$/

// The one value of a query field that is a plain string (an array or a missing field is not one).
const one = (v) => (typeof v === 'string' ? v : undefined)

/** The manifest's page for a request, or null: every part is looked up in the manifest (via the dialog's own previewPages), never built from the request. */
function pageOf(theme, row, n) {
  if (!Object.hasOwn(THEME_ROW_FORMATS, row)) return null
  return previewPages(theme, row).find((p) => String(p.n) === n) || null
}

const fileFor = (theme, row, n) => new URL(`./pro/export-previews/${theme}/${row}/${n}.webp`, import.meta.url)

/**
 * @param req   needs query { theme, row, n, dpr? } and headers.authorization
 * @param res   a Vercel/Express-style response
 * @param deps  { verifyIdToken(token, checkRevoked), readUser(uid), credentialProblem?(), read? (tests: a file reader) }
 */
export async function serveExportPreview(req, res, { verifyIdToken, readUser, credentialProblem, read = (url) => fs.promises.readFile(url) }) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Vary', 'Authorization')

  const theme = one(req.query?.theme)
  const row = one(req.query?.row)
  const n = one(req.query?.n)
  const dpr = req.query?.dpr === undefined ? '2' : one(req.query.dpr)
  if (!theme || !row || !n || !MAX_N.test(n) || dpr !== '2') return res.status(400).json({ error: 'bad_request' })
  const page = pageOf(theme, row, n)
  if (!page) return res.status(400).json({ error: 'bad_request' })

  const header = req.headers?.authorization
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return res.status(403).json({ error: 'pro_required' })

  let decoded
  try {
    decoded = await verifyIdToken(header.slice(7), true)
  } catch (err) {
    if (isTokenRefusal(err)) return res.status(403).json({ error: 'pro_required' })
    let credential
    try { credential = credentialProblem?.() } catch { credential = 'unreadable' }
    return res.status(credential ? 500 : 503).json({ error: 'auth_unavailable' })
  }

  let plan
  try { plan = await planOf(decoded, readUser) } catch { return res.status(500).json({ error: 'auth_unavailable' }) }

  // The Free pairs' pictures are public files; nothing here is theirs to send (and a Free account is not refused for asking).
  if (!isThemeExportPro(row, theme)) return res.status(404).json({ error: 'public_preview' })

  const access = assertThemeAccess(plan, { theme, row, format: THEME_ROW_FORMATS[row][0] })
  if (!access.ok) return res.status(access.status === 403 ? 403 : 400).json({ error: access.status === 403 ? 'pro_required' : 'bad_request' })

  let bytes
  try { bytes = await read(fileFor(theme, row, n)) } catch { return res.status(404).json({ error: 'not_found' }) }
  res.setHeader('Content-Type', 'image/webp')
  res.setHeader('Content-Length', String(bytes.length))
  res.setHeader('X-Content-Type-Options', 'nosniff')
  return res.status(200).send(bytes)
}
