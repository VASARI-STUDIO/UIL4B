// Which body categories earn a look under a heading of each category, and WHY.
// The reason is shown next to every suggestion — a pairing tool that cannot say
// why it suggested something is a random-font button with extra steps.
//
// Split out of googleFonts.js so the ranking can actually be tested: that module
// reads `import.meta.env` at load, which node's test runner cannot evaluate, so
// nothing in it was ever covered. The catalogue fetch stays there; the decision
// lives here, takes a plain array, and is pure.
export const PAIRING_RULES = {
  serif: [
    ['sans-serif', 'A neutral sans under a serif headline is the classic editorial split — maximum contrast, zero competition.'],
    ['monospace', 'Mono body copy keeps a serif headline literary while signalling something technical underneath.'],
  ],
  'sans-serif': [
    ['serif', 'A serif body warms up a geometric headline and makes long-form reading easier.'],
    ['sans-serif', 'Same-genre pairing — lean on a clear weight and size jump to keep the hierarchy obvious.'],
  ],
  display: [
    ['sans-serif', 'Display faces carry the personality; a plain sans body keeps the page readable.'],
    ['serif', 'A restrained serif body gives an expressive display headline somewhere calm to land.'],
  ],
  handwriting: [
    ['sans-serif', 'Script headlines need a completely neutral body or the page starts shouting.'],
    ['serif', 'A quiet serif body steadies a handwritten headline without flattening it.'],
  ],
  monospace: [
    ['sans-serif', 'A humanist sans body offsets the fixed rhythm of a mono headline.'],
    ['serif', 'A serif body adds warmth beneath the mechanical feel of monospace.'],
  ],
}

// A well-known face is a safer body choice, and a body face needs weights to
// build hierarchy with. Popularity is a rank, so it is inverted.
const scoreOf = f => (1 / (f.popularity + 1)) + (f.variants.length / 20)

/**
 * Rank body candidates for a heading face, best first, as
 * `[{ font, reason, score }]` — the suggestion AND its rationale.
 *
 * RANKED WITHIN EACH TARGET CATEGORY, THEN INTERLEAVED.
 *
 * This was one global sort with a +0.05 bonus for the first-listed target,
 * described as "a small edge so the canonical pairing leads the list". Measured
 * against the real 1,946-family catalogue the edge was nowhere near enough and
 * the canonical pairing never appeared AT ALL: under an Inter heading all six
 * suggestions came back sans-serif — Roboto, Montserrat, Open Sans, Poppins,
 * Noto Sans JP, DM Sans — every one carrying the identical sentence
 * "Same-genre pairing — lean on a clear weight and size jump…".
 *
 * The arithmetic explains it: `1/(popularity+1)` runs from 1.0 at rank 0 to
 * 0.01 at rank 100, so it swamps a 0.05 nudge, and the highest-ranked families
 * are overwhelmingly sans. The serif rule for a sans heading was real, correct
 * and unreachable — which made the page the exact thing its own header comment
 * says it must not be: six results and one reason repeated six times is a slot
 * machine with a caption.
 *
 * So each target category is ranked on its own and results are taken
 * round-robin, first-listed target leading. Both pairings are always offered,
 * each with the reason that belongs to it.
 */
export function rankPairings(catalogue, font, { limit = 6 } = {}) {
  const fonts = Array.isArray(catalogue) ? catalogue : []
  const rules = PAIRING_RULES[font?.category] || PAIRING_RULES['sans-serif']
  const reasonFor = Object.fromEntries(rules)
  const targets = rules.map(([cat]) => cat)

  const ranked = targets.map(category => fonts
    .filter(f => f && f.family !== font?.family && f.category === category)
    .map(f => ({ font: f, reason: reasonFor[category], score: scoreOf(f) }))
    .sort((a, b) => b.score - a.score))

  const out = []
  for (let depth = 0; out.length < limit; depth += 1) {
    let placed = false
    for (const list of ranked) {
      if (out.length >= limit) break
      if (!list[depth]) continue
      out.push(list[depth])
      placed = true
    }
    // Every category exhausted — a short catalogue yields fewer suggestions
    // rather than looping forever.
    if (!placed) break
  }
  return out
}

/** The weight a catalog entry should use for headings — 700 when it ships one. */
export function headingWeight(font) {
  if (!font?.variants?.length) return 700
  return font.variants.includes(700) ? 700 : font.variants[font.variants.length - 1]
}

/** The weight a catalog entry should use for body copy — 400 when it ships one. */
export function bodyWeight(font) {
  if (!font?.variants?.length) return 400
  return font.variants.includes(400) ? 400 : font.variants[0]
}

// ── Shuffle: the same rules as the suggestions ──────────────────────────────
//
// A shuffle that ignores PAIRING_RULES is a slot machine, and one that can draw
// the body's own family produces the "Inter + Inter" non-pair the page refuses
// to open on. So a shuffle only ever returns a pair the rules above allow, with
// two different families, and it never touches a side the person has locked.

// The catalogue is sorted by popularity, so the draw comes from the first slice
// rather than the whole list: a random pick from 1,700 families is almost always
// something nobody would ship, which reads as broken rather than serendipitous.
export const SHUFFLE_POOL = 200

// When a body of a category no rule targets (a display or handwriting body, say)
// is locked, these plain heading categories are what is offered.
const PLAIN_HEADINGS = ['sans-serif', 'serif']

/** The heading categories whose rules offer a body of `bodyCategory` — the rules read backwards. */
export function headingCategoriesFor(bodyCategory) {
  const out = Object.entries(PAIRING_RULES)
    .filter(([, rules]) => rules.some(([category]) => category === bodyCategory))
    .map(([heading]) => heading)
  return out.length ? out : PLAIN_HEADINGS
}

/** The reason a `headingCategory` heading takes a `bodyCategory` body, or '' when no rule says. */
export function reasonFor(headingCategory, bodyCategory) {
  const rules = PAIRING_RULES[headingCategory] || PAIRING_RULES['sans-serif']
  return rules.find(([category]) => category === bodyCategory)?.[1] || ''
}

/** Do the rules allow this pair? Two different families, and the heading's rules name the body's category. */
export function pairIsAllowed(heading, body) {
  if (!heading?.family || !body?.family || heading.family === body.family) return false
  const rules = PAIRING_RULES[heading.category] || PAIRING_RULES['sans-serif']
  return rules.some(([category]) => category === body.category)
}

const pickOne = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))]

function shuffled(list, random) {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Re-roll a pair, honouring a lock.
 *   lock 'heading'  keep the heading, draw a body from its ranked suggestions
 *   lock 'body'     keep the body, draw a heading whose rules offer that body
 *   lock 'both'     nothing to draw: returns null
 *   no lock         draw a new heading, then a body for it from its suggestions
 * Returns `{ heading, body, reason, changed }` (`changed` names the sides that
 * moved) or null when nothing valid can be drawn. `random` is injectable so a
 * test can walk every branch.
 */
export function shufflePair(catalogue, {
  heading, body, lock = null, random = Math.random, pool = SHUFFLE_POOL, limit = 12,
} = {}) {
  const fonts = (Array.isArray(catalogue) ? catalogue : []).filter((f) => f && f.family)
  if (!fonts.length || lock === 'both') return null
  const popular = fonts.slice(0, Math.min(pool, fonts.length))

  const drawBody = (head, avoid) => {
    const ranked = rankPairings(fonts, head, { limit })
    const fresh = ranked.filter((s) => s.font.family !== avoid)
    const list = fresh.length ? fresh : ranked
    return list.length ? pickOne(list, random) : null
  }

  if (lock === 'heading') {
    if (!heading?.family) return null
    const hit = drawBody(heading, body?.family)
    return hit ? { heading, body: hit.font, reason: hit.reason, changed: ['body'] } : null
  }

  if (lock === 'body') {
    if (!body?.family) return null
    const cats = headingCategoriesFor(body.category)
    const fits = (list) => list.filter((f) => f.family !== body.family && cats.includes(f.category))
    let list = fits(popular).filter((f) => f.family !== heading?.family)
    if (!list.length) list = fits(fonts).filter((f) => f.family !== heading?.family)
    if (!list.length) list = fits(fonts)
    if (!list.length) return null
    const next = pickOne(list, random)
    return { heading: next, body, reason: reasonFor(next.category, body.category), changed: ['heading'] }
  }

  // Nothing locked. A heading with no valid body is skipped, so a short
  // catalogue still answers or says it cannot.
  const heads = shuffled(popular.filter((f) => f.family !== heading?.family && f.family !== body?.family), random)
  for (const head of heads.length ? heads : shuffled(popular, random)) {
    const hit = drawBody(head, body?.family)
    if (hit && hit.font.family !== head.family) {
      return { heading: head, body: hit.font, reason: hit.reason, changed: ['heading', 'body'] }
    }
  }
  return null
}

// ── Undo and Swap ───────────────────────────────────────────────────────────
// A snapshot is the four values that make a pair: { headingName, bodyName,
// headingW, bodyW }. Locks are controls, not content, so they are not in it.

export const PAIR_HISTORY_MAX = 20

const sameSnapshot = (a, b) => (
  a.headingName === b.headingName && a.bodyName === b.bodyName
  && a.headingW === b.headingW && a.bodyW === b.bodyW
)

/** Add a snapshot to the undo stack (newest last). A repeat of the top is not added; the stack is capped. */
export function pushPairHistory(stack, snapshot, max = PAIR_HISTORY_MAX) {
  const list = Array.isArray(stack) ? stack : []
  if (!snapshot) return list
  const last = list[list.length - 1]
  if (last && sameSnapshot(last, snapshot)) return list
  return [...list, snapshot].slice(-max)
}

/** Take the newest snapshot off the stack: `{ snapshot, rest }`, `snapshot` null when empty. */
export function popPairHistory(stack) {
  const list = Array.isArray(stack) ? stack : []
  if (!list.length) return { snapshot: null, rest: list }
  return { snapshot: list[list.length - 1], rest: list.slice(0, -1) }
}

/**
 * Swap the two sides. The old heading becomes the body at its default body
 * weight and the old body becomes the heading at its default heading weight —
 * carrying a 700 into the body, or a 400 into the heading, would not be a swap
 * of faces but of weights as well.
 */
export function swapPair(headingFont, bodyFont) {
  if (!headingFont?.family || !bodyFont?.family) return null
  return {
    headingName: bodyFont.family,
    bodyName: headingFont.family,
    headingW: headingWeight(bodyFont),
    bodyW: bodyWeight(headingFont),
  }
}
