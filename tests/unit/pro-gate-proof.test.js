// The Pro wall's side panel must be about the thing the wall is selling.
//
// See src/utils/proGateProof.js for the defect this rule exists for: every
// wall in the product — icons, UI systems, type systems, gradients — opened
// onto the same column of colour harmonies, generated from a seed the caller
// never passed, because resolvePaletteSeed always finds one.
//
// These tests run the real predicate over the real gate ids, scraped from the
// real call sites, so a wall added later is judged by existing rather than by
// somebody remembering this file.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { showsColourRail, COLOUR_GATE_PREFIX } from '../../src/utils/proGateProof.js'

const SRC = fileURLToPath(new URL('../../src/', import.meta.url))

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full))
    else if (/\.jsx?$/.test(e.name)) out.push(full)
  }
  return out
}

// Every `gate: '...'` or `gate: \`...\`` literal handed to openProModal.
function gateIds() {
  const ids = new Set()
  for (const file of walk(SRC)) {
    const src = fs.readFileSync(file, 'utf8')
    if (!src.includes('openProModal')) continue
    for (const m of src.matchAll(/gate:\s*'([^']+)'/g)) ids.add(m[1])
    // Template ids: `icon-${kind}` → the fixed prefix is what decides the rule.
    for (const m of src.matchAll(/gate:\s*`([^`$]*)\$\{/g)) {
      if (m[1]) ids.add(m[1] + '<derived>')
    }
  }
  return [...ids].sort()
}

test('the codebase still has Pro gates to reason about', () => {
  const ids = gateIds()
  assert.ok(ids.length >= 8,
    `expected the gate ids to be findable at the call sites; found ${ids.length}: ${ids}`)
})

test('every colour wall gets the colour rail', () => {
  const colour = gateIds().filter((g) => g.startsWith(COLOUR_GATE_PREFIX))
  assert.ok(colour.length > 0, 'no palette gates found — has the naming changed?')
  for (const gate of colour) {
    assert.equal(showsColourRail({ gate }), true,
      `${gate} is a colour wall and must show the colour systems it sells`)
  }
})

test('no NON-colour wall shows colour as its proof', () => {
  const others = gateIds().filter((g) => !g.startsWith(COLOUR_GATE_PREFIX))
  assert.ok(others.length > 0,
    'every gate is a palette gate — this test can no longer fail, so re-point it')
  for (const gate of others) {
    assert.equal(showsColourRail({ gate }), false,
      `${gate} is not about colour, but the modal would open onto a column of ` +
      'colour harmonies generated from a seed this caller never passed. That ' +
      'panel has the shape of evidence and the content of decoration.')
  }
})

test('an explicit seed is a caller saying the wall IS about that colour', () => {
  // ExportPanel gates a document ABOUT a palette, and passes its first colour.
  // That is a non-palette gate that should still get the rail.
  assert.equal(showsColourRail({ gate: 'design-system-book-export', seed: '#0051FF' }), true)
  assert.equal(showsColourRail({ gate: 'design-system-book-export' }), false)
})

test('a missing or malformed gate never crashes, and never guesses', () => {
  // The modal must open even if a future caller forgets the gate. Failing
  // closed here means a missing rail, which is a smaller error than showing
  // the wrong evidence.
  assert.equal(showsColourRail(), false)
  assert.equal(showsColourRail({}), false)
  assert.equal(showsColourRail({ gate: null }), false)
  assert.equal(showsColourRail({ gate: 42 }), false)
  assert.equal(showsColourRail({ gate: '' }), false)
  assert.equal(showsColourRail({ seed: '' }), false, 'an empty seed is not a seed')
})

// 'the ExportPanel really does still pass a seed' is DELETED, as its own
// message said to do if intended: the export wall links to
// /plans rather than raising the modal, so there is no
// modal on that path to carry a colour rail.
