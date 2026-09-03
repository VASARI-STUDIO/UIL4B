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
