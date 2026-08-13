// The Community surface must not invent people or their behaviour.
//
// docs/audit-2026-08-11.md, P3: twelve seeded "designs" carried invented names
// ("Aurora Analytics"), invented designers ("Maya R."), and invented save
// counts (342, 318, 287…), each linking to a stock site's homepage — rendered
// by the same card as real member submissions, with nothing marking them apart.
//
// The audit called it "placeholder data on a page presented as a real
// community", which understates it. A save count is a claim about what other
// people did. Shipping fabricated ones to real users is the thing these tests
// exist to prevent coming back, whatever the seed data is next replaced with.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { COMMUNITY_DESIGNS, COMMUNITY_CATEGORIES } from '../../src/data/communityDesigns.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

test('no seeded item claims a save it did not receive', () => {
  // A visible zero is honest. An invented 342 is not, and it is not fixable
  // later by "replacing it with real data" — it has already been shown.
  for (const d of COMMUNITY_DESIGNS) {
    assert.equal(d.saves, 0, `${d.id} ships a fabricated save count of ${d.saves}`)
  }
})

test('no seeded item is credited to a person', () => {
  // `author` renders through <UserName>, which is the component for real
  // members. A curated link is credited to the platform it opens.
  for (const d of COMMUNITY_DESIGNS) {
    assert.equal(d.author, undefined, `${d.id} still credits an invented person: ${d.author}`)
    assert.ok(d.source, `${d.id} must name the platform it links to`)
  }
})

test('every seeded item is marked as curated, so the card can tell them apart', () => {
  for (const d of COMMUNITY_DESIGNS) {
    assert.equal(d.curated, true, `${d.id} would render as a member submission`)
  }
})

test('the card credits a platform for curated items and a member for submissions', () => {
  const src = read('src/components/discover/CommunityCard.jsx')
  assert.ok(/item\.curated/.test(src), 'the card must branch on curated')
  assert.ok(/item\.source/.test(src), 'a curated item is credited to its platform')
  assert.ok(/UserName/.test(src), 'a real submission is still credited to its author')
})

test('every link is a real absolute URL and every category is a known one', () => {
  for (const d of COMMUNITY_DESIGNS) {
    assert.match(d.url, /^https:\/\/[^\s]+\.[^\s]+$/, `${d.id} has an unusable url`)
    assert.ok(COMMUNITY_CATEGORIES.includes(d.category), `${d.id} has an unknown category ${d.category}`)
  }
})

test('ids are unique — they key both the save state and the React list', () => {
  const ids = COMMUNITY_DESIGNS.map(d => d.id)
  assert.equal(new Set(ids).size, ids.length)
})
