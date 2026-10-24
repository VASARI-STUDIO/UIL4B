// The browser half of the animated icon sets: the ONLY way their listing and
// glyphs reach the page. Each call is GET /api/ai?animatedIcons=<prefix> with the
// account's Firebase ID token; api/_lib/icons/animated.js checks the plan on the
// server and asks Iconify itself, so a free or signed-out visitor makes no request
// for these sets.
//
// The server decides access; the client's tier is a display hint.
//
// This module deliberately names no Iconify host. Nothing here is a gate; it is
// the one door the page is allowed to use for these prefixes.
//
// The auth loader is handed in (defaulting to the app's Firebase wrapper, loaded on
// demand) so this file stays importable on its own and testable with a stub.
//
// Errors carry what the page needs to tell failures apart:
//   status        the HTTP status, or 401 when no usable ID token could be had
//   tokenFailure  true when the ID token could not be read or refreshed
// A network failure (no response) carries neither; see classifyAnimatedFailure.

/** The server rejects more names than this in one call. */
export const ANIMATED_BATCH = 64

/** The shape the server accepts for an icon name; anything else would 400 the batch. */
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
const MAX_NAME_LENGTH = 64
export const isAnimatedName = (name) => (
  typeof name === 'string' && name.length <= MAX_NAME_LENGTH && NAME_PATTERN.test(name)
)

const TIMEOUT_MS = 10000

const SIGN_IN_MESSAGE = 'Sign in to load animated icons'

/**
 * How a failed animated call should be handled:
 *   'auth'       the session could not be used (401, or no token): sign in again
 *   'forbidden'  the server says the plan does not include these sets (403)
 *   'stale'      the answer arrived after the viewer left Pro and was dropped
 *   'transient'  anything else: offline, a timeout, a 5xx
 */
export function classifyAnimatedFailure(err) {
  if (err?.stale) return 'stale'
  if (err?.status === 403) return 'forbidden'
  if (err?.status === 401 || err?.tokenFailure) return 'auth'
  return 'transient'
}

/** Failures that belong to the pack the viewer is looking at, not to the icon service. */
export const isPackScopedFailure = (kind) => kind === 'auth' || kind === 'forbidden' || kind === 'stale'

export function createAnimatedIconClient({ loadAuth = null, fetchImpl = null } = {}) {
  // getIdToken() returns the cached token while it is valid; getIdToken(true) forces a refresh.
  async function tokenOf(user, forceRefresh) {
    let token
    try {
      token = await user.getIdToken(forceRefresh)
    } catch (err) {
      // No network is not a session problem: leave it as a plain failure.
      if (err?.code === 'auth/network-request-failed') throw err
      throw Object.assign(new Error('Could not refresh your session'), { status: 401, tokenFailure: true, code: err?.code })
    }
    if (!token) throw Object.assign(new Error(SIGN_IN_MESSAGE), { status: 401, tokenFailure: true })
    return token
  }

  async function call(params) {
    const load = loadAuth || (async () => (await import('./firebaseAccess')).loadAuthSdk())
    const user = (await load())?.auth?.currentUser
    if (!user) throw Object.assign(new Error(SIGN_IN_MESSAGE), { status: 401 })
    const doFetch = fetchImpl || globalThis.fetch
    const send = (token) => doFetch(`/api/ai?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    let response = await send(await tokenOf(user, false))
    // A 401 can be a token that expired between the cached read and the server's
    // check. Refresh once and ask again before reporting a session problem.
    if (response.status === 401) response = await send(await tokenOf(user, true))
    if (!response.ok) throw Object.assign(new Error(`Animated icons answered ${response.status}`), { status: response.status })
    return response.json()
  }

  return {
    /** The pack's /collection listing (names, title, licence info). */
    collection: (prefix) => call({ animatedIcons: prefix }),
    /** Iconify's JSON for up to ANIMATED_BATCH icons of the pack. Names the server would refuse are left out. */
    glyphs: (prefix, names) => {
      const valid = names.filter(isAnimatedName)
      return valid.length ? call({ animatedIcons: prefix, icons: valid.join(',') }) : Promise.resolve({ icons: {} })
    },
  }
}

export const animatedIcons = createAnimatedIconClient()
