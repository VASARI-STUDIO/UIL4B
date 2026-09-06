// Every `@media (prefers-reduced-motion: reduce)` block in global.css must
// carry the in-app override guard on every one of its selectors.
//
// THE CONTRACT, stated in AppearanceContext.jsx and repeated at every rule site
// in global.css: an explicit `data-reduced-motion` attribute beats the OS media
// query IN BOTH DIRECTIONS. A visitor who turns motion back ON inside the app
// still gets motion even when their OS says reduce; a visitor who turns it OFF
// gets it reduced even when their OS says nothing. That is why the house
// pattern is a PAIR, and why both halves are asserted here:
//
//   html[data-reduced-motion="true"] SEL{...}            <- the explicit choice
//   @media(prefers-reduced-motion:reduce){
//     html:not([data-reduced-motion="false"]) SEL{...}   <- the OS, unless overridden
//   }
//
// A BARE block reads the OS only, so the Settings toggle cannot reach it.
//
// #273 fixed the inverse of this: the boot script stamped a fabricated "false"
// for every visitor, so the guarded rules were dead code. #330 then verified
// the ten guarded sites in a rendered browser and, in recounting them, found
// that THIRTEEN of the file's twenty-three blocks carried no guard at all.
//
// MEASURED on `.skip-link` before the fix, transition-duration, three contexts:
//   OS reduce, no stored choice ....... 1e-05s  (the global clamp — correct)
//   OS no-preference, no choice ....... 0.2s    (motion plays — correct)
//   OS reduce, Settings set to MOTION .. 0s     (THE DEFECT)
// The third number is motion suppressed for someone who explicitly asked for
// it. After the fix that context measures 0.2s, matching the motion-on control.
//
// The companion half was broken too, and only for the properties the global
// clamp at the top of the file cannot reach — it forces durations and delays to
// near-zero but does not touch `opacity` or `transform`. Measured with OS
// no-preference and Settings set to REDUCE, before the fix: `.landing-reveal`
// sat at opacity 0 / translateY(22px) and `.lbry-card-actions` at
// translateY(4px). Both now flatten. That is why the companion is asserted
// rather than left to the clamp.
//
// `.landing-reveal` NO LONGER EXISTS. It belonged to src/pages/Landing.jsx,
// the orphaned predecessor homepage, which was deleted along with its 156
// selectors — five reduced-motion guard PAIRS among them, taking the file from
// 28 blocks to 23. The measurement above is kept because it is the evidence
// for why the companion half is asserted at all, and that argument does not
// depend on the site still shipping; `.lbry-card-actions` is the live half of
// it. The floor in test 1 is unchanged and still clears: it is a vacuity guard,
// not a ratchet on any particular count.
//
// DELIBERATELY NOT A RATCHET. An allowlist of the thirteen would have made the
// suite green while permanently blessing the defect. This asserts the whole
// file unconditionally, so block twenty-four cannot ship bare.
//
// The rendered half — that the rules actually fire, and that nothing breaks
// under reduced motion — is recorded on `reduced-motion-rendered-verification`.
// This file guards the shape of the stylesheet, which is the cheap half.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const RAW = fs.readFileSync(path.join(process.cwd(), 'src/styles/global.css'), 'utf8')

// Comments are stripped FIRST, newlines preserved so line numbers survive.
// This header and the prose blocks throughout global.css are themselves full of
// `prefers-reduced-motion` and of the guard string; without this, a bare block
// could be "proved" guarded by a comment sitting above it. A previous mutation
// run on tests/unit/input-specificity.test.js found exactly that failure.
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))

const lineOf = (index) => CSS.slice(0, index).split('\n').length

const GUARD = 'html:not([data-reduced-motion="false"])'
const EXPLICIT = 'html[data-reduced-motion="true"]'

/** Split a selector list on top-level commas only. */
function splitSelectors(list) {
  const out = []
  let depth = 0
  let buf = ''
  for (const ch of list) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    if (ch === ',' && depth === 0) {
      out.push(buf)
      buf = ''
    } else buf += ch
  }
  out.push(buf)
  return out.map((s) => s.trim()).filter(Boolean)
}

/** Index of the `}` matching the `{` at `open`. */
function matchBrace(src, open) {
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}' && --depth === 0) return i
  }
  return -1
}

/** Top-level `selector { ... }` rules inside a block body. */
function topLevelRules(body, offset) {
  const rules = []
  let i = 0
  while (i < body.length) {
    const open = body.indexOf('{', i)
    if (open === -1) break
    const close = matchBrace(body, open)
    if (close === -1) break
    const prelude = body.slice(i, open)
    // Nested at-rules (@supports, a nested @media) are descended into rather
    // than treated as one selector.
    if (prelude.trim().startsWith('@')) {
      rules.push(...topLevelRules(body.slice(open + 1, close), offset + open + 1))
    } else if (prelude.trim()) {
      rules.push({ prelude, index: offset + i })
    }
    i = close + 1
  }
  return rules
}

/** Every `@media` block whose condition mentions prefers-reduced-motion. */
function reducedMotionBlocks() {
  const blocks = []
  const re = /@media[^{]*prefers-reduced-motion[^{]*\{/g
  let m
  while ((m = re.exec(CSS)) !== null) {
    const open = m.end ? m.end : re.lastIndex - 1
    const braceAt = re.lastIndex - 1
    const close = matchBrace(CSS, braceAt)
    blocks.push({
      line: lineOf(m.index),
      condition: m[0].trim(),
      body: CSS.slice(braceAt + 1, close),
      bodyOffset: braceAt + 1,
    })
    re.lastIndex = close + 1
    void open
  }
  return blocks
}

/**
 * Strip the guard (in either form, bare or wrapped in `:where()`) off the front
 * of a selector, leaving the part that names the actual element. Used to pair a
 * media-query rule with its explicit-attribute companion.
 */
function remainder(selector, token) {
  const withWhere = `:where(${token})`
  let s = selector.trim()
  if (s.startsWith(withWhere)) s = s.slice(withWhere.length)
  else if (s.startsWith(token)) s = s.slice(token.length)
  else return null
  return s.trim().replace(/\s+/g, ' ')
}

const BLOCKS = reducedMotionBlocks()

test('1 · global.css actually contains reduced-motion blocks to guard', () => {
  // Without this the two assertions below pass vacuously on an empty set —
  // deleting every block, or breaking the block parser, would look like success.
  assert.ok(
    BLOCKS.length >= 20,
    `expected the stylesheet to still carry its reduced-motion blocks, found ${BLOCKS.length}`,
  )
  const rules = BLOCKS.flatMap((b) => topLevelRules(b.body, b.bodyOffset))
  assert.ok(rules.length >= BLOCKS.length, 'every block should contain at least one rule')
})

test('2 · every prefers-reduced-motion selector carries the in-app override guard', () => {
  const bare = []
  for (const block of BLOCKS) {
    for (const rule of topLevelRules(block.body, block.bodyOffset)) {
      for (const sel of splitSelectors(rule.prelude)) {
        if (!sel.includes(GUARD)) {
          bare.push(`  global.css:${lineOf(rule.index)}  ${sel}`)
        }
      }
    }
  }
  assert.deepEqual(
    bare,
    [],
    'These reduced-motion selectors read the OS only, so the in-app motion toggle\n'
      + `cannot reach them. Prefix each with \`${GUARD}\`:\n${bare.join('\n')}`,
  )
})

test('3 · every guarded selector has an explicit-attribute companion rule', () => {
  // The media half covers "OS says reduce". The companion covers "the visitor
  // said reduce while the OS said nothing" — which the global clamp only
  // half-covers, because it reaches durations and delays but not opacity or
  // transform. Both halves are required for the both-directions contract.
  const companions = new Set()
  const ruleRe = /(^|[{};])([^{};]*)\{/g
  let m
  while ((m = ruleRe.exec(CSS)) !== null) {
    if (!m[2].includes(EXPLICIT)) continue
    for (const sel of splitSelectors(m[2])) {
      const r = remainder(sel, EXPLICIT)
      if (r !== null) companions.add(r)
    }
  }

  const orphans = []
  for (const block of BLOCKS) {
    for (const rule of topLevelRules(block.body, block.bodyOffset)) {
      for (const sel of splitSelectors(rule.prelude)) {
        const r = remainder(sel, GUARD)
        if (r === null) continue // reported by test 2
        if (!companions.has(r)) {
          orphans.push(`  global.css:${lineOf(rule.index)}  ${sel}`)
        }
      }
    }
  }
  assert.deepEqual(
    orphans,
    [],
    'These reduced-motion rules fire for the OS preference but not for a visitor\n'
      + `who chose reduced motion in Settings. Add an \`${EXPLICIT}\` companion:\n${orphans.join('\n')}`,
  )
})
