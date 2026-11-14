// The shared upgrade popup is plain text: no uppercase mono label, no eyebrow,
// no em dashes in its copy, and the money lines say what is actually charged
// and when. These are source scans, because .jsx cannot be loaded here.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripJs } from '../helpers/strip-comments.js'

const SRC = path.join(process.cwd(), 'src')
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8').replace(/\r\n/g, '\n')

const MODAL = stripJs(read('components/ProUpgradeModal.jsx'))
const CSS = read('styles/v3-pro-gate.css').replace(/\/\*[\s\S]*?\*\//g, ' ')

// Every `.pg-*` rule in the popup sheet: { selector, body }. Rules inside an
// @media block match too, because a selector cannot contain `{`.
const rules = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, selector, body]) => ({ selector: selector.trim(), body }))
  .filter(({ selector }) => /\.pg-/.test(selector))

test('the rule scan finds the popup rules at all', () => {
  // Positive control: every assertion below loops over these.
  assert.ok(rules.length >= 30, `only ${rules.length} .pg rules found; the scan is not parsing the sheet`)
})

test('the popup has no eyebrow and no feature ticks', () => {
  assert.ok(!/\beyebrow\b/.test(MODAL), 'the popup reads an eyebrow option again')
  assert.ok(!/Tick\b/.test(MODAL) && !/pg-tick/.test(MODAL), 'a tick is back before the feature lines')
})

test('no popup label is uppercase', () => {
  const upper = rules.filter(({ body }) => /text-transform\s*:\s*uppercase/.test(body)).map((r) => r.selector)
  assert.deepEqual(upper, [], 'these popup rules uppercase their text')
})

test('mono in the popup is for literal values only', () => {
  // A hex, the seed hex, a size in the subtitle and a size in a caption.
  const allowed = new Set(['.pg-cap code, .pg-hex', '.pg-seed', '.pg-sub code'])
  const mono = rules
    .filter(({ body }) => /font-family\s*:\s*var\(--mono\)/.test(body))
    .map((r) => r.selector.replace(/\s+/g, ' '))
    .filter((s) => !allowed.has(s))
  assert.deepEqual(mono, [], 'these popup rules set a label or caption in mono')
})

test('the saving reads "Save N%" and the popup copy has no em dash', () => {
  assert.ok(/Save \$\{save\}%/.test(MODAL), 'the saving no longer reads "Save N%"')
  assert.ok(!/[—]|&mdash;/.test(MODAL), 'ProUpgradeModal.jsx prints an em dash')
})

test('the money lines say what is charged and when', () => {
  assert.match(MODAL, /label: 'Today', fig: money\(0, plan\)/)
  assert.match(MODAL, /The first payment, for \$\{span\}\./)
  // A yearly line is "nothing more to pay", never "free".
  assert.match(MODAL, /Nothing more to pay for \$\{plan\.months\} months\./)
  assert.ok(!/12 months[^`']*\bfree\b/i.test(MODAL), 'a yearly line calls the year free')
  assert.match(MODAL, /Monthly has no trial, so the first payment is taken today\./)
  assert.match(MODAL, /Keep every tool open and every export clean\. Free stays free\. Pro removes the limits\./)
})

test('the three icon gates have their own titles', () => {
  assert.match(MODAL, /'icon-line-style':\s*\{\s*title: 'Export icons in Sharp and Crisp'/)
  assert.match(MODAL, /'icon-export-size':\s*\{\s*title: 'Export icons at any size'/)
  assert.match(MODAL, /'icon-pro-preview':\s*\{\s*title: 'Export your Pro settings'/)
  // A title or subtitle a caller passes still wins over the table.
  assert.match(MODAL, /title = gateCopy\.title \|\| /)
  assert.match(MODAL, /subtitle = gateCopy\.subtitle \|\| /)
})

test('every pill goes to /plans, never to checkout', () => {
  assert.match(MODAL, /\/plans\?plan=/)
  assert.ok(!/['"`]\/checkout/.test(MODAL), 'the popup sends people to /checkout directly')
  assert.match(MODAL, /Opening plans…/)
})
