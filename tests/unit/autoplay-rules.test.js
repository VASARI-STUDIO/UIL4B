// Which autoplay has the screen: the pure rules behind AutoplayOwner.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HERO_RATIO, TOUR_RATIO, createAutoplayStore, decideAutoplay, slotQualifies,
} from '../../src/components/home/autoplayRules.js'

test('the hero plays alone when it qualifies and the tour does not', () => {
  assert.deepEqual(decideAutoplay({ hero: true, tour: false, hidden: false }), { hero: true, tour: false })
})

test('the hero holds while the tour has the screen', () => {
  assert.deepEqual(decideAutoplay({ hero: true, tour: true, hidden: false }), { hero: false, tour: true })
})

test('a hidden tab holds both', () => {
  assert.deepEqual(decideAutoplay({ hero: true, tour: false, hidden: true }), { hero: false, tour: false })
  assert.deepEqual(decideAutoplay({ hero: false, tour: true, hidden: true }), { hero: false, tour: false })
})

test('nothing in view means nothing plays', () => {
  assert.deepEqual(decideAutoplay({ hero: false, tour: false, hidden: false }), { hero: false, tour: false })
})

test('the two never play at once, over every input', () => {
  for (const hero of [false, true]) for (const tour of [false, true]) for (const hidden of [false, true]) {
    const out = decideAutoplay({ hero, tour, hidden })
    assert.ok(!(out.hero && out.tour), `both play for ${JSON.stringify({ hero, tour, hidden })}`)
  }
})

test('the hero qualifies at 40% of its panel, the tour at 60% of its stage', () => {
  assert.equal(slotQualifies('hero', { ratio: HERO_RATIO }), true)
  assert.equal(slotQualifies('hero', { ratio: HERO_RATIO - 0.01 }), false)
  assert.equal(slotQualifies('tour', { ratio: TOUR_RATIO }), true)
  assert.equal(slotQualifies('tour', { ratio: TOUR_RATIO - 0.01 }), false)
  assert.equal(slotQualifies('tour', { ratio: HERO_RATIO }), false)
})

test('on a phone the hero also qualifies on 40% of a short screen', () => {
  // A 444px panel on a 664px screen: 40% of the screen is 265px, 40% of the
  // panel is 178px; the smaller one decides.
  const base = { ratio: 0.3, height: 444, viewportHeight: 664, phone: true }
  assert.equal(slotQualifies('hero', { ...base, rectHeight: 178 }), true)
  assert.equal(slotQualifies('hero', { ...base, rectHeight: 177 }), false)
  // A panel taller than the screen: 40% of the screen is the bar.
  const tall = { ratio: 0.3, height: 1000, viewportHeight: 500, phone: true }
  assert.equal(slotQualifies('hero', { ...tall, rectHeight: 200 }), true)
  assert.equal(slotQualifies('hero', { ...tall, rectHeight: 199 }), false)
})

test('off a phone the short-screen rule does not apply', () => {
  assert.equal(slotQualifies('hero', { ratio: 0.3, height: 1000, viewportHeight: 500, rectHeight: 500, phone: false }), false)
})

test('an unknown slot never qualifies', () => {
  assert.equal(slotQualifies('footer', { ratio: 1 }), false)
})

test('the store publishes only real changes and refuses unknown slots', () => {
  const store = createAutoplayStore(false)
  let calls = 0
  const off = store.subscribe(() => { calls += 1 })
  store.setInView('hero', true)
  assert.deepEqual(store.getSnapshot(), { hero: true, tour: false })
  store.setInView('hero', true)
  assert.equal(calls, 1, 'a repeat report notified subscribers')
  store.setInView('tour', true)
  assert.deepEqual(store.getSnapshot(), { hero: false, tour: true })
  store.setInView('tour', false)
  assert.deepEqual(store.getSnapshot(), { hero: true, tour: false })
  store.setHidden(true)
  assert.deepEqual(store.getSnapshot(), { hero: false, tour: false })
  off()
  assert.throws(() => store.setInView('footer', true), /unknown slot/)
})
