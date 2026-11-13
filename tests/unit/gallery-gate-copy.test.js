// Every gallery gate's copy is built from live counts, never typed.
//
// To see it fail: type a number into a heading or body in src/data/galleryGateCopy.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import { GALLERY_GATE_COPY, libraryGateCopy } from '../../src/data/galleryGateCopy.js'
import { LIBRARY_TOTALS } from '../../src/data/libraryTotals.js'

// Counts no real library holds, so a typed number cannot pass by coincidence.
const SHOWN = 7311
const TOTAL = 9127
const OPENS = 8419
const MORE = TOTAL - SHOWN

for (const name of ['iconGroups', 'prompts']) {
  test(`${name}: the signed-out gate states the counts it is given`, () => {
    const { anon } = GALLERY_GATE_COPY[name]
    assert.match(anon.heading(OPENS), /^Log in to access 8,419 /)
    const body = anon.body(SHOWN, TOTAL, OPENS)
    assert.match(body, /^You're seeing 7,311 of the 9,127 /)
    assert.ok(body.includes('A free account opens 8,419'), body)
    assert.equal(anon.action, 'Log in')
    assert.equal(anon.secondary, 'See the plans')
  })

  test(`${name}: the Pro gate states the counts it is given and links to the plans`, () => {
    const { pro } = GALLERY_GATE_COPY[name]
    assert.equal(pro.heading(MORE), `Pro opens 1,816 more ${pro.heading(MORE).split(' ').slice(4).join(' ')}`)
    const body = pro.body(SHOWN, TOTAL, MORE)
    assert.ok(body.includes('7,311 of the 9,127') && body.includes('remaining 1,816'), body)
    assert.equal(pro.action, 'See what Pro includes')
  })

  test(`${name}: one item reads as a singular`, () => {
    const { anon, pro } = GALLERY_GATE_COPY[name]
    assert.doesNotMatch(anon.heading(1), /s$/)
    assert.doesNotMatch(pro.heading(1), /s$/)
  })
}

// The palette and gradient libraries' gate: every number is one the page counted
// (S shown, A account, T total, P Pro's extra, opens), except the library's own
// total, which the unknown-filter variant reads from LIBRARY_TOTALS.
const nounFor = (count) => (count === 1 ? 'thing' : 'things')
const COUNTS = { S: SHOWN, A: OPENS, T: TOTAL, P: MORE, opens: OPENS, nounFor }

for (const kind of ['palettes', 'gradients']) {
  test(`${kind}: the signed-out account gate states the counts it is given`, () => {
    const copy = libraryGateCopy(kind, { variant: 'account', anonymous: true, ...COUNTS })
    assert.equal(copy.heading, 'Log in to access 8,419 things')
    assert.equal(copy.body, "You're seeing 7,311 of the 9,127 things. A free account opens 8,419; Pro opens all 9,127.")
    assert.deepEqual(copy.primary, { label: 'Create a free account', action: 'signup' })
    assert.deepEqual(copy.secondary, { label: 'Log in', action: 'login' })
  })

  test(`${kind}: the Pro gate states the counts it is given and links to the plans`, () => {
    const free = libraryGateCopy(kind, { variant: 'more', anonymous: false, ...COUNTS })
    assert.equal(free.heading, '1,816 more things with Pro')
    assert.ok(free.body.startsWith("You're seeing 7,311 of the 9,127 things. Pro opens the remaining 1,816"), free.body)
    assert.deepEqual(free.primary, { label: 'Upgrade to Pro', action: 'plans' })
    assert.equal(free.secondary, undefined)
    const out = libraryGateCopy(kind, { variant: 'more', anonymous: true, ...COUNTS })
    assert.deepEqual(out.primary, { label: 'See what Pro includes', action: 'plans' })
    assert.deepEqual(out.secondary, { label: 'Log in', action: 'login' })
  })

  test(`${kind}: nothing open under the filter says the filter is part of Pro`, () => {
    const copy = libraryGateCopy(kind, { variant: 'pro-only', anonymous: false, ...COUNTS, S: 0 })
    assert.equal(copy.heading, 'Things are part of Pro')
    assert.equal(copy.body, 'Pro opens all 9,127 things.')
    assert.equal(libraryGateCopy(kind, { variant: 'pro-only', anonymous: false, ...COUNTS, S: 0, T: 1 }).heading, 'Thing is part of Pro')
  })

  test(`${kind}: a filter the locked rows cannot answer speaks for the whole library`, () => {
    const total = LIBRARY_TOTALS[kind].toLocaleString('en-AU')
    const out = libraryGateCopy(kind, { variant: 'unknown', anonymous: true, ...COUNTS })
    assert.equal(out.heading, 'Log in to access 8,419 ' + (kind === 'palettes' ? 'palettes' : 'gradients'))
    assert.ok(out.body.includes(`all ${total}`) && out.body.includes('opens 8,419'), out.body)
    const free = libraryGateCopy(kind, { variant: 'unknown', anonymous: false, ...COUNTS })
    assert.deepEqual(free.primary, { label: 'Upgrade to Pro', action: 'plans' })
    assert.ok(free.body.includes('opens 7,311 that match') && free.body.includes(`all ${total}`), free.body)
    assert.ok(!libraryGateCopy(kind, { variant: 'unknown', anonymous: false, ...COUNTS, S: 0 }).body.includes('opens 0'))
  })
}

test('icon groups: a locked group names its own icon count and sets', () => {
  const { locked } = GALLERY_GATE_COPY.iconGroups
  assert.equal(locked.pro.heading('Commerce'), 'Commerce is Pro')
  assert.equal(locked.pro.body(24, 'Solar · Phosphor'), '24 icons from Solar · Phosphor. Pro opens it.')
  assert.equal(locked.free.heading('Commerce'), 'Commerce needs a free account')
  assert.equal(locked.free.body(1, 'Solar'), '1 icon from Solar. A free account opens it.')
})
