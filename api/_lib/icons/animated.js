// GET /api/ai?animatedIcons=<prefix>[&icons=a,b,c] — the animated icon sets, Pro only.
//
// The three sets below are Iconify's free animated collections. They are a Pro
// feature, so the browser never asks api.iconify.design for them: it asks this
// route, with the account's Firebase ID token, and this route asks Iconify.
// Nothing about a free or signed-out visitor reaches the upstream at all.
//
// Hosted inside api/ai.js beside ?library= (no thirteenth function:
// tests/unit/account-deletion.test.js pins 12, and vercel.json's rewrites are
// generated and deep-equal tested, so there is no new rewrite either).
//
// Contract, in the order the checks run (a refusal never reveals which of the
// later checks it would have failed):
//   no/invalid token                401   (requireProUser)
//   signed in, not Pro              403   (requireProUser, planForUser)
//   prefix not in ANIMATED_PREFIXES 400
//   icons given but malformed       400   (names are ^[a-z0-9]+(-[a-z0-9]+)*$, at most 64)
//   upstream refused / timed out    502
//   Pro, no `icons`                 200 the pack's /collection listing (names + licence info)
//   Pro, `icons=a,b,c`              200 Iconify's /{prefix}.json?icons= answer
//   always                          Cache-Control: private, no-store; Vary: Authorization
//
// The upstream URL is built from the allowlisted prefix and the validated names
// only, so nothing the caller sends can steer the request to another host or path.
//
// `deps` is injected so the unit test can fake the token, the user document and
// the upstream. Nothing under src/ is imported: the function carries only api/ files.
// The client's copy of this list is the `animated: true` rows of
// src/data/iconPackTiers.js; tests/unit/animated-icons-endpoint.test.js pins the two
// to the same set.

import { requireProUser } from '../library/serve.js'

// Licences read from https://api.iconify.design/collections: all three MIT.
export const ANIMATED_PREFIXES = Object.freeze(['line-md', 'svg-spinners', 'meteocons'])

export const ICONIFY_API = 'https://api.iconify.design'
export const MAX_ICONS_PER_CALL = 64
const MAX_NAME_LENGTH = 64
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
const UPSTREAM_TIMEOUT_MS = 8000

/** The icon names in `?icons=a,b,c`, or null when the value is not an acceptable list. */
export function parseIconNames(value) {
  if (typeof value !== 'string' || !value) return null
  const names = value.split(',')
  if (names.length > MAX_ICONS_PER_CALL) return null
  for (const name of names) {
    if (name.length > MAX_NAME_LENGTH || !NAME_PATTERN.test(name)) return null
  }
  return [...new Set(names)]
}

/**
 * @param req   needs headers.authorization and query.animatedIcons / query.icons
 * @param res   a Vercel/Express-style response
 * @param deps  { verifyIdToken, readUser, fetchImpl? } — fetchImpl defaults to the global fetch
 */
export async function serveAnimatedIcons(req, res, deps) {
  if (!(await requireProUser(req, res, deps))) return

  const prefix = req.query?.animatedIcons
  if (typeof prefix !== 'string' || !ANIMATED_PREFIXES.includes(prefix)) {
    return res.status(400).json({ error: `Unknown animated set — expected one of: ${ANIMATED_PREFIXES.join(', ')}` })
  }

  let url
  if (req.query?.icons === undefined) {
    url = `${ICONIFY_API}/collection?prefix=${prefix}&info=1`
  } else {
    const names = parseIconNames(req.query.icons)
    if (!names) {
      return res.status(400).json({ error: `icons must be 1 to ${MAX_ICONS_PER_CALL} lowercase icon names separated by commas` })
    }
    url = `${ICONIFY_API}/${prefix}.json?icons=${names.join(',')}`
  }

  let data
  try {
    const upstream = await (deps.fetchImpl || globalThis.fetch)(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) })
    if (!upstream.ok) return res.status(502).json({ error: 'The icon service did not answer' })
    data = await upstream.json()
  } catch {
    return res.status(502).json({ error: 'The icon service did not answer' })
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(502).json({ error: 'The icon service sent something unexpected' })
  }
  return res.status(200).json(data)
}
