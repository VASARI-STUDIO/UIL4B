// THE EXAMPLES ANSWERED A QUESTION THE USER WAS NOT ASKING.
//
// `SETS` in fontScenes.js keys on what a family IS — sans, serif, mono. For a
// sans that is `['ui', 'datatable', 'form']`, which is right when you are
// choosing body copy and wrong in a specific way when you are choosing a
// HEADING: open the dossier from the "Heading family" picker on Inter and every
// example is an interface, a data table and a form. Not one headline.
//
// Founder, 2026-09-14: "for the heading family examples popup show it more in
// heading uses."
//
// `scenesFor(font, 'heading')` now leads with the display scenes and KEEPS the
// role scenes after them — a heading face still has to survive a label
// somewhere, and answering one question by deleting another is not an
// improvement. Without the argument the order is byte-for-byte what it was, so
// the Font Gallery and the body picker are untouched.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scenesFor } from '../../src/utils/fontScenes.js'

const ids = (font, intent) => scenesFor(font, intent).map((s) => s.id)

const SANS = { family: 'Inter', category: 'sans-serif', variants: [400, 700] }
const SERIF = { family: 'Lora', category: 'serif', variants: [400, 700] }
const MONO = { family: 'Roboto Mono', category: 'monospace', variants: [400, 700] }

test('a heading dossier leads with scenes a heading is actually used in', () => {
  const head = ids(SANS, 'heading')
  assert.deepEqual(head.slice(0, 3), ['poster', 'titlecard', 'atsmall'])
  // The role scenes survive, after them.
  assert.deepEqual(head.slice(3), ['ui', 'datatable', 'form'])
})

test('a serif heading gets a masthead where a sans gets a title card', () => {
  // Not a new opinion: this is the same shape rule the display branch of
  // sceneIdsFor already applies, reused rather than restated differently.
  assert.equal(ids(SERIF, 'heading')[1], 'masthead')
  assert.equal(ids(SANS, 'heading')[1], 'titlecard')
  assert.equal(ids(MONO, 'heading')[1], 'titlecard')
})

test('`atsmall` is always in a heading set, because it is the counterweight', () => {
  // It is the scene that shows where a display face STOPS working and why a
  // body face is still needed. A heading panel without it is a sales pitch.
  for (const font of [SANS, SERIF, MONO]) {
    assert.ok(ids(font, 'heading').includes('atsmall'), `${font.family} lost atsmall`)
  }
})

test('no scene is repeated when a family already leads with display scenes', () => {
  const display = { family: 'Anton', category: 'display', variants: [400] }
  const head = ids(display, 'heading')
  assert.equal(new Set(head).size, head.length, `duplicate scene in ${head.join(', ')}`)
})

test('without the argument nothing moves — every other caller is untouched', () => {
  // POSITIVE CONTROL for the whole file. If `intent` leaked into the default
  // path, the assertions above would still pass while the Font Gallery and the
  // body picker silently changed. These are the pre-change orders.
  assert.deepEqual(ids(SANS), ['ui', 'datatable', 'form'])
  assert.deepEqual(ids(SERIF), ['article', 'column', 'pullquote'])
  assert.deepEqual(ids(MONO), ['code', 'terminal', 'figures'])
  // …and an explicit non-heading intent must behave like no intent at all.
  assert.deepEqual(ids(SANS, 'body'), ids(SANS))
})

test('a missing font does not throw and returns nothing to render', () => {
  assert.deepEqual(scenesFor(null, 'heading'), [])
  assert.deepEqual(scenesFor(undefined), [])
})
