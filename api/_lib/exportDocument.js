// POST /api/ai?export=document { format, projectName, design, template } — the Pro
// documents (the design system book and the brand guidelines), built here.
//
// WHY THE SERVER BUILDS THEM. The Pro check used to sit in the browser, beside
// generators that shipped in the page's own JavaScript. Anyone who read the bundle
// could call a generator directly and skip the check, and anyone who edited the
// panel's state in devtools could pass it. A check that sits next to the thing it
// guards is a hint. So the generators no longer ship to the browser at all: this
// function verifies the account, reads its plan from Firestore, and only then
// loads a generator and returns the finished HTML. No grant, no document.
//
// Hosted inside api/ai.js, not a route of its own: /api holds twelve handlers and
// Vercel's plan allows twelve (tests/unit/account-deletion.test.js pins the
// count). ai.js already holds the Firebase ID-token check and planForUser, and the
// Pro libraries (?library=) are hosted the same way.
//
// WHICH FORMATS. Every format marked `pro: true` in src/config/exportFormats.js,
// the one list the panel, /plans and the badges already share, must have an entry
// in BUILDERS below; tests/unit/export-document.test.js fails if one does not, so
// a new Pro format cannot be badged in the panel and left unbuilt (or built in the
// browser) here.
//
// Contract (POST, JSON body { format, projectName, design, template }):
//   no/invalid token                     401  { code: 'auth_required' }
//   token check failed for a server      500 (credential) or 503 (anything else)
//     reason, not a verdict on the token      { code: 'auth_unavailable' }
//   not a Pro document format            400  { code: 'unknown_format' }
//   Pro format, account is not Pro       403  { code: 'pro_required' }
//   template not live for the format    400  { code: 'unknown_template' }
//     (any non-string; absent, null or '' means the format's default)
//   design too large                     413  { code: 'design_too_large' }
//   Pro format, Pro or admin             200  { ok: true, format, template, html }
//   always                               Cache-Control: private, no-store
//
// Auth is checked before the format, so a stranger cannot use the 400 to learn
// which formats exist, and the plan is checked before the template is looked at
// and before the generator is even loaded. Pro is decided by planForUser from users/{uid}, never from the request.
// `deps` is injected so the unit test can fake the token, the user document and
// the generators.

import { planForUser } from './plans.js'
import { EXPORT_FORMATS } from '../../src/config/exportFormats.js'
import { defaultTemplate, isTemplate } from '../../src/config/exportTemplates.js'
import { safeFamily, safeWeight } from '../../src/utils/styleGuideExport.js'

// The generators, loaded on demand and only after the plan check has passed, so a
// refused request never runs (or even parses) a Pro document builder. The paths
// are literal so Vercel's file tracing bundles them with this function.
export const BUILDERS = Object.freeze({
  book: async () => (await import('../../src/utils/designSystemBook.js')).buildDesignSystemBook,
  guidelines: async () => (await import('../../src/utils/brandGuidelines.js')).buildBrandGuidelines,
})

// The most design JSON the function will read. A real design with a logo
// (capped at 32 KB by the upload field) is a few tens of KB; this leaves room for
// every tool version's extras and still sits far under Vercel's body limit.
export const MAX_DESIGN_CHARS = 256 * 1024
const MAX_NAME_CHARS = 200

// The Firebase Admin error codes that are a verdict on the token itself (expired,
// revoked, malformed, or its account disabled or gone). Anything else thrown by
// verifyIdToken is the server's problem, not the caller's.
const TOKEN_REFUSALS = new Set([
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'auth/argument-error',
  'auth/invalid-id-token',
  'auth/user-disabled',
  'auth/user-not-found',
  'auth/invalid-user-token',
  'auth/user-token-expired',
])

// firebase-admin reports a failed fetch of Google's public signing keys as
// `auth/argument-error`, the same code as a malformed token. The code alone cannot
// tell them apart, so the message does. A Google outage is not a verdict on the
// caller, so it must not reach the 401 branch (the browser answers a 401 by
// sending the caller to /plans).
const KEY_FETCH_FAILURE = /fetching public keys|Error while making request|timeout of \d+ms|ETIMEDOUT|ENOTFOUND|ECONNRESET|ECONNREFUSED|EAI_AGAIN/i

function isTokenRefusal(err) {
  if (!TOKEN_REFUSALS.has(err?.code)) return false
  if (err.code === 'auth/argument-error' && KEY_FETCH_FAILURE.test(String(err.message || ''))) return false
  return true
}

// A font role reduced to the two values the documents print, each checked: a
// family from a safe character set and a weight from 100 to 900 in steps of 100.
// An invalid one becomes undefined, so the generator's own default applies.
function pickFont(f) {
  const o = f && typeof f === 'object' ? f : {}
  return {
    family: safeFamily(o.family) ?? undefined,
    weight: safeWeight(o.weight) ?? undefined,
  }
}

// Only the fields the documents read. The generators treat everything as
// untrusted already; this keeps the request from carrying (and the function from
// walking) anything they never look at. Fonts and weights are cleaned here too,
// because the panel opens the finished HTML as a same-origin blob.
function pickDesign(design) {
  const d = design && typeof design === 'object' ? design : {}
  const fonts = d.fonts && typeof d.fonts === 'object' ? d.fonts : {}
  const ts = d.typeScale && typeof d.typeScale === 'object' ? d.typeScale : undefined
  return {
    palette: d.palette,
    gradient: d.gradient,
    fonts: { heading: pickFont(fonts.heading), body: pickFont(fonts.body) },
    typeScale: ts && { ...ts, headingWeight: safeWeight(ts.headingWeight) ?? undefined },
    logo: d.logo,
  }
}

/**
 * @param req   needs headers.authorization and body { format, projectName, design }
 * @param res   a Vercel/Express-style response
 * @param deps  { verifyIdToken(token, checkRevoked) -> decoded, readUser(uid) -> user doc data,
 *                credentialProblem?() -> a string while the service credential is broken,
 *                builders? -> a BUILDERS-shaped table (tests) }
 */
export async function serveExportDocument(req, res, { verifyIdToken, readUser, credentialProblem, builders = BUILDERS }) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Vary', 'Authorization')

  const header = req.headers?.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required', code: 'auth_required' })
  }

  let decoded
  try {
    // checkRevoked: a disabled or revoked account loses Pro exports at once.
    decoded = await verifyIdToken(header.slice(7), true)
  } catch (err) {
    // 401 means "this session is not valid", and the browser answers it by sending
    // the caller to /plans. So only a verdict on the TOKEN gets it. A broken
    // service credential or a failed revocation lookup says nothing about the
    // caller, and a paying user must not be sent to buy what they already have:
    // those are server faults (500 for the credential, 503 for anything else).
    if (isTokenRefusal(err)) {
      return res.status(401).json({ error: 'Invalid or expired session', code: 'auth_required' })
    }
    let credential = null
    try { credential = credentialProblem?.() } catch { credential = 'unreadable' }
    if (credential) return res.status(500).json({ error: 'Could not check your session', code: 'auth_unavailable' })
    return res.status(503).json({ error: 'Could not check your session', code: 'auth_unavailable' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const id = body.format
  const format = typeof id === 'string' ? EXPORT_FORMATS.find((f) => f.id === id) : null
  // Only a built Pro document is served from here. Everything else (a free
  // format, an unbuilt one, a made-up id) is the same answer, so this route
  // cannot be used to learn anything about the table.
  if (!format || !format.live || !format.pro || !Object.hasOwn(builders, format.id)) {
    return res.status(400).json({ error: 'Unknown export format', code: 'unknown_format' })
  }

  let plan
  try {
    const user = (await readUser(decoded.uid)) || {}
    plan = planForUser({
      subscription: user.subscription || null,
      lifetimeEntitlement: user.lifetimeEntitlement || null,
      // Only a Firebase-verified email may claim an admin entitlement.
      email: decoded.email_verified ? decoded.email : null,
    })
  } catch {
    return res.status(500).json({ error: 'Could not check your plan' })
  }
  if (plan.id !== 'pro') {
    return res.status(403).json({ error: 'Pro plan required', code: 'pro_required', format: format.id })
  }

  // The plan has passed; only now is the request body read for its content,
  // starting with the template. Absent, null or '' is the format's default; any
  // other value must be a live template of this format. The value is a lookup key
  // only: the layout comes from the generator's own template table.
  const wanted = body.template
  const template = wanted === undefined || wanted === null || wanted === '' ? defaultTemplate(format.id) : wanted
  if (!isTemplate(format.id, template)) {
    return res.status(400).json({ error: 'Unknown export template', code: 'unknown_template' })
  }
  const design = pickDesign(body.design)
  let size = 0
  try { size = JSON.stringify(design).length } catch { size = Infinity }
  if (size > MAX_DESIGN_CHARS) {
    return res.status(413).json({ error: 'That design is too large to export', code: 'design_too_large' })
  }
  const projectName = typeof body.projectName === 'string' && body.projectName.trim()
    ? body.projectName.trim().slice(0, MAX_NAME_CHARS)
    : 'Design System'

  try {
    const build = await builders[format.id]()
    const html = build(design, { projectName, template })
    if (typeof html !== 'string' || !html) throw new Error('empty document')
    return res.status(200).json({ ok: true, format: format.id, template, html })
  } catch {
    return res.status(500).json({ error: 'The document could not be created', code: 'build_failed' })
  }
}
