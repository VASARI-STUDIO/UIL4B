// The brand kit walkthrough's step model.
//
// THE ASSERTION THIS FILE EXISTS FOR is the first one: every step must point at
// a Create tool that RENDERS. That is not a hypothetical. The flow shipped with
// step one pointing at `/create/color`, which stopped being a tool — App.jsx
// routes it to ColorLanding, the colour sales page — so pressing "Build a brand
// kit" set a flag and dropped the visitor on a page of links with no step bar
// and no step one. Nothing failed, because nothing was checking. This is the
// check, modelled on first-win.test.js and user-home.test.js, which already
// guard their own route lists the same way.
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  BRAND_KIT_STEPS,
  endGuide,
  firstIncompleteStep,
  guideEntry,
  guideProgress,
  guideSteps,
  introSeen,
  isGuideActive,
  markIntroSeen,
  nextStep,
  startGuide,
  stepArtefacts,
  stepById,
} from '../../src/utils/brandKitGuide.js'
import { liveToolRoutes, CREATE_HOMES_THAT_RENDER } from '../../src/data/toolTree.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { SYSTEM_PARTS } from '../../src/utils/userHome.js'

/** A design with real work in the named parts, built off the defaults. */
function designWith({ palette, fonts, scale } = {}) {
  const d = JSON.parse(JSON.stringify(DEFAULT_DESIGN))
  if (palette) d.palette.colors = ['#112233', '#445566', '#778899']
  if (fonts) d.fonts.heading = { family: 'Fraunces', weight: 700, category: 'serif' }
  if (scale) d.typeScale.base = 18
  return d
}

/** A Storage-shaped object, so the flag helpers can be tested without a DOM. */
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    get size() { return map.size },
  }
}

test('every step points at a Create tool that renders', () => {
  const live = new Set(liveToolRoutes())
  // A category HOME that only redirects is not a step: landing on one bounces
  // the visitor straight back out of the flow. `/create/color` is in
  // CREATE_HOMES_THAT_RENDER — it renders — and it is STILL not a tool, which is
  // exactly why "renders" is not the test and "is a live tool" is.
  const homes = new Set(CREATE_HOMES_THAT_RENDER)
  for (const step of BRAND_KIT_STEPS) {
    assert.ok(
      live.has(step.path),
      `step "${step.id}" points at ${step.path}, which is not a live Create tool. `
      + 'That is how the walkthrough shipped landing on the colour sales page.',
    )
    assert.ok(
      !homes.has(step.path),
      `step "${step.id}" points at ${step.path}, a category home rather than a tool`,
    )
  }
})

test('the guard above sees a real population, so it cannot pass by finding nothing', () => {
  assert.equal(BRAND_KIT_STEPS.length, 4)
  assert.ok(liveToolRoutes().length > 4)
})

test('each step names a part the User Home already measures, or nothing', () => {
  const ids = new Set(SYSTEM_PARTS.map((p) => p.id))
  for (const step of BRAND_KIT_STEPS) {
    if (step.part === null) continue
    assert.ok(ids.has(step.part), `step "${step.id}" names part "${step.part}", which SYSTEM_PARTS does not`)
  }
  // Icons is the one with no field in the saved design. If that ever changes,
  // this line is the reminder to stop injecting `iconsTouched`.
  assert.deepEqual(BRAND_KIT_STEPS.filter((s) => s.part === null).map((s) => s.id), ['icons'])
})

test('an untouched design has nothing built', () => {
  const { done, total, complete } = guideProgress(DEFAULT_DESIGN)
  assert.equal(done, 0)
  assert.equal(total, 4)
  assert.equal(complete, false)
})

test('progress is derived from the saved design, not counted', () => {
  const steps = guideSteps(designWith({ palette: true, scale: true }))
  assert.deepEqual(
    steps.map((s) => [s.id, s.done]),
    [['color', true], ['fonts', false], ['typescale', true], ['icons', false]],
  )
  // Nothing was "advanced" — the type scale is done and fonts, which sits
  // BEFORE it, is not. A cursor could not represent that; a reading can.
  assert.equal(firstIncompleteStep(designWith({ palette: true, scale: true })).id, 'fonts')
})

test('icons are injected, because the design has no field for them', () => {
  const design = designWith({ palette: true })
  assert.equal(guideSteps(design).at(-1).done, false)
  assert.equal(guideSteps(design, { iconsTouched: true }).at(-1).done, true)
  assert.equal(guideProgress(design, { iconsTouched: true }).done, 2)
})

test('a finished system reports complete and has no next gap', () => {
  const design = designWith({ palette: true, fonts: true, scale: true })
  const { done, complete } = guideProgress(design, { iconsTouched: true })
  assert.equal(done, 4)
  assert.equal(complete, true)
  assert.equal(firstIncompleteStep(design, { iconsTouched: true }), null)
})

test('the rail carries what each step produced, so step four can see step one', () => {
  const design = designWith({ palette: true, fonts: true, scale: true })
  const art = stepArtefacts(design)
  assert.deepEqual(art.color.colors, ['#112233', '#445566', '#778899'])
  assert.equal(art.fonts.text, 'Fraunces / Inter')
  assert.equal(art.typescale.text, '18px · 1.25')
})

test('one family for both roles reads as one name, not "Inter / Inter"', () => {
  assert.equal(stepArtefacts(DEFAULT_DESIGN).fonts.text, 'Inter')
})

test('swatches are capped, because the rail renders them in a chip', () => {
  const design = JSON.parse(JSON.stringify(DEFAULT_DESIGN))
  design.palette.colors = ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777']
  assert.equal(stepArtefacts(design).color.colors.length, 5)
})

test('a fresh start opens step one even when the design already has colours', () => {
  // The founder's instruction is literal: "build a brand kit should go straight
  // into step 1". Starting the kit is a decision to go through the whole thing.
  const entry = guideEntry(designWith({ palette: true, fonts: true }), { active: false })
  assert.equal(entry.resume, false)
  assert.equal(entry.step.id, 'color')
  assert.equal(entry.path, BRAND_KIT_STEPS[0].path)
})

test('pressing it again mid-flow resumes at the first gap', () => {
  const entry = guideEntry(designWith({ palette: true }), { active: true })
  assert.equal(entry.resume, true)
  assert.equal(entry.step.id, 'fonts')
  assert.equal(entry.path, '/create/font-pair')
})

test('resuming a finished system falls back to step one rather than nowhere', () => {
  const design = designWith({ palette: true, fonts: true, scale: true })
  const entry = guideEntry(design, { active: true, iconsTouched: true })
  assert.equal(entry.step.id, 'color')
})

test('step lookup and ordering', () => {
  assert.equal(stepById('typescale').label, 'Type scale')
  assert.equal(stepById('nope'), null)
  assert.equal(nextStep('color').id, 'fonts')
  assert.equal(nextStep('icons'), null)
  assert.equal(nextStep('nope'), null)
})

test('the flow flag survives a tab, because a brand system is not one sitting', () => {
  const storage = fakeStorage()
  assert.equal(isGuideActive(storage), false)
  startGuide(storage)
  assert.equal(isGuideActive(storage), true)
  assert.equal(storage.getItem('vs-uikit-guide'), '1')
  endGuide(storage)
  assert.equal(isGuideActive(storage), false)
})

test('leaving the flow does NOT forget that the card was shown', () => {
  // Re-entering should not re-teach someone who has already read it.
  const storage = fakeStorage()
  startGuide(storage)
  markIntroSeen(storage)
  endGuide(storage)
  assert.equal(introSeen(storage), true)
})

test('a storage that throws is survivable, and reads as a first-time visitor', () => {
  // localStorage THROWS rather than returning empty where a browser is set to
  // block site data. The correct behaviour with no stored value is the one a
  // first-time visitor gets, so every helper has to reach it without raising.
  const hostile = {
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
    removeItem() { throw new Error('blocked') },
  }
  assert.equal(isGuideActive(hostile), false)
  assert.equal(introSeen(hostile), false)
  assert.doesNotThrow(() => startGuide(hostile))
  assert.doesNotThrow(() => markIntroSeen(hostile))
  assert.doesNotThrow(() => endGuide(hostile))
})

test('a missing or malformed design is read as nothing built, never as a crash', () => {
  for (const bad of [null, undefined, {}, { palette: null }, { palette: { colors: 'nope' } }]) {
    assert.doesNotThrow(() => guideProgress(bad))
    assert.equal(guideProgress(bad).done, 0)
  }
})
