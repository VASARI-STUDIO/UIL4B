// The browser half of the animated icon sets: the ONLY way their listing and
// glyphs reach the page. Each call is GET /api/ai?animatedIcons=<prefix> with the
// account's Firebase ID token; api/_lib/icons/animated.js checks the plan on the
// server and asks Iconify itself, so a free or signed-out visitor makes no request
// for these sets and a forged `isPro` in devtools gets a 403.
//
// This module deliberately names no Iconify host. Nothing here is a gate; it is
// the one door the page is allowed to use for these prefixes.
//
// The auth loader is handed in (defaulting to the app's Firebase wrapper, loaded on
// demand) so this file stays importable on its own and testable with a stub.

/** The server rejects more names than this in one call. */
export const ANIMATED_BATCH = 64

const TIMEOUT_MS = 10000

export function createAnimatedIconClient({ loadAuth = null, fetchImpl = null } = {}) {
  async function call(params) {
    const load = loadAuth || (async () => (await import('./firebaseAccess')).loadAuthSdk())
    const user = (await load())?.auth?.currentUser
    if (!user) throw Object.assign(new Error('Sign in to load animated icons'), { status: 401 })
    const token = await user.getIdToken()
    if (!token) throw Object.assign(new Error('Sign in to load animated icons'), { status: 401 })
    const doFetch = fetchImpl || globalThis.fetch
    const response = await doFetch(`/api/ai?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) throw Object.assign(new Error(`Animated icons answered ${response.status}`), { status: response.status })
    return response.json()
  }

  return {
    /** The pack's /collection listing (names, title, licence info). */
    collection: (prefix) => call({ animatedIcons: prefix }),
    /** Iconify's JSON for up to ANIMATED_BATCH icons of the pack. */
    glyphs: (prefix, names) => call({ animatedIcons: prefix, icons: names.join(',') }),
  }
}

export const animatedIcons = createAnimatedIconClient()
