// GET /api/ai?proAsset=<poster|anim|page>&id=<prompt id> — the output preview of
// a Pro community prompt, by entitlement.
//
// The locked prompts' previews (a poster still, a looping animation and the
// built page) are fetched at build time from the private data repository by
// scripts/fetch-pro-data.mjs and written as modules under api/_lib/pro/assets/,
// one per kind, mapping id -> base64 (images) or text (the page). They are not
// served from public/: a Pro account's browser asks here with its ID token and
// shows the answer as a blob URL (src/utils/proAsset.js).
//
// Contract:
//   no/invalid token          401      signed in, not Pro       403
//   unknown kind or bad id    400      id with no preview        404
//   no preview data deployed  503
//   Pro                       200, the bytes, with Content-Type and Content-Length
//   always                    Cache-Control: private, no-store; Vary: Authorization
// The page answer also carries a sandbox CSP: it is shown in a sandboxed iframe
// by the client, and must not run with this origin's privileges if opened directly.

import { requireProUser } from './serve.js'

// Each import names its file literally so Vercel's file tracer bundles the
// module when it exists at build time.
const MODULES = {
  poster: () => import('../pro/assets/poster.js'),
  anim: () => import('../pro/assets/anim.js'),
  page: () => import('../pro/assets/page.js'),
}

const TYPES = {
  poster: 'image/webp',
  anim: 'image/webp',
  page: 'text/html; charset=utf-8',
}

export const PRO_ASSET_KINDS = Object.freeze(Object.keys(MODULES))
const ID = /^c-\d{1,4}$/

const isMissingModule = (err) => err?.code === 'ERR_MODULE_NOT_FOUND' || err?.code === 'MODULE_NOT_FOUND'

async function defaultLoad(kind) {
  try {
    return (await MODULES[kind]()).default
  } catch (err) {
    if (isMissingModule(err)) return null
    throw err
  }
}

/**
 * @param req   needs headers.authorization, query.proAsset and query.id
 * @param res   a Vercel/Express-style response (setHeader, status, json, end)
 * @param deps  { verifyIdToken, readUser, loadPreviews?(kind) -> { [id]: string } | null }
 */
export async function serveProAsset(req, res, deps) {
  if (!(await requireProUser(req, res, deps))) return

  const kind = req.query?.proAsset
  const id = req.query?.id
  if (!Object.hasOwn(MODULES, kind)) {
    return res.status(400).json({ error: `Unknown preview kind — expected one of: ${PRO_ASSET_KINDS.join(', ')}` })
  }
  if (typeof id !== 'string' || !ID.test(id)) return res.status(400).json({ error: 'Bad preview id' })

  const previews = await (deps.loadPreviews ?? defaultLoad)(kind)
  if (!previews) {
    console.error('proAsset: no preview data in this deployment', { kind })
    return res.status(503).json({ error: 'Preview unavailable' })
  }
  if (!Object.hasOwn(previews, id)) return res.status(404).json({ error: 'No preview for this prompt' })

  const body = kind === 'page' ? Buffer.from(previews[id], 'utf8') : Buffer.from(previews[id], 'base64')
  res.setHeader('Content-Type', TYPES[kind])
  res.setHeader('Content-Length', String(body.length))
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (kind === 'page') {
    res.setHeader('Content-Security-Policy', 'sandbox allow-scripts')
    res.setHeader('X-Robots-Tag', 'noindex')
  }
  res.status(200)
  return res.end(body)
}
