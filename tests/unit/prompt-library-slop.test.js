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
