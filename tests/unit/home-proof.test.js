// THE PROOF BAR: WHERE ITS FOUR FIGURES COME FROM.
//
// Three of the figures are placeholders that ship on purpose, so they live in
// one array (STATS) and nowhere else, and real counts replace them in one edit.
// The fourth is a fact about the product: the tool count, and the total of the
// bookmarks section's four folders. Neither of those may be typed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertStripperWorks, read, stripComments } from './helpers/source-text.js'
import { TOOL_COUNT } from '../../src/components/spectrum/spectrumFacts.js'
import { BOOKMARK_COUNT, BOOKMARK_FOLDERS } from '../../src/components/home/bookmarkFolders.js'
import { PROOF_ROWS, STATS } from '../../src/components/home/proofStats.js'

const SRC = {
  stats: stripComments(read('src/components/home/proofStats.js')),
  folders: stripComments(read('src/components/home/bookmarkFolders.js')),
  proof: stripComments(read('src/components/home/HomeProof.jsx')),
  css: read('src/styles/pages/home-proof.css').replace(/\/\*[\s\S]*?\*\//g, ''),
}

test('the stripper still works, so every source read below can be trusted', () => {
  assertStripperWorks(assert)
})

test('the three placeholder counts are exactly the ones that ship, in one array', () => {
  assert.deepEqual(STATS.map((s) => s.n), [186, 540, 72])
  assert.deepEqual(STATS.map((s) => s.label), [
    'people have opened a tool since launch',
    'palettes, type scales and icon sets exported',
    'projects saved to come back to',
  ])
})

test('the three counts live only in STATS', () => {
  // proofStats.js types each count once, inside the STATS array.
  const word = (n, flags) => new RegExp(`\\b${n}\\b`, flags)
  for (const n of STATS.map((s) => s.n)) {
    const typed = [...SRC.stats.matchAll(word(n, 'g'))]
    assert.equal(typed.length, 1, `${n} is typed ${typed.length} times in proofStats.js; it should appear once, in STATS`)
    const statsBlock = /export const STATS = \[[\s\S]*?\n\]/.exec(SRC.stats)
    assert.ok(statsBlock && word(n).test(statsBlock[0]), `${n} is typed outside the STATS array`)
  }
  // The component and the stylesheet hold no copy of them.
  for (const n of STATS.map((s) => s.n)) {
    assert.ok(!word(n).test(SRC.proof), `HomeProof.jsx types ${n}`)
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

test('the compact section token is the only vertical space, and the last phone row is flat', () => {
  assert.match(SRC.css, /\.hp\s*\{[^}]*padding:\s*var\(--section-y-compact\)\s+var\(--gutter-x\)/)
  assert.match(SRC.css, /\.hp-l li:nth-child\(n \+ 3\)\s*\{[^}]*padding-bottom:\s*0[^}]*border-bottom:\s*0/)
})
