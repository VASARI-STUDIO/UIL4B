// The prompt library must not teach people to produce the look we reject.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS IS DIFFERENT FROM THE OTHER ANTI-SLOP GUARD
// ─────────────────────────────────────────────────────────────────────────────
// tests/unit/ai-generation-truth.test.js already bans a marketing vocabulary —
// in ONE file, BrandStarter.jsx. Nothing looked at the twenty community
// prompts, which is the surface where it matters most: a prompt is an
// INSTRUCTION TO A MODEL, published for other people to copy. A prompt that
// hardcodes a slop palette does not merely contain slop, it manufactures it,
// once per person who uses it.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE DEFECT THAT PROMPTED IT, 2026-09-15
// ─────────────────────────────────────────────────────────────────────────────
// c-14 ("3D hero — morphing blob background") specified
// "colors": ["#667eea", "#764ba2", "#f093fb"] — the single most-copied gradient
// on the generated web — while telling the reader it was "inspired by
// stripe.com and linear.app", whose heroes are neither of those things. Every
// output of that prompt was going to look generated, and the prompt said so in
// hex. It also asked for "premium and mesmerising", which is the vague-quality
// register the founder has rejected twice by name.
//
// ─────────────────────────────────────────────────────────────────────────────
// TWO CORRECTIONS THIS FILTER NEEDED BEFORE IT WAS HONEST
// ─────────────────────────────────────────────────────────────────────────────
// Both were found by checking its output rather than trusting it, and both are
// the reason the matching below is more careful than a word list.
//
//  1. NEGATION. The first pass flagged c-8's brand sheet for the word
//     "curated" — inside a "We do not write" panel whose example sentence was
//     "Embark on a curated sensory journey with our artisanal single-origin
//     experience." It flagged the counter-example. The refined c-14 then
//     tripped the palette rule for naming those three hexes as the thing to
//     AVOID. A filter that cannot tell prescription from proscription reports
//     good work as bad, which is how a filter gets switched off.
//
//  2. INDIRECTION. The first pass looked for hexes INSIDE gradient
//     declarations and found none in c-14's page — because the page declares
//     `--c1: #667eea` and the gradient says `var(--c1)`. Scanning the
//     declaration missed the value. Colours are collected from the whole file
//     now, not from the syntax that happens to use them.
//
// ─────────────────────────────────────────────────────────────────────────────
// SCOPE
// ─────────────────────────────────────────────────────────────────────────────
// This catches a named, specific register. It cannot tell whether a page is
// GOOD. A green run means no prompt prescribes a signature palette and no
// prompt asks for vague quality instead of a concrete instruction; it does not
// mean the library is well designed. Reviewing that means looking at the pages.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { COMMUNITY_PROMPTS } from '../../src/data/communityPrompts.js'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const PAGES = path.join(ROOT, 'public/previews/prompts')

// Specific ramps that are AI-generation signatures. This is NOT "purple is
// banned" — it is a short list of exact values that appear on thousands of
// generated pages, so specifying one is a decision to look like all of them.
const SIGNATURE_COLOURS = {
  '#667eea': 'the canonical AI hero gradient, with #764ba2',
  '#764ba2': 'the canonical AI hero gradient, with #667eea',
  '#f093fb': 'the pink stop of the canonical AI hero gradient',
}

// Vague quality standing in for a concrete instruction. Deliberately SHORT.
// "elegant serif typography" and "a dark, intimate room" are real design
// direction and are not here; a filter that flags those gets ignored.
const VAGUE_QUALITY = [
  'premium', 'stunning', 'breathtaking', 'gorgeous', 'mesmerising',
  'mesmerizing', 'jaw-dropping', 'wow factor', 'eye-catching', 'cutting-edge',
  'state-of-the-art', 'luxurious', 'next-level', 'world-class',
]

// INSTRUCTIONS TO FABRICATE. The category the first version of this filter
// missed entirely, and the one that matters most.
//
// c-5 ("Fitness trainer landing page") mandated invented proof in THREE of its
// seven sections — "Before/after transformation photos with stats", "Instagram
// feed embed, and 5-star review count", and a final CTA "with urgency
// ('Limited spots available')". No honest output could follow that brief. The
// first pass caught none of it: "5-star" is hyphenated so it missed a rating
// pattern written for "4.8 stars", "Limited spots" was not among the urgency
// phrases, and there was no pattern at all for invented before/after results.
//
// These are about what a prompt ORDERS a model to invent. A page that shows
// clearly-labelled sample quotes for a clearly fictional business is honest
// demo content and is not what these match.
const FABRICATION = [
  {
    // A PRE-SPECIFIED rating only. A ratings COMPONENT is ordinary commerce
    // UI — c-9 asks for a 'Star rating summary' on a product page and a real
    // shop fills it with real reviews, so that is not an instruction to
    // fabricate. c-5 asked for a '5-star review count', which pre-decides the
    // flattering answer before anyone has said anything. The number is the
    // difference, and it is the whole difference.
    re: /\b\d+(?:\.\d)?[-\s]?stars?\b|\b\d(?:\.\d)?\s*\/\s*5\b/i,
    what: 'a star rating or review count',
    why: 'a rating is a claim about what other people said; inventing one is inventing testimony',
  },
  {
    re: /\bbefore\s*(?:\/|and|-)\s*after\b[^.]{0,60}\b(stat|result|number|figure|transformation)/i,
    what: 'before/after results',
    why: 'invented outcome figures are the most consequential fabrication on a health or money page',
  },
  {
    re: /\b(limited|only)\s+(spots?|seats?|places?|slots?)\b|\boffer ends\b|\bcountdown\b|\bact now\b|\bhurry\b(?!\s+[-—,])/i,
    what: 'manufactured scarcity',
    why: 'urgency that is not an operational fact is pressure invented to convert',
  },
  {
    re: /\b(instagram|twitter|facebook|tiktok)\s*(feed|embed)|\bsocial (feed|proof) embed\b/i,
    what: 'an embedded social feed',
    why: 'it can only be filled with a real account\'s content or a fake one',
  },
  {
    re: /\b(trusted by|as seen (in|on)|featured in)\b|\b\d[\d,]*\+?\s*(happy|satisfied)\s*(customers|clients)/i,
    what: 'borrowed or invented third-party endorsement',
    why: 'names a third party who has not endorsed anything',
  },
]

// Words that turn a mention into a prohibition. A term inside this window is
// being named as the thing NOT to do.
const NEGATORS = /\b(avoid|avoids|avoiding|never|not|no|don'?t|do not|rather than|instead of|except|unless|without|ban|banned|forbid|forbidden|we do not|refuse)\b/i

/**
 * Is this hit a counter-example rather than an instruction?
 * Looks backwards from the match for a negator in the same sentence-ish window.
 */
function isProscribed(text, index) {
  const windowStart = Math.max(0, index - 160)
  const before = text.slice(windowStart, index)
  // Only the last sentence fragment counts — a negator three sentences back is
  // about something else.
  const lastBreak = Math.max(before.lastIndexOf('. '), before.lastIndexOf('\n'))
  const sentence = lastBreak >= 0 ? before.slice(lastBreak) : before
  return NEGATORS.test(sentence)
}

function findPrescribed(text, needle) {
  const hits = []
  const low = text.toLowerCase()
  const n = needle.toLowerCase()
  let at = low.indexOf(n)
  while (at !== -1) {
    if (!isProscribed(text, at)) hits.push(at)
    at = low.indexOf(n, at + n.length)
  }
  return hits
}

test('the prompt library parses and is the size we think', () => {
  assert.ok(Array.isArray(COMMUNITY_PROMPTS))
  assert.equal(COMMUNITY_PROMPTS.length, 20)
  for (const p of COMMUNITY_PROMPTS) {
    assert.ok(p.id && p.title && p.text, `${p.id}: missing id, title or text`)
  }
})

test('no prompt PRESCRIBES an AI-signature palette', () => {
  const offences = []
  for (const p of COMMUNITY_PROMPTS) {
    for (const [hex, why] of Object.entries(SIGNATURE_COLOURS)) {
      if (findPrescribed(p.text, hex).length) {
        offences.push(`${p.id} "${p.title}" specifies ${hex} — ${why}`)
      }
    }
  }
  assert.deepEqual(offences, [],
    'a prompt hardcodes a palette that makes every output of it look ' +
    'generated:\n  ' + offences.join('\n  ') +
    '\n\nNaming one as the thing to AVOID is fine and is not flagged; ' +
    'specifying one as the palette to USE is not.')
})

test('no prompt asks for vague quality instead of a concrete instruction', () => {
  const offences = []
  for (const p of COMMUNITY_PROMPTS) {
    for (const word of VAGUE_QUALITY) {
      if (findPrescribed(p.text, word).length) {
        offences.push(`${p.id} "${p.title}" asks for "${word}"`)
      }
    }
  }
  assert.deepEqual(offences, [],
    'a prompt asks a model for a feeling rather than for a decision:\n  ' +
    offences.join('\n  ') +
    '\n\n"premium feel" tells a model nothing it can act on and produces the ' +
    'average of its training data, which is the look being complained about. ' +
    'Say the thing instead — the palette, the measure, the reference class.')
})

test('no prompt INSTRUCTS a model to fabricate proof', () => {
  const offences = []
  for (const p of COMMUNITY_PROMPTS) {
    for (const rule of FABRICATION) {
      const m = rule.re.exec(p.text)
      if (!m) continue
      if (isProscribed(p.text, m.index)) continue // "Do not invent a review count"
      offences.push(`${p.id} "${p.title}" asks for ${rule.what} ("${m[0].trim()}") — ${rule.why}`)
    }
  }
  assert.deepEqual(offences, [],
    'a prompt orders the model to invent proof, so no honest output can follow ' +
    'it:\n  ' + offences.join('\n  ') +
    '\n\nClearly-labelled sample content for a clearly fictional business is ' +
    'fine and is not matched here. What is matched is a brief that REQUIRES ' +
    'a rating, a result, a scarcity claim or a borrowed endorsement to exist.')
})

test('the fabrication rules actually fire — proved on the brief that failed them', () => {
  // THE GUARD ON THE GUARD, and it is not hypothetical: this is c-5's real
  // text as it shipped until 2026-09-15. If a future edit to the patterns
  // stops catching this, the rules have decayed into decoration.
  const OLD_C5 = [
    '2. Problem/Solution: Before/after transformation photos with stats.',
    '4. Social proof: Client transformations slider, Instagram feed embed, and 5-star review count.',
    "7. Final CTA: Repeated booking CTA with urgency (\"Limited spots available\").",
  ].join('\n')

  const caught = FABRICATION.filter((r) => {
    const m = r.re.exec(OLD_C5)
    return m && !isProscribed(OLD_C5, m.index)
  }).map((r) => r.what)

  for (const expected of ['a star rating or review count', 'before/after results',
    'manufactured scarcity', 'an embedded social feed']) {
    assert.ok(caught.includes(expected),
      `the rules no longer catch "${expected}" in c-5's original brief; caught: ${caught.join(', ')}`)
  }

  // …and the negation carve-out must not swallow them. The REFINED c-5 says
  // "Do not invent a review count, a star rating, ..." and must stay clean.
  const refined = COMMUNITY_PROMPTS.find((x) => x.id === 'c-5')
  const stillFlagged = FABRICATION.filter((r) => {
    const m = r.re.exec(refined.text)
    return m && !isProscribed(refined.text, m.index)
  }).map((r) => r.what)
  assert.deepEqual(stillFlagged, [],
    `the refined c-5 is being flagged for naming these as forbidden: ${stillFlagged.join(', ')}`)
})

test('the generated preview pages carry no signature palette either', () => {
  if (!fs.existsSync(PAGES)) return // the pages are built separately
  const offences = []
  for (const f of fs.readdirSync(PAGES).filter((x) => x.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(PAGES, f), 'utf8')
    for (const [hex, why] of Object.entries(SIGNATURE_COLOURS)) {
      // The whole file, not the gradient declaration: these pages define
      // `--c1: #667eea` and then write `var(--c1)`.
      if (findPrescribed(html, hex).length) offences.push(`${f} uses ${hex} — ${why}`)
    }
  }
  assert.deepEqual(offences, [],
    'a published preview page paints an AI-signature gradient:\n  ' +
    offences.join('\n  '))
})

test('the negation rule works, or every test above is worth less than it looks', () => {
  // The guard on the guard. If isProscribed() ever returned false for
  // everything, the three tests above would still pass on today's content and
  // would have quietly become stricter than intended; if it returned true for
  // everything they would pass on ANY content, which is worse.
  const prescribes = 'Use a gradient from #667eea to #764ba2 across the hero.'
  const proscribes = 'Avoid the indigo to violet gradient (#667eea / #764ba2) — it looks generated.'

  assert.equal(findPrescribed(prescribes, '#667eea').length, 1,
    'a palette being INSTRUCTED must be caught')
  assert.equal(findPrescribed(proscribes, '#667eea').length, 0,
    'a palette named as the thing to AVOID must not be caught')

  // And the window really is a window: a negator in an earlier sentence must
  // not excuse a later instruction.
  const distant = 'Never use drop shadows. The hero gradient runs #667eea to #764ba2.'
  assert.equal(findPrescribed(distant, '#667eea').length, 1,
    'a negator in a PREVIOUS sentence must not excuse a later instruction')
})
