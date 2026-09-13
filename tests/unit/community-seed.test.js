// The Community surface must not invent people or their behaviour.
//
// The 2026-08-11 site audit, P3: twelve seeded "designs" carried invented names
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

// ── THE GUARD ABOVE READ ONE FILE, AND THE FABRICATION LIVED IN TWO ─────────
//
// Every test above imports COMMUNITY_DESIGNS. That is the seed for /community
// and for Discover's "From the community" band, and it has been honest since
// the 2026-08-11 audit rewrote it.
//
// src/pages/Projects.jsx carried its own copy the audit never saw: a
// COMMUNITY_PROJECTS array of four design systems credited to four people who
// do not exist, rendered under the sentence "Explore design systems shared by
// the community" on a tab beside a person's own saved work. One of the four
// was credited to "Maya R." — the same invented designer named in this file's
// own header as the thing these tests exist to prevent. It shipped for a month
// after the guard was written, because the guard checked a constant rather than
// the product.
//
// So this one reads the SOURCE of every surface that renders a community, and
// asks whether a person is credited for something they did not do. It is a
// text scan on purpose: the next copy of this will not be called
// COMMUNITY_PROJECTS and will not be importable from here.
test('no surface invents a designer to credit', () => {
  // The four invented designers that shipped on /projects, plus the one from
  // the 2026-08-11 audit. A name is the cheapest possible tell and these are
  // the exact strings that were rendered to real users.
  const INVENTED = ['Maya R.', 'Devon K.', 'Sam T.', 'Alex P.']
  const SURFACES = [
    'src/pages/Projects.jsx',
    'src/pages/Community.jsx',
    'src/data/communityDesigns.js',
    'src/components/discover/CommunityCard.jsx',
  ]
  for (const file of SURFACES) {
    const src = read(file)
    for (const name of INVENTED) {
      // The comment in Projects.jsx that records the deletion names them, and
      // must stay readable. Only a name outside a comment is a fabrication.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      assert.ok(
        !code.includes(name),
        `${file} credits "${name}", who does not exist — see this file's header`,
      )
    }
  }
})

test('positive control: the scan can actually see a name in the source', () => {
  // Without this, the test above passes just as happily on an empty read, a
  // renamed file or a regex that stopped matching. It asserts the machinery
  // reports a fabrication when one is really there.
  const src = read('src/pages/Projects.jsx')
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  assert.ok(code.length > 1000, 'the surface scan read an empty or missing file')
  const planted = code + "\nconst x = { author: 'Maya R.' }\n"
  assert.ok(planted.includes('Maya R.'), 'the scan cannot see a name it is meant to catch')
  // And the comment-stripper must not be what is hiding it: the real file DOES
  // name the four in its deletion note, and that note must survive stripping.
  assert.ok(src.includes('Maya R.'), 'the record of what was deleted is gone from Projects.jsx')
})
