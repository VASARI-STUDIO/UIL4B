// Owner and administrator identities for the client.
//
// Addresses are stored only as SHA-256 digests (see ownerEmailDigest) and
// lookups hash their input before comparing. The client admin check decides
// what to render; access is enforced server-side against a verified Firebase ID
// token (api/verify-admin.js, api/_lib/adminEmails.js).
//
// sha256Hex is synchronous because its callers decide what to render during
// render. The unit tests check it against node:crypto.

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

// Domain-separation prefix for the digests below. Changing it requires
// recomputing every digest constant.
const OWNER_DIGEST_SCOPE = 'uil4b/owner-email/v1:'

/**
 * The value both maps below are keyed by. The address is lower-cased first.
 */
export function ownerEmailDigest(email) {
  return sha256Hex(OWNER_DIGEST_SCOPE + String(email).toLowerCase())
}

// ownerEmailDigest of the site owner's address.
const FOUNDER_DIGEST = 'a21225151329be64a7df9091c4a9cc016f6925ac48fa1f7321004537578a1ca1'

// ownerEmailDigest of the acceptance-suite admin fixture. Included only when
// import.meta.env.MODE is 'test', which Vite resolves at build time, so it is
// absent from production bundles.
const TEST_ADMIN_DIGEST = '2adf140688fd8cebaceeddf03ce7cddc7b73a131dcb2926aa18c39781b2e569f'

// ownerEmailDigest of the administrator role address. The client list mirrors
// the server allowlist so rendered admin surfaces match what the server grants.
const ROLE_ADMIN_DIGEST = '2b612d4e9520b271cc3e3745856a8b12c49d1280d7cfa54e624f637fa2b0b70d'

export const ADMIN_EMAIL_DIGESTS = import.meta.env?.MODE === 'test'
  ? [FOUNDER_DIGEST, ROLE_ADMIN_DIGEST, TEST_ADMIN_DIGEST]
  : [FOUNDER_DIGEST, ROLE_ADMIN_DIGEST]

/**
 * Client-side admin check. It only decides what to render; data access is
 * enforced by /api/verify-admin and the server allowlist.
 */
export function isAdminEmail(email) {
  return !!email && ADMIN_EMAIL_DIGESTS.includes(ownerEmailDigest(email))
}

/**
 * The allowlist as a membership test with an `includes` method, for callers
 * that use `ADMIN_EMAILS.includes(email)`. It holds no addresses and is not
 * indexable.
 */
export const ADMIN_EMAILS = Object.freeze({
  includes: (email) => isAdminEmail(email),
})
export const PUBLIC_OWNER_ID = 'uil4b-founder'

// Site owner display identity, keyed by ownerEmailDigest(email). When a
// matching user's name renders, UserName shows this handle, crown and a
// "Site owner" tooltip. Presentational only; access control is
// ADMIN_EMAIL_DIGESTS.
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
