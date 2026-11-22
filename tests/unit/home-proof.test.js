// THE PROOF BAR: WHERE ITS FOUR FIGURES COME FROM.
//
// Every figure is a fact about the product, counted, never typed. Three are the
// sizes of the Discover palettes, the Discover gradients and the Icon Library's
// sets (PROOF_STATS). The fourth is the tool count beside the total of the
// bookmarks section's four folders. The product measures no usage, so no figure
// may claim anything about other people.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertStripperWorks, read, stripComments } from './helpers/source-text.js'
import { TOOL_COUNT } from '../../src/components/spectrum/spectrumFacts.js'
import { BOOKMARK_COUNT, BOOKMARK_FOLDERS } from '../../src/components/home/bookmarkFolders.js'
import { PROOF_ROWS, STATS } from '../../src/components/home/proofStats.js'
import { PROOF_STATS } from '../../src/components/spectrum/spectrumFacts.js'
import { ICON_PACK_TIERS } from '../../src/data/iconPackTiers.js'

const SRC = {
  stats: stripComments(read('src/components/home/proofStats.js')),
  folders: stripComments(read('src/components/home/bookmarkFolders.js')),
  proof: stripComments(read('src/components/home/HomeProof.jsx')),
  css: read('src/styles/pages/home-proof.css').replace(/\/\*[\s\S]*?\*\//g, ''),
}

test('the stripper still works, so every source read below can be trusted', () => {
  assertStripperWorks(assert)
})

const FREE_PACKS = Object.values(ICON_PACK_TIERS).filter((p) => p.tier !== 'paid').length

test('the three library counts are the ones PROOF_STATS counts, with no usage claim', () => {
  assert.deepEqual(STATS, PROOF_STATS.slice(1).map(({ value, label }) => ({ n: value, label })))
  assert.deepEqual(STATS.map((s) => s.label), [
    'palettes in the Discover library',
    'gradients in the Discover library',
    `icon sets in the Icon Library, ${FREE_PACKS} on the free plan`,
  ])
  assert.ok(FREE_PACKS < Object.keys(ICON_PACK_TIERS).length, 'some icon sets are Pro, so the label must say how many are free')
  for (const s of STATS) assert.ok(Number.isInteger(s.n) && s.n > 0, `${s.label} has no count`)
  for (const s of PROOF_ROWS) {
    assert.doesNotMatch(s.label, /people|since launch|exported|saved|users|visitors/i, `"${s.label}" claims usage the product does not measure`)
  }
})

test('no count is typed in proofStats.js or HomeProof.jsx', () => {
  // Mutation: type a number back into STATS, e.g. `{ n: 186, label: ... }`.
  assert.doesNotMatch(SRC.stats, /\bn:\s*\d/, 'proofStats.js types a figure')
  assert.match(SRC.stats, /PROOF_STATS\.slice\(1\)/)
  for (const n of STATS.map((s) => s.n)) {
    assert.ok(!new RegExp(`\b${n}\b`).test(SRC.proof), `HomeProof.jsx types ${n}`)
  }
  assert.ok(SRC.proof.includes('PROOF_ROWS.map'), 'HomeProof.jsx no longer renders the rows from proofStats.js')
})

test('"26" is the total of the four bookmark folders, and "13" is the tool count', () => {
  assert.equal(BOOKMARK_FOLDERS.length, 4)
  assert.deepEqual(BOOKMARK_FOLDERS.map((f) => f.count), [10, 6, 4, 6])
  assert.equal(BOOKMARK_COUNT, BOOKMARK_FOLDERS.reduce((sum, f) => sum + f.count, 0))
  assert.equal(BOOKMARK_COUNT, 26)

  const derived = PROOF_ROWS[3]
  assert.equal(PROOF_ROWS.length, 4)
  assert.equal(derived.n, TOOL_COUNT)
  assert.equal(derived.label, `tools in place of ${BOOKMARK_COUNT} bookmarks`)

  // Neither number is typed anywhere it is shown.
  assert.ok(!/\b26\b/.test(SRC.stats) && !/\b26\b/.test(SRC.proof), 'a "26" is typed rather than summed from the folders')
  assert.ok(!/\b13\b/.test(SRC.stats) && !/\b13\b/.test(SRC.proof), 'a "13" is typed rather than read from TOOL_COUNT')
  assert.ok(!/\b26\b/.test(SRC.folders), 'bookmarkFolders.js types the total instead of summing it')
  assert.ok(SRC.stats.includes('TOOL_COUNT') && SRC.stats.includes('BOOKMARK_COUNT'))
})

test('the figure comes first in each item, in a list that keeps its role', () => {
  assert.match(SRC.proof, /<ul role="list"/)
  assert.match(SRC.proof, /<li key=\{row\.label\}><strong>\{row\.n\}<\/strong> \{row\.label\}<\/li>/)
})

test('the section is headed by one h2 that takes focus, under the #proof anchor', () => {
  assert.match(SRC.proof, /<section id="proof"[^>]*aria-labelledby="proof-h"/)
  assert.equal([...SRC.proof.matchAll(/<h2\b/g)].length, 1)
  assert.match(SRC.proof, /<h2 id="proof-h"[^>]*tabIndex=\{-1\}>Small, and built in Brisbane\.<\/h2>/)
})

test('nothing counts up, listens or animates', () => {
  for (const [file, src] of Object.entries({ 'HomeProof.jsx': SRC.proof, 'proofStats.js': SRC.stats })) {
    assert.ok(!/requestAnimationFrame|IntersectionObserver|setInterval|setTimeout|useEffect|addEventListener/.test(src),
      `${file} has a timer, an observer or a listener; the figures are printed as they are`)
  }
  assert.ok(!/@keyframes|animation\s*:|transition\s*:/.test(SRC.css), 'home-proof.css animates something')
})

test('no rule draws a line above or below the section', () => {
  const TOKENS = read('src/styles/pages/home-tokens.css').replace(/\/\*[\s\S]*?\*\//g, '')
  const PLANS = read('src/styles/pages/home-plans.css').replace(/\/\*[\s\S]*?\*\//g, '')
  const block = (css, sel) => (css.match(new RegExp(`${sel.replace(/[.#]/g, '\\$&')}\\s*\\{([^}]*)\\}`)) || [])[1] || ''
  // Mutation: put `border-top` (or a shadow, outline or background rule) back on `.hp`.
  const hp = block(SRC.css, '.hp')
  assert.ok(hp.length > 0, 'the .hp block was not found')
  assert.doesNotMatch(hp, /(^|[;{\s])(border[a-z-]*|box-shadow|outline)\s*:/)
  // Mutation: restore the shared top rule on `#plans` (the line under the proof bar) in home-tokens.css, or a border on `.hpl`.
  assert.doesNotMatch(TOKENS, /#plans[^{]*\{[^}]*(^|[;{\s])border[a-z-]*\s*:/)
  assert.doesNotMatch(TOKENS, /\.sp-proof/)
  assert.doesNotMatch(TOKENS, /--hm-hairline/)
  assert.doesNotMatch(block(PLANS, '.hpl'), /(^|[;{\s])border[a-z-]*\s*:/)
  // The pixel the old top rule took stays as padding, so neither section changes height.
  assert.match(hp, /padding-top:\s*calc\(var\(--section-y-compact\) \+ 1px\)/)
  assert.match(block(PLANS, '.hpl'), /padding-top:\s*calc\(var\(--section-y\) \+ 1px\)/)
})

test('the compact section token is the only vertical space, and the last phone row is flat', () => {
  assert.match(SRC.css, /\.hp\s*\{[^}]*padding:\s*var\(--section-y-compact\)\s+var\(--gutter-x\)/)
  assert.match(SRC.css, /\.hp-l li:nth-child\(n \+ 3\)\s*\{[^}]*padding-bottom:\s*0[^}]*border-bottom:\s*0/)
})
