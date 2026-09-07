// THE BRAND STARTER — the server's half. This file is the SECURITY BOUNDARY.
//
// src/config/aiGeneration.js is the client mirror and carries the long note on
// where the numbers came from. Nothing a browser sends is trusted here: the
// allowance below is what is actually enforced, and the sanitiser below is what
// stands between a model's answer and the user's real tools.
//
// tests/unit/ai-generation-truth.test.js imports BOTH modules and fails the
// build if a number disagrees. That is the same arrangement api/_lib/plans.js
// has with src/config/plans.js, and it exists for the same reason: a client
// that believes it has more headroom than the server grants produces a refusal
// the user was never warned about, which reads as a broken product rather than
// a metered one.

// ─────────────────────────────────────────────────────────────────────────────
// THE ALLOWANCE
// ─────────────────────────────────────────────────────────────────────────────

/** One per account, ever. The founder: "free users will get 1 free usage". */
export const FREE_TOTAL_GENERATIONS = 1

/** ⚠️ The founder's number to change — see src/config/aiGeneration.js. */
export const PRO_MONTHLY_GENERATIONS = 20

export const BRAND_STARTER_TOOL_ID = 'brand-starter'

/**
 * WHERE THE COUNT LIVES, and why this needed nothing from the founder.
 *
 * Both buckets are documents in `daily-usage`, which appears NOWHERE in
 * firestore.rules. That file default-denies, so the collection is unreachable
 * from every client and only the Admin SDK — which bypasses rules — can touch
 * it. api/ai.js already relies on exactly this property for the daily and
 * monthly AI counts, and it is what keeps this change clear of a rules edit:
 * rules changes are founder-gated and published separately, and the environment
 * refuses to stage them.
 *
 * The suffixes can never collide with the ones already in that collection:
 * days are `uid_2026-09-06`, months are `uid_m2026-09`, and a lifetime bucket
 * is `uid_life` — no date can ever produce that string.
 */
export const LIFETIME_BUCKET_SUFFIX = 'life'

/**
 * The allowance, the window, and WHICH DOCUMENT holds the count.
 *
 * Returning the bucket from the same function that returns the number is the
 * whole point: it makes it impossible to check one plan's limit against another
 * plan's counter, which is the shape a metering bug takes.
 *
 * `monthSuffix` is injected rather than computed so the caller keeps ONE
 * definition of "this month" (api/ai.js's monthStr) and a test can pin it.
 */
export function generationBucket(planId, monthSuffix) {
  if (planId === 'pro') {
    return {
      limit: PRO_MONTHLY_GENERATIONS,
      period: 'month',
      suffix: monthSuffix,
    }
  }
  return {
    limit: FREE_TOTAL_GENERATIONS,
    period: 'lifetime',
    suffix: LIFETIME_BUCKET_SUFFIX,
  }
}

/**
 * The refusal a user reads when the bucket is full.
 *
 * Two different sentences, because there are two different truths. Telling a
 * free user their allowance "resets on the 1st" would be a lie they act on by
 * coming back in a month to the same wall — the same failure api/ai.js's
 * existing limit copy was rewritten to avoid.
 */
export function exhaustedError(planId) {
  if (planId === 'pro') {
    return `You have used all ${PRO_MONTHLY_GENERATIONS} Brand Starter generations in your plan this month. It resets on the 1st.`
  }
  return FREE_TOTAL_GENERATIONS === 1
    ? 'You have used your one free Brand Starter generation. Pro raises this to a monthly allowance — everything you have already generated stays where it is.'
    : `You have used all ${FREE_TOTAL_GENERATIONS} free Brand Starter generations. Pro raises this to a monthly allowance.`
}

// ─────────────────────────────────────────────────────────────────────────────
// THE METER — reserving a unit before the provider is called
// ─────────────────────────────────────────────────────────────────────────────
//
// THE DEFECT THIS CLOSES. api/ai.js used to read the counter with a plain
// `get()`, compare it to the limit, call the provider, and only then increment.
// Between the read and the increment there is a window of one whole provider
// round trip — seconds — and every request that starts inside it reads the same
// count. N requests fired together at `used === limit - 1` all read `limit - 1`,
// all pass the comparison, and all run. The cap was soft by exactly the
// concurrency, and nothing anywhere recorded that it had been exceeded.
//
// It matters here more than a per-user overshoot usually would: api/_lib/plans.js
// derives every limit downward from ONE shared free-tier provider bucket, so an
// account that overshoots is not spending its own allowance, it is spending
// everyone's.
//
// THE FIX, and why it is a transaction rather than FieldValue.increment.
// `increment` is atomic but unconditional — it cannot refuse. The decision here
// is conditional on the value read ("is this below the limit?"), so the read and
// the write have to be one serialisable unit. A Firestore transaction gives
// exactly that: the commit is rejected if any document it READ changed, and the
// callback is retried against the new value. The second of two concurrent
// callers therefore re-runs its comparison against the count the first one wrote
// and is refused.
//
// This is why the write below is `counts[i] + 1` and NOT FieldValue.increment:
// a sentinel increment carries no read version, so it would commit even when
// the value it was decided from is stale, and the transaction would guard
// nothing.
//
// THE COST, stated plainly: the unit is now spent BEFORE the answer exists, so
// a provider failure has to give it back. refundQuotaUnit is that, and
// runMeteredTask calls it on every path where the runner did not produce a
// generation. The founder's rule — "a failed request must not consume a free
// user's single use" — survives, with a window: a process killed between the
// reservation and the refund leaves the unit spent. That is a strictly smaller
// hole than the one it replaces, and it fails toward refusing rather than
// toward overspending a shared bucket.

/**
 * Reserve one unit across every meter, atomically, or refuse.
 *
 * `meters` is ordered by which refusal should be reported first — api/ai.js
 * passes the monthly ceiling ahead of the daily one, because the message names
 * WHICH period is exhausted and when it frees up.
 *
 * Each meter is `{ ref, field, limit, period }`. Returns the counts as they were
 * BEFORE the reservation (which is what the response payloads report as `used`),
 * so a caller never has to subtract one back off.
 */
export async function reserveQuotaUnit(db, meters) {
  return db.runTransaction(async (tx) => {
    // Every read first: a Firestore transaction refuses a read issued after a
    // write, so the two loops cannot be merged into one.
    const snaps = []
    for (const m of meters) snaps.push(await tx.get(m.ref))
    const counts = meters.map((m, i) => snaps[i].data()?.[m.field] || 0)
    const blockedAt = meters.findIndex((m, i) => counts[i] >= m.limit)
    // ALL OR NOTHING. A partial reservation — one bucket incremented while
    // another refused — would meter a call that never happened, which is the
    // same kind of silent wrongness in the opposite direction.
    if (blockedAt !== -1) return { ok: false, blocked: meters[blockedAt], counts }
    meters.forEach((m, i) => tx.set(m.ref, { [m.field]: counts[i] + 1 }, { merge: true }))
    return { ok: true, counts }
  })
}

/** Give a reserved unit back. Floors at zero so a double refund cannot go negative. */
export async function refundQuotaUnit(db, meters) {
  return db.runTransaction(async (tx) => {
    const snaps = []
    for (const m of meters) snaps.push(await tx.get(m.ref))
    meters.forEach((m, i) => {
      const current = snaps[i].data()?.[m.field] || 0
      tx.set(m.ref, { [m.field]: current > 0 ? current - 1 : 0 }, { merge: true })
    })
  })
}

/**
 * Reserve → run → refund-if-nothing-was-produced.
 *
 * The ENTIRE metered path lives here rather than in api/ai.js, so that the
 * ordering the fix depends on — reserve strictly before the provider call — is
 * one function a test can drive twice concurrently, instead of a sequence
 * spelled out twice in a route handler that needs a signed-in request, a
 * Firestore and a provider key to exercise.
 *
 * `run(counts)` returns the payload on success, or a falsy value when the runner
 * already answered for itself (an error response, a refused model answer). Falsy
 * means nothing was generated, so the unit is refunded.
 *
 * Outcomes, all three distinguishable by the caller:
 *   { storeError }        Firestore could not be read/written  → 500
 *   { ok: false, blocked, counts }  the meter refused          → 429
 *   { ok: true, counts, result }    ran; result may be null    → 200 / already sent
 */
export async function runMeteredTask({ db, meters, run }) {
  let reservation
  try {
    reservation = await reserveQuotaUnit(db, meters)
  } catch (storeError) {
    return { ok: false, storeError }
  }
  if (!reservation.ok) {
    return { ok: false, blocked: reservation.blocked, counts: reservation.counts }
  }
  let result
  try {
    result = await run(reservation.counts)
  } catch (err) {
    // The refund must not mask the real failure, so its own error is swallowed
    // and the provider's is rethrown.
    await refundQuotaUnit(db, meters).catch(() => {})
    throw err
  }
  if (!result) await refundQuotaUnit(db, meters).catch(() => {})
  return { ok: true, counts: reservation.counts, result: result || null }
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT LIMITS
// ─────────────────────────────────────────────────────────────────────────────

/** Provider input tokens are real money. Enforced here, not in the browser. */
export const MAX_PROMPT_CHARS = 500
/** Below this there is nothing to design from — refuse before spending a unit. */
export const MIN_PROMPT_CHARS = 12

export const PALETTE_MIN_ROLES = 5
export const PALETTE_MAX_ROLES = 8

// The Type Scale tool's own bounds (RATIO_MIN/MAX and BASE_MIN/MAX in
// src/utils/typeHandoff.js). Repeated here because the SERVER must refuse an
// out-of-range scale rather than hand one over and rely on the destination to
// clamp it: a clamped value is a silently different answer from the one the
// user was shown, and the hand-off validator would drop the whole scale.
export const BASE_MIN = 14
export const BASE_MAX = 20
export const RATIO_MIN = 1.1
export const RATIO_MAX = 1.7

// ─────────────────────────────────────────────────────────────────────────────
// THE FONT CATALOGUE THE MODEL MAY CHOOSE FROM
// ─────────────────────────────────────────────────────────────────────────────
//
// THE DEFECT THIS PREVENTS. A language model asked for "a heading font" returns
// a plausible family name, and plausible is not the same as real: it will
// happily answer "Neue Haas Grotesk" or "Söhne", neither of which is on Google
// Fonts. The hand-off would then carry a family the Font Pair tool cannot fetch,
// and the user would land on a tool rendering its fallback face while the result
// screen told them they had chosen something else.
//
// So the model does not name a family — it PICKS one, from this list, which is
// pasted into the prompt and enforced on the way back. Anything not on it is
// refused rather than corrected, because a silent substitution is the same lie
// one step later.
//
// EVERY ENTRY IS ON GOOGLE FONTS AND IN THE APP'S OWN BUNDLED CATALOGUE.
// tests/unit/ai-generation-truth.test.js checks each family against
// src/data/fallbackFonts.js — the list the typography tools fall back to when
// the WebFonts API is unreachable — and fails if a family, its category or its
// weights are not there. That is what makes "the model must pick from families
// that exist" a checked statement rather than a hopeful one.
//
// Curated rather than exhaustive (34 of the 84 bundled families). A pairing is
// the output, so the list is the families that pair WELL and carry the weights a
// heading and a body actually need; a 1,500-family catalogue in the prompt would
// cost input tokens on every call and make the answer worse, not better.
const F = (family, category, headingWeight, bodyWeight) =>
  Object.freeze({ family, category, headingWeight, bodyWeight })

export const FONT_SHORTLIST = Object.freeze([
  // Sans — workhorses. These carry both roles on their own, which is a real and
  // common answer rather than a failure to pick two.
  F('Inter', 'sans-serif', 700, 400),
  F('Roboto', 'sans-serif', 700, 400),
  F('Open Sans', 'sans-serif', 700, 400),
  F('Lato', 'sans-serif', 700, 400),
  F('Source Sans 3', 'sans-serif', 700, 400),
  F('IBM Plex Sans', 'sans-serif', 600, 400),
  F('Work Sans', 'sans-serif', 700, 400),
  F('Libre Franklin', 'sans-serif', 700, 400),
  F('Figtree', 'sans-serif', 700, 400),
  F('Manrope', 'sans-serif', 700, 400),
  F('Plus Jakarta Sans', 'sans-serif', 700, 400),
  F('DM Sans', 'sans-serif', 700, 400),
  F('Karla', 'sans-serif', 700, 400),
  F('Nunito Sans', 'sans-serif', 700, 400),
  F('Rubik', 'sans-serif', 600, 400),
  F('Barlow', 'sans-serif', 700, 400),
  F('Archivo', 'sans-serif', 700, 400),
  F('Urbanist', 'sans-serif', 700, 400),
  F('Lexend', 'sans-serif', 600, 400),
  // Sans — with more voice. Headings first; several are too mannered for body
  // text and the prompt says so.
  F('Montserrat', 'sans-serif', 700, 400),
  F('Poppins', 'sans-serif', 600, 400),
  F('Raleway', 'sans-serif', 700, 400),
  F('Space Grotesk', 'sans-serif', 700, 400),
  F('Sora', 'sans-serif', 700, 400),
  F('Outfit', 'sans-serif', 600, 400),
  F('Oswald', 'sans-serif', 600, 400),
  F('Bricolage Grotesque', 'sans-serif', 700, 400),
  // Serif — editorial, institutional, and the warm end of both.
  F('Playfair Display', 'serif', 700, 400),
  F('Lora', 'serif', 600, 400),
  F('Merriweather', 'serif', 700, 400),
  F('Source Serif 4', 'serif', 600, 400),
  F('EB Garamond', 'serif', 600, 400),
  F('Fraunces', 'serif', 700, 400),
  F('Crimson Pro', 'serif', 600, 400),
])

/** Family → entry, lowercased so a difference in case is not a refusal. */
const BY_FAMILY = new Map(FONT_SHORTLIST.map((f) => [f.family.toLowerCase(), f]))

/** The list as the prompt prints it: `Inter (sans-serif)`, one per line. */
export function fontChoiceList() {
  return FONT_SHORTLIST.map((f) => `${f.family} (${f.category})`).join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// THE BOUNDARY — refusing an unsafe model answer
// ─────────────────────────────────────────────────────────────────────────────
//
// src/utils/communitySubmissions.js is the precedent: a value that arrived from
// somewhere we do not control is REBUILT from scratch rather than merged, so
// unknown keys are dropped instead of carried, and every field is re-derived.
//
// The difference here, and it is why this returns a REASON: a community
// submission that fails sanitising can be dropped silently because there are
// others. A generation that fails cannot — the user is standing there, and on
// the free plan they have one of these. So the failure has to be nameable in
// the response and, above all, MUST NOT COUNT AGAINST THEM. api/ai.js only
// increments the bucket after a runner returns a success payload, so a refusal
// here costs the caller nothing but the wait.

const HEX_RE = /^#?([0-9a-f]{6})$/i
// Role names are printed next to a swatch. Letters, digits, spaces and a hyphen
// — nothing that could change the meaning of the markup it lands in.
const ROLE_RE = /^[A-Za-z][A-Za-z0-9 -]{0,23}$/

/** '#aabbcc' / 'AABBCC' → '#AABBCC'; null when it is not a six-digit hex. */
export function normaliseHex(raw) {
  if (typeof raw !== 'string') return null
  const m = HEX_RE.exec(raw.trim())
  return m ? `#${m[1].toUpperCase()}` : null
}

/** Collapse whitespace and cap. Returns '' rather than null so callers can join. */
function cleanText(raw, max) {
  if (typeof raw !== 'string') return ''
  return raw.replace(/\s+/g, ' ').trim().slice(0, max)
}

/**
 * Validate one model answer into something a real tool may receive.
 *
 * Returns `{ ok: true, starter }` or `{ ok: false, reason }`. The reason is for
 * the SERVER LOG and for a diagnostic, not for the user — a person does not
 * need to hear "ratio out of range", they need to hear that it did not work and
 * that it cost them nothing.
 */
export function sanitizeBrandStarter(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'not an object' }
  }

  // ── palette ───────────────────────────────────────────────────────────────
  if (!Array.isArray(raw.palette)) return { ok: false, reason: 'palette is not an array' }
  const palette = []
  const seen = new Set()
  for (const entry of raw.palette) {
    if (!entry || typeof entry !== 'object') continue
    const hex = normaliseHex(entry.hex)
    if (!hex || seen.has(hex)) continue
    const role = ROLE_RE.test(String(entry.role || '').trim())
      ? String(entry.role).trim()
      : null
    // A swatch with no usable role name is still a usable COLOUR, so it is kept
    // and labelled by position rather than thrown away — losing a colour would
    // be a worse answer than losing a word.
    palette.push({ hex, role: role || `Colour ${palette.length + 1}` })
    seen.add(hex)
    if (palette.length >= PALETTE_MAX_ROLES) break
  }
  if (palette.length < PALETTE_MIN_ROLES) {
    return { ok: false, reason: `palette has ${palette.length} usable colours, needs ${PALETTE_MIN_ROLES}` }
  }

  // ── fonts ─────────────────────────────────────────────────────────────────
  // The one check that cannot be relaxed: a family off the shortlist is a family
  // the product may not be able to load, and handing it to Font Pair would open
  // that tool on a fallback face while the result screen claimed otherwise.
  const headingName = String(raw.fonts?.heading || '').trim().toLowerCase()
  const bodyName = String(raw.fonts?.body || '').trim().toLowerCase()
  const heading = BY_FAMILY.get(headingName)
  const body = BY_FAMILY.get(bodyName)
  if (!heading) return { ok: false, reason: `heading font "${headingName}" is not in the catalogue` }
  if (!body) return { ok: false, reason: `body font "${bodyName}" is not in the catalogue` }

  // ── type scale ────────────────────────────────────────────────────────────
  const base = Number(raw.typeScale?.base)
  const ratio = Number(raw.typeScale?.ratio)
  if (!Number.isFinite(base) || base < BASE_MIN || base > BASE_MAX) {
    return { ok: false, reason: `type scale base ${raw.typeScale?.base} is outside ${BASE_MIN}-${BASE_MAX}` }
  }
  if (!Number.isFinite(ratio) || ratio < RATIO_MIN || ratio > RATIO_MAX) {
    return { ok: false, reason: `type scale ratio ${raw.typeScale?.ratio} is outside ${RATIO_MIN}-${RATIO_MAX}` }
  }

  return {
    ok: true,
    starter: {
      // Rebuilt field by field. Nothing the model sent that is not named here
      // reaches the client, so an extra key it invented cannot ride along.
      name: cleanText(raw.name, 48) || 'Brand starter',
      rationale: cleanText(raw.rationale, 240),
      palette,
      fonts: {
        heading: { family: heading.family, weight: heading.headingWeight, category: heading.category },
        body: { family: body.family, weight: body.bodyWeight, category: body.category },
      },
      // Rounded to the precision the Type Scale tool actually offers, so the
      // number on the result screen is the number the tool opens with.
      typeScale: { base: Math.round(base), ratio: Math.round(ratio * 1000) / 1000 },
    },
  }
}

/**
 * Pull a JSON object out of whatever the model returned.
 *
 * Kept separate from the sanitiser so a parse failure and a shape failure are
 * distinguishable in the log — they have different causes and different fixes.
 * Code fences are stripped because every provider adds them sometimes despite
 * being told not to, and refusing over punctuation would spend a user's
 * allowance on a formatting habit.
 */
export function parseStarterJson(text) {
  const raw = String(text || '')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()
  // A model that adds a sentence before the object is common; find the object
  // rather than fail on the prose.
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}
