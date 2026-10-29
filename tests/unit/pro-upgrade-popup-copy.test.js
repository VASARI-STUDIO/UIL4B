// The shared upgrade popup is plain text: no uppercase mono label above the
// title, no uppercase mono plan names, no tick before every feature line, and no
// em dashes in its copy. These are source scans, because .jsx cannot be loaded
// here; each one fails against the markup the popup had before this change.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripJs } from '../helpers/strip-comments.js'

const SRC = path.join(process.cwd(), 'src')
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8').replace(/\r\n/g, '\n')

const MODAL = stripJs(read('components/ProUpgradeModal.jsx'))
const RAIL = stripJs(read('components/ProHarmonyPreview.jsx'))
const CSS = read('styles/global.css').replace(/\/\*[\s\S]*?\*\//g, ' ')

// Every `.ui-pro*` rule in the sheet: { selector, body }. Rules inside an
// @media block match too, because a selector cannot contain `{`.
const proRules = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, selector, body]) => ({ selector: selector.trim(), body }))
  .filter(({ selector }) => /\.ui-pro/.test(selector))

test('the rule scan finds the popup rules at all', () => {
  // Positive control: every assertion below loops over these.
  assert.ok(proRules.length >= 30, `only ${proRules.length} .ui-pro rules found; the scan is not parsing the sheet`)
})

test('the popup has no eyebrow and no feature ticks', () => {
  assert.ok(!/ui-pro-eyebrow/.test(MODAL), 'the eyebrow element is back in the popup')
  assert.ok(!/\beyebrow\b/.test(MODAL), 'the popup reads an eyebrow option again')
  assert.ok(!/Tick\b/.test(MODAL) && !/ui-pro-tick/.test(MODAL), 'a tick is back before the feature lines')
  assert.ok(!proRules.some(({ selector }) => /ui-pro-(eyebrow|tick)/.test(selector)), 'CSS for the eyebrow or tick is back')
})

test('no popup label is uppercase', () => {
  const upper = proRules.filter(({ body }) => /text-transform\s*:\s*uppercase/.test(body)).map((r) => r.selector)
  assert.deepEqual(upper, [], 'these popup rules uppercase their text')
})

test('mono in the popup is for literal values only', () => {
  // The seed hex, a size in the subtitle and a size in a proof caption.
  const allowed = new Set(['.ui-pro-rail-seed', '.ui-pro-sub code', '.ui-pro-proof-cap code'])
  const mono = proRules
    .filter(({ body }) => /font-family\s*:\s*var\(--mono\)/.test(body))
    .map((r) => r.selector)
    .filter((s) => !allowed.has(s))
  assert.deepEqual(mono, [], 'these popup rules set a label or caption in mono')
})

test('the plan names and the saving are sans, in sentence case', () => {
  const name = proRules.find((r) => r.selector === '.ui-pro-plan-name')
  assert.ok(name, 'no .ui-pro-plan-name rule')
  assert.match(name.body, /font-size\s*:\s*15px/)
  assert.match(name.body, /font-weight\s*:\s*560/)
  assert.ok(!/--mono|uppercase/.test(name.body), 'the plan name is mono or uppercase again')
  assert.ok(/Save \{save\}%/.test(MODAL), 'the saving no longer reads "Save N%"')
})

test('the popup copy has no em dash', () => {
  for (const [name, code] of [['ProUpgradeModal.jsx', MODAL], ['ProHarmonyPreview.jsx', RAIL]]) {
    assert.ok(!/[—]|&mdash;/.test(code), `${name} prints an em dash`)
  }
})

test('the steps and the default subtitle use colons and full stops', () => {
  assert.match(MODAL, /<strong>Today:<\/strong> create your account and confirm payment details\./)
  assert.match(MODAL, /<strong>Days 1 to \{choice\.trialDays\}:<\/strong> full Pro access\. Nothing is charged\./)
  assert.match(MODAL, /<strong>Day \{choice\.trialDays\}:<\/strong> \{choice\.totalLabel\} is charged, then /)
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

test('proof takes the rail slot only where there is no rail, and only when passed', () => {
  assert.match(MODAL, /const showProof = !showColourRail && !!proof/)
  assert.match(MODAL, /\{showProof && <div className="ui-pro-proof">\{proof\}<\/div>\}/)
  // No proof, no colour rail: the single-column layout, as before.
  assert.match(MODAL, /showColourRail \? '' : showProof \? ' ui-pro--proof' : ' ui-pro--norail'/)
})
