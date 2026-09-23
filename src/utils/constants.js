// ── THE OWNER'S ADDRESS IS NOT IN THIS FILE, DELIBERATELY ───────────────────
//
// Measured against LIVE production on 2026-09-13, with no credentials sent:
//
//   curl https://uil4b.com/assets/constants-KnpCfm5i.js
//   -> 200, 1945 bytes, containing the founder's personal address TWICE
//
// This module sits in the `modulepreload` list of all 39 prerendered shells, so
// that chunk was fetched in the FIRST REQUEST WAVE by every anonymous visitor,
// on every route, signed in or not. Two things followed:
//
//   1. a personal address, harvestable by any scraper, published on every page;
//   2. the exact account to phish or credential-stuff in order to reach /admin,
//      named for the attacker. The address alone grants nothing — it is still a
//      step, and it was a step this repository handed over for free.
//
// So the address is stored here as a SHA-256 digest, and the two lookups hash
// their input before comparing. BOTH occurrences are gone: ADMIN_EMAILS became
// ADMIN_EMAIL_DIGESTS, and OWNER_HANDLES — which was KEYED by the same address
// — is re-keyed by the same digest. Hashing only the first would have fixed
// nothing.
//
// ── WHAT THIS IS NOT ───────────────────────────────────────────────────────
//
// The digest is not a secret and does not pretend to be one. The scope string
// below is public, and anyone who already knows the address can confirm it in
// one line. Neither this nor the plaintext it replaces was ever a security
// boundary: that is /api/verify-admin and `isAdminEmail` in api/_lib/plans.js,
// both of which read a VERIFIED Firebase ID token. api/_lib/admin.js keeps its
// own plaintext copy and should — it is never bundled and never reaches a
// browser. What the digest removes is the DISCLOSURE, which is the whole defect.
//
// ── WHY NOT AN ENV VAR ─────────────────────────────────────────────────────
//
// `import.meta.env.VITE_*` is substituted by Vite as a STRING LITERAL at build
// time. A variable holding the address would put exactly the same plaintext in
// exactly the same chunk — that does not fix the leak, it relocates its source.
// It only works if the variable holds a digest, which is this, plus a
// deployment step that can silently go missing and lock the founder out of
// /admin on a build nobody notices. A constant beats configuration here.
//
// ── WHY A HAND-WRITTEN SHA-256 AND NOT crypto.subtle ───────────────────────
//
// `crypto.subtle.digest` is async. All six call sites decide what to RENDER — a
// route guard, a nav item, a command-palette entry, a table row — synchronously,
// during render. Making them async would trade a leak for a flash of the wrong
// surface, which is a change to what a visitor sees. Forty lines of pure
// arithmetic is the cheaper trade, and it is checked against node:crypto in
// tests/unit/owner-email-not-public.test.js rather than trusted.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

const rotr = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0

/** SHA-256 of a UTF-8 string, as lowercase hex. Synchronous by design. */
function sha256Hex(text) {
  const input = new TextEncoder().encode(text)
  // message, 0x80, zero padding, then a 64-bit big-endian bit length, to a
  // whole number of 64-byte blocks.
  const block = new Uint8Array((((input.length + 8) >> 6) + 1) << 6)
  block.set(input)
  block[input.length] = 0x80
  const view = new DataView(block.buffer)
  const bits = input.length * 8
  view.setUint32(block.length - 8, Math.floor(bits / 0x100000000), false)
  view.setUint32(block.length - 4, bits >>> 0, false)

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ])
  const w = new Uint32Array(64)

  for (let at = 0; at < block.length; at += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(at + i * 4, false)
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, acc] = h
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (acc + s1 + ch + K[i] + w[i]) >>> 0
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (s0 + maj) >>> 0
      acc = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }
    const next = [a, b, c, d, e, f, g, acc]
    for (let i = 0; i < 8; i += 1) h[i] = (h[i] + next[i]) >>> 0
  }

  let hex = ''
  for (let i = 0; i < 8; i += 1) hex += h[i].toString(16).padStart(8, '0')
  return hex
}

// Domain separation, not a secret. It stops a digest lifted from this bundle
// from being answered by a rainbow table of bare email hashes. Bump the version
// suffix and recompute FOUNDER_DIGEST if it ever changes.
const OWNER_DIGEST_SCOPE = 'uil4b/owner-email/v1:'

/**
 * The value both maps below are keyed by. Lower-cases exactly as the plaintext
 * comparisons it replaces did, so nothing that matched before stops matching.
 */
export function ownerEmailDigest(email) {
  return sha256Hex(OWNER_DIGEST_SCOPE + String(email).toLowerCase())
}

// ownerEmailDigest of the founder's address. The address itself lives in
// api/_lib/admin.js and api/_lib/plans.js, server-side, where it belongs;
// tests/unit/owner-email-not-public.test.js reads it from there and proves this
// constant is still the digest of it, so the two cannot drift in silence.
const FOUNDER_DIGEST = 'a21225151329be64a7df9091c4a9cc016f6925ac48fa1f7321004537578a1ca1'

/* THE TEST ADMIN, AND WHY IT IS A DIGEST TOO.
 *
 * The acceptance suite's admin fixture signs in as `admin@uil4b.test` — a
 * reserved domain, chosen when the server allowlist moved to `ADMIN_EMAILS` so
 * the founder's real address stopped being the thing tests hardcode. But THIS
 * list is the client gate, `RequireAdmin` reads it, and a digest cannot be
 * satisfied by a substitute address. So four admin tests went red the moment
 * the fixture changed: the server said yes and the browser said no.
 *
 * This is the digest of that reserved address, and it is only in the list under
 * `--mode test`. `import.meta.env.MODE` is replaced at BUILD time by Vite, so
 * the entry is not dead code in a production bundle — it is absent from it, the
 * same mechanism that keeps the test auth double out of production
 * (tests/unit/test-session-not-in-production.test.js proves that separately).
 *
 * It is a digest rather than a plaintext for consistency, not secrecy: an
 * address on a reserved TLD that cannot receive mail is not a credential. What
 * matters is that the gate takes one shape, so nobody later adds a plaintext
 * branch here and reopens the disclosure this whole file exists to close. */
const TEST_ADMIN_DIGEST = '2adf140688fd8cebaceeddf03ce7cddc7b73a131dcb2926aa18c39781b2e569f'

/* THE ROLE ADDRESS, ADDED 2026-09-23 — and BOTH are listed on purpose.
 *
 * `admin@uil4b.com` is the better administrator: a role on the product's own
 * domain rather than the founder's personal identity, so it can be handed over,
 * revoked or shared without touching his own account.
 *
 * BOTH stay listed because this gate and the SERVER's `ADMIN_EMAILS` are
 * separate lists, and the failure when they disagree is confusing rather than
 * loud: the server would grant the API while this gate bounced the browser off
 * /admin, or worse, the reverse — the admin UI rendering for somebody whose
 * every request then 403s. Listing both here means whichever address
 * `ADMIN_EMAILS` is set to, the browser agrees with the server, and there is a
 * second way in if the domain mailbox ever stops being able to sign in.
 *
 * This is NOT a weakening. This list only decides what to RENDER — the bundle
 * ships to every visitor, so it can hide a surface and can never protect data.
 * `api/_lib/adminEmails.js` is the boundary, it reads a VERIFIED Firebase ID
 * token, and an address that is not in `ADMIN_EMAILS` gets nothing from it no
 * matter what this file says. */
const ROLE_ADMIN_DIGEST = '2b612d4e9520b271cc3e3745856a8b12c49d1280d7cfa54e624f637fa2b0b70d'

export const ADMIN_EMAIL_DIGESTS = import.meta.env?.MODE === 'test'
  ? [FOUNDER_DIGEST, ROLE_ADMIN_DIGEST, TEST_ADMIN_DIGEST]
  : [FOUNDER_DIGEST, ROLE_ADMIN_DIGEST]

/**
 * Client-side admin check. Keep in sync with `isAdminEmail` in
 * api/_lib/plans.js — that one reads a verified Firebase ID token and is the
 * actual security boundary. THIS one only decides what to render: the bundle
 * ships to every visitor, so it can hide a surface but can never protect data.
 * Anything that must not leak belongs behind /api/verify-admin, the way the
 * Admin dashboard does it.
 *
 * Six call sites had this expression inlined and one of them lower-cased
 * differently, so it lives here now. Four of them were STILL inlining
 * `ADMIN_EMAILS.includes(...)` against the plaintext list; three now call this,
 * and the fourth cannot be touched — see ADMIN_EMAILS below.
 */
export function isAdminEmail(email) {
  return !!email && ADMIN_EMAIL_DIGESTS.includes(ownerEmailDigest(email))
}

/**
 * The allowlist as a MEMBERSHIP TEST, not as a list of addresses.
 *
 * This exists for exactly one caller. src/contexts/SubscriptionContext.jsx
 * writes `ADMIN_EMAILS.includes(user.email.toLowerCase())`, and it is
 * FOUNDER-GATED: tests/unit/firebase-deferral.test.js fails if this branch
 * modifies it, because docs/design/firebase-deferral-gated.patch is waiting on
 * approval to land in that exact file and a quiet edit here would invalidate
 * it. The three other call sites that inlined the same expression were not
 * gated and call isAdminEmail() directly now.
 *
 * So the SHAPE had to survive even though the contents could not, and keeping
 * the contents was never an option: that array WAS the leak. It is deliberately
 * not a list — there is nothing in it to index, iterate, spread or print, which
 * is the whole point. Returning digests under this name would be worse than
 * either: `.includes(anAddress)` would quietly answer false and the founder
 * would lose his Pro entitlement on a green build.
 *
 * When the gate lifts, replace that one call with isAdminEmail(user?.email) and
 * delete this.
 */
export const ADMIN_EMAILS = Object.freeze({
  includes: (email) => isAdminEmail(email),
})
export const PUBLIC_OWNER_ID = 'uil4b-founder'

// Site owner(s). Keyed by ownerEmailDigest(email) — it used to be keyed by the
// lowercase address, which is how the address reached the bundle a SECOND time.
// When a matching user's name renders anywhere in the app, UserName upgrades it
// to this canonical handle + crown and a "Site owner" tooltip.
//
// THE VALUES ARE DELIBERATE PUBLIC IDENTITY AND STAY VERBATIM. The founder's
// name is meant to be public; his address is not. Removing the crown, the
// handle, the tooltip or the publicId is a product change, not a cleanup, and
// tests/unit/owner-email-not-public.test.js fails if one goes missing.
//
// Distinct from ADMIN_EMAIL_DIGESTS (access control) — this is purely
// presentational identity.
export const OWNER_HANDLES = {
  [FOUNDER_DIGEST]: {
    name: 'Dylan Coleman',
    crown: '👑',
    publicHandle: 'Dylan Coleman 👑',
    title: 'UIL4B founder',
    publicId: PUBLIC_OWNER_ID,
  },
}

export function getOwnerHandle(email) {
  if (!email) return null
  return OWNER_HANDLES[ownerEmailDigest(email)] || null
}

export function getPublicOwner(ownerId) {
  if (!ownerId) return null
  return Object.values(OWNER_HANDLES).find((owner) => owner.publicId === ownerId) || null
}

// Flair catalog — a small tag shown next to a user's name to signal role or
// standing in the community. `group` splits pickable identity flairs from
// `earned` badges the system awards (not selectable in Settings). `tone` maps to
// a colour treatment in global.css (.flair--<tone>).
export const FLAIRS = [
  // Roles — what you do
  { id: 'designer', label: 'Designer', group: 'role', tone: 'accent' },
  { id: 'developer', label: 'Developer', group: 'role', tone: 'blue' },
  { id: 'design-engineer', label: 'Design Engineer', group: 'role', tone: 'violet' },
  { id: 'product-designer', label: 'Product Designer', group: 'role', tone: 'accent' },
  { id: 'brand-designer', label: 'Brand Designer', group: 'role', tone: 'violet' },
  { id: 'art-director', label: 'Art Director', group: 'role', tone: 'rose' },
  { id: 'creative-director', label: 'Creative Director', group: 'role', tone: 'rose' },
  { id: 'illustrator', label: 'Illustrator', group: 'role', tone: 'amber' },
  { id: 'ux-researcher', label: 'UX Researcher', group: 'role', tone: 'blue' },
  { id: 'founder', label: 'Founder', group: 'role', tone: 'amber' },
  { id: 'freelancer', label: 'Freelancer', group: 'role', tone: 'green' },
  { id: 'student', label: 'Student', group: 'role', tone: 'green' },
  { id: 'educator', label: 'Educator', group: 'role', tone: 'blue' },
  { id: 'hobbyist', label: 'Hobbyist', group: 'role', tone: 'slate' },
  // Community — how you show up here
  { id: 'community-builder', label: 'Community Builder', group: 'community', tone: 'violet' },
  { id: 'curator', label: 'Curator', group: 'community', tone: 'accent' },
  { id: 'tastemaker', label: 'Tastemaker', group: 'community', tone: 'rose' },
  { id: 'mentor', label: 'Mentor', group: 'community', tone: 'green' },
  // Earned — awarded by the system, not selectable
  { id: 'top-sharer', label: 'Top Community Sharer', group: 'earned', tone: 'gold', earned: true },
  { id: 'early-adopter', label: 'Early Adopter', group: 'earned', tone: 'gold', earned: true },
  { id: 'founding-member', label: 'Founding Member', group: 'earned', tone: 'gold', earned: true },
]

export const FLAIR_MAP = Object.fromEntries(FLAIRS.map((f) => [f.id, f]))

export function getFlair(id) {
  return id ? FLAIR_MAP[id] || null : null
}
