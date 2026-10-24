// The prompt library must read as ten different briefs, not one template.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS IS SEPARATE FROM prompt-library-slop.test.js
// ─────────────────────────────────────────────────────────────────────────────
// That test checks words (a banned palette, vague quality) and fabrication.
// A rewrite of c-1 to c-10 passed it cleanly yet read more AI-generated than
// the version it replaced: every prompt opened "Build a X, in a single HTML file, for Y", used the same
// Look / Page / Motion / Rules / "Done when:" headings, repeated the same
// sentences, and spent its lines on prohibitions. No word in it was banned.
// The slop was in the shape, and a word list cannot see a shape.
//
// scripts/prompt-voice-check.mjs measures the shape. This file asserts that the
// real library clears it, and, because a check that has never been seen to fail
// proves nothing, that it fails on a set written the way the rewrite was.
//
// ─────────────────────────────────────────────────────────────────────────────
// SCOPE
// ─────────────────────────────────────────────────────────────────────────────
// A pass means no template fingerprint was found: it does not mean the prompts
// are good. The thresholds were set against the library as it stood on
// main (the voice to keep) and the rejected rewrite
// (which must fail); read the prompts to judge the rest.
import test from 'node:test'
import assert from 'node:assert/strict'
import { COMMUNITY_PROMPTS } from '../../api/_lib/library/communityPrompts.js'
import {
  scorePrompts, passes, TEMPLATE_PHRASES, SET_PASS, PROMPT_PASS,
} from '../../scripts/prompt-voice-check.mjs'

// c-1 to c-10 are the prompts under review; the rest are older and unrelated.
const REVIEWED = COMMUNITY_PROMPTS
  .filter((p) => /^c-([1-9]|10)$/.test(p.id))
  .map((p) => ({ id: p.id, text: p.text }))

const describe = (result) => [
  ...result.set.findings.filter((f) => f.penalty).map((f) => `set: -${f.penalty} ${f.what}`),
  ...result.prompts.filter((p) => p.score < PROMPT_PASS)
    .map((p) => `${p.id}: ${p.score} ${p.findings.map((f) => f.what).join('; ')}`),
].join('\n  ')

test('the prompt library has the ten prompts the voice check reads', () => {
  assert.equal(REVIEWED.length, 10)
})

test('the library reads as a set, not a template', () => {
  const result = scorePrompts(REVIEWED)
  assert.ok(result.set.score >= SET_PASS,
    `set scores ${result.set.score}, under ${SET_PASS}:\n  ${describe(result)}`)
})

test('every prompt clears the voice check on its own', () => {
  const result = scorePrompts(REVIEWED)
  const low = result.prompts.filter((p) => p.score < PROMPT_PASS)
  assert.deepEqual(low.map((p) => p.id), [],
    `prompts under ${PROMPT_PASS}:\n  ${describe(result)}`)
})

// ── THE GUARD ON THE GUARD ─────────────────────────────────────────────────
// Four short texts in the rejected rewrite's shape: the same opening, the same
// five headings, the demonstration sentence, a "Done when:" line. If a future
// edit to the thresholds lets these through, the check has decayed into
// decoration.
const STAMPED = ['a florist', 'a bakery', 'a tide chart', 'a bike repair shop'].map((who, i) => ({
  id: `stamped-${i + 1}`,
  text: [
    `Build a one-page website, in a single HTML file, for ${who}. Invent the rest and commit to it.`,
    'Look',
    '- Warm paper page, near-black ink, one accent colour.',
    'Page',
    '1. Hero with the name and one line.',
    '2. Details in a short list.',
    'Motion',
    'One moment: the heading fades up on load. Nothing loops. Under prefers-reduced-motion nothing moves.',
    'Rules',
    '- No photographs or external images.',
    '- The form validates inline and confirms that this is a demonstration and nothing was sent.',
    'Done when: the hero shows without scrolling at 390 and 1440.',
  ].join('\n'),
}))

// Four texts that share no skeleton, no opening and no pasted sentence.
const VARIED = [
  {
    id: 'varied-1',
    text: [
      'Design a landing page for Dev Aranda, a one-to-one strength coach in Brunswick.',
      'Palette and type',
      'Chalk white with a barbell-black headline and one rust accent. Condensed sans for the name, a plain grotesque for everything else.',
      'The first screen is his name set huge over a photo-free drawing of a loaded bar. Under it, three programmes with a weekly price each, and a booking form for a first session.',
      'The bar drifts down a few pixels as the page loads, then rests.',
    ].join('\n'),
  },
  {
    id: 'varied-2',
    text: [
      'The pricing page for Cronwright, which pages you when a scheduled job misses its run.',
      'Three plans in a row, the middle one wider. Each shows what it watches, how often it checks and what it costs per month in dollars.',
      'Buying column',
      'Sticky on desktop. A seat slider changes the total, and the plan names change colour as you pass a limit.',
      'Below',
      'A comparison table with ticks drawn as small clocks.',
    ].join('\n'),
  },
  {
    id: 'varied-3',
    text: [
      'Make the four-screen first run of Swell, a surf forecast app for the east coast of Australia.',
      'Screen one asks for a break, screen two for a board length, screen three for the wind you can stand, and screen four shows the first forecast. Swipe sideways between them.',
      'Wave height is drawn as a line that grows with the swell. Use a deep green sea and a pale foam white, with the period in a monospaced face.',
    ].join('\n'),
  },
  {
    id: 'varied-4',
    text: [
      'A listing page for 14 Rosella Street, Coburg, sold by a small agency. The street map is drawn, and the rooms are shown as a floor plan you can tap.',
      'The data is the design:',
      'Land size, rates and the last sale sit in a plain two-column ledger with tabular figures.',
      'Inspection times are chips for the next three Saturdays. Choosing one fills the enquiry form.',
    ].join('\n'),
  },
]

test('a set written in the rewrite\'s shape fails', () => {
  const result = scorePrompts(STAMPED)
  assert.ok(result.set.score < SET_PASS,
    `a stamped set scored ${result.set.score}; the check should fail it:\n  ${describe(result)}`)
  assert.ok(!passes(result))
  const kinds = result.set.findings.filter((f) => f.penalty).map((f) => f.what).join('\n')
  assert.match(kinds, /share the heading list/, 'the shared skeleton must be named')
})

test('a varied set passes', () => {
  const result = scorePrompts(VARIED)
  assert.ok(passes(result), `a varied set was failed:\n  ${describe(result)}`)
})

test('one house phrase in one prompt is a voice; the same phrase in three is a stamp', () => {
  const phrase = TEMPLATE_PHRASES.find((t) => t.minPrompts)
  assert.ok(phrase, 'at least one template phrase is counted only when it repeats')
  const once = scorePrompts([
    { id: 'a', text: `${phrase.phrase}. A bakery in Fitzroy.` },
    { id: 'b', text: 'A tide chart for Newcastle.' },
    { id: 'c', text: 'A bike repair shop in Coburg.' },
  ])
  assert.equal(once.prompts[0].score, 10)
  const thrice = scorePrompts(['a', 'b', 'c'].map((id) => ({ id, text: `${phrase.phrase}. Different place ${id}.` })))
  assert.ok(thrice.prompts.every((p) => p.score < 10))
})
