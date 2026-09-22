// The User Home's reading of a project, and the routing decision in front of it.
//
// Everything asserted here is the half of the feature that can be wrong WITHOUT
// anything failing: a progress display that ticks all four parts for a project
// nobody has touched, a metric that prints a zero, a suggestion pointing at a
// tool that is not live, or a first-paint decision that waits on Firebase.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { liveToolRoutes } from '../../src/data/toolTree.js'
import {
  SYSTEM_PARTS, partsPresent, projectDigest, mostRecentProject,
  nextToolSuggestion, homeStats, relativeTime, pickForDay, strideFor,
  partsLabel, paletteBands,
} from '../../src/utils/userHome.js'
import {
  SESSION_HINT_KEY, readSessionHint, writeSessionHint, rootDestination,
} from '../../src/utils/sessionHint.js'
import { SIGNED_IN_HOME } from '../../src/utils/onboardingState.js'

const clone = (o) => JSON.parse(JSON.stringify(o))

/** A project saved by someone who never touched anything. */
const untouched = (over = {}) => ({
  id: 'p1', name: 'Default Project', design: clone(DEFAULT_DESIGN),
  createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T10:00:00.000Z', ...over,
})

/** A project with real work in every one of the four parts. */
function complete(over = {}) {
  const design = clone(DEFAULT_DESIGN)
  design.palette.colors = ['#0F172A', '#1E40AF', '#38BDF8', '#F8FAFC']
  design.fonts.heading.family = 'Fraunces'
  design.fonts.body.family = 'Inter'
  design.typeScale.base = 17
  design.typeScale.ratio = 1.333
  design.tints.scale = ['#000', '#111', '#222']
  return { id: 'p2', name: 'Harbour', design, createdAt: '2026-09-02T10:00:00.000Z', updatedAt: '2026-09-04T10:00:00.000Z', ...over }
}

/* ── what is in a project ──────────────────────────────────────── */

test('an untouched project reports NOTHING built, not everything built', () => {
  // The defect this whole comparison exists to prevent. Every saved project
  // carries a full design object, so "does typeScale exist?" is true for all of
  // them and the progress row would be four ticks on every card.
  const present = partsPresent(untouched().design)
  assert.deepEqual(present, { palette: false, 'type-scale': false, fonts: false, tints: false })
  const digest = projectDigest(untouched())
  assert.equal(digest.done, 0)
  assert.equal(digest.total, 4)
  assert.equal(digest.missing.length, 4)
})

test('a fully built project reports all four', () => {
  const digest = projectDigest(complete())
  assert.equal(digest.done, 4)
  assert.deepEqual(digest.missing, [])
  assert.equal(digest.next, null)
})

test('colours but no type scale says exactly that — the founder\u2019s example', () => {
  const design = clone(DEFAULT_DESIGN)
  design.palette.colors = ['#112233', '#445566', '#778899']
  const digest = projectDigest({ id: 'x', name: 'Half done', design })
  assert.equal(digest.parts.find((p) => p.id === 'palette').done, true)
  assert.equal(digest.parts.find((p) => p.id === 'type-scale').done, false)
  assert.equal(digest.next.id, 'type-scale')
  assert.deepEqual(digest.missing.map((m) => m.id), ['type-scale', 'fonts', 'tints'])
})

test('a single deliberate brand colour counts as a palette; the default seed does not', () => {
  const seeded = clone(DEFAULT_DESIGN)
  seeded.palette.colors = ['#0051FF']
  assert.equal(partsPresent(seeded).palette, false, 'the untouched seed is not a decision')

  const chosen = clone(DEFAULT_DESIGN)
  chosen.palette.colors = ['#E9FF64']
  assert.equal(partsPresent(chosen).palette, true, 'one colour that is not the seed IS a decision')

  // Case must not decide it.
  const lower = clone(DEFAULT_DESIGN)
  lower.palette.colors = ['#0051ff']
  assert.equal(partsPresent(lower).palette, false)
})

test('the parts read is derived from the defaults, not from hard-coded values', () => {
  // Move the defaults and the answer must move with them. This is the property
  // that makes it safe to change DEFAULT_DESIGN without silently making every
  // progress display wrong.
  const shifted = clone(DEFAULT_DESIGN)
  shifted.typeScale.base = 17
  shifted.fonts.heading.family = 'Fraunces'

  const design = clone(DEFAULT_DESIGN)
  design.typeScale.base = 17
  // 17 is a real choice against the SHIPPED defaults …
  assert.equal(partsPresent(design).typeScale ?? partsPresent(design)['type-scale'], true)
  // … and is the untouched value against the shifted ones.
  assert.equal(partsPresent(design, shifted)['type-scale'], false)
})

test('a malformed or absent project never throws', () => {
  for (const bad of [null, undefined, {}, { design: null }, { design: { palette: 'nope' } }]) {
    const digest = projectDigest(bad)
    assert.equal(digest.total, 4)
    assert.ok(Array.isArray(digest.colors))
  }
})

/* ── the sentence on the card ───────────────────────────────────── */

test('THE FOUNDER’S SENTENCE: colours but no type scale says so, in words', () => {
  // “progress, so a project with colours but no type scale says so”. This is the
  // string that requirement becomes, and it was the one thing in this feature
  // that mutation testing found uncovered: breaking partsLabel so it always
  // returned ‘All four parts’ left the entire unit suite green.
  const design = clone(DEFAULT_DESIGN)
  design.palette.colors = ['#112233', '#445566', '#778899']
  design.fonts.heading.family = 'Fraunces'
  design.tints.scale = ['#111', '#222']
  assert.equal(partsLabel(projectDigest({ id: 'x', name: 'x', design })), 'No type scale')
})

test('several gaps read as a list, and a complete system says so', () => {
  const design = clone(DEFAULT_DESIGN)
  design.palette.colors = ['#112233', '#445566']
  assert.equal(partsLabel(projectDigest({ id: 'x', name: 'x', design })),
    'No type scale, fonts or tints')
  assert.equal(partsLabel(projectDigest(complete())), 'All four parts')
})

test('an untouched project is not given a list of everything it lacks', () => {
  // ‘No palette, type scale, fonts or tints’ is technically correct and reads as
  // a telling-off — and it is the state every project starts in.
  assert.equal(partsLabel(projectDigest(untouched())), 'Nothing built yet')
  assert.equal(partsLabel(null), 'All four parts', 'a missing digest must not throw')
})

test('a palette is drawn with hard stops, so no colour is invented between two', () => {
  const colours = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF']
  const css = paletteBands(colours)
  assert.match(css, /^linear-gradient\(90deg,/)

  // Every colour carries TWO positions of its own — CSS's multi-position colour
  // stop. That is what makes it a hard stop rather than a blend: a plain
  // two-stop gradient from #FF0000 to #00FF00 paints a wide band of browns that
  // are in nobody's palette, and the card would be showing colours the project
  // does not contain.
  const stops = css.replace(/^linear-gradient\(90deg, /, '').replace(/\)$/, '').split(', ')
  assert.equal(stops.length, colours.length, 'one stop per colour, no interpolation stops')
  stops.forEach((stop, i) => {
    assert.match(stop, /^#[0-9A-F]{6} \d+\.\d\d% \d+\.\d\d%$/, `stop ${i} is not a hard stop`)
    assert.ok(stop.startsWith(colours[i]), `stop ${i} should be ${colours[i]}`)
  })

  // And the bands tile the full width exactly: each one starts where the last
  // ended, the first at 0 and the last at 100. A gap would show the card
  // background through the palette; an overlap would hide a colour.
  const edges = stops.map((s) => s.match(/([\d.]+)% ([\d.]+)%$/).slice(1, 3).map(Number))
  assert.equal(edges[0][0], 0)
  assert.equal(edges[edges.length - 1][1], 100)
  for (let i = 1; i < edges.length; i += 1) {
    assert.equal(edges[i][0], edges[i - 1][1], `band ${i} does not start where band ${i - 1} ended`)
  }
})

test('an empty palette degrades to a token, never to an invalid CSS value', () => {
  assert.equal(paletteBands([]), 'var(--bg-3)')
  assert.equal(paletteBands(null), 'var(--bg-3)')
  assert.equal(paletteBands([null, undefined]), 'var(--bg-3)')
})

/* ── the next-tool suggestion ──────────────────────────────────── */

test('every route a part or a suggestion can point at is a LIVE tool', () => {
  const live = new Set(liveToolRoutes())
  for (const part of SYSTEM_PARTS) {
    assert.ok(live.has(part.tool), `${part.id} points at ${part.tool}, which is not a live tool route`)
  }
  // Every branch of the suggestion, including the complete-system one.
  for (const projects of [[], [untouched()], [complete()]]) {
    const s = nextToolSuggestion(projects)
    assert.ok(live.has(s.to), `the suggestion pointed at ${s.to}, which is not a live tool route`)
  }
})

test('the suggestion names the real project and the real gap', () => {
  const s = nextToolSuggestion([complete({ name: 'Harbour' }), untouched({ name: 'Sketch', updatedAt: '2026-09-05T10:00:00.000Z' })])
  assert.match(s.reason, /Sketch/, 'it should name the project it is talking about')
  assert.equal(s.to, '/create/palette')
})

test('a complete system is sent to validate it, not to redo it', () => {
  const s = nextToolSuggestion([complete()])
  assert.equal(s.to, '/create/contrast')
  assert.match(s.reason, /Harbour/)
})

test('with nothing saved the suggestion is the palette, not a random tool', () => {
  assert.equal(nextToolSuggestion([]).to, '/create/palette')
  assert.equal(nextToolSuggestion(null).to, '/create/palette')
})

test('an archived project is never the one suggested against', () => {
  const archived = complete({ name: 'Old', archived: true, updatedAt: '2026-12-01T10:00:00.000Z' })
  assert.equal(mostRecentProject([archived, untouched()]).name, 'Default Project')
  assert.equal(mostRecentProject([archived]), null)
})

/* ── quick data tracking ─────────────────────────────────────── */

test('a figure with nothing behind it is not printed', () => {
  // The "0 saves" lesson from homepage-community-points-outward, enforced.
  const stats = homeStats([untouched()])
  const ids = stats.map((s) => s.id)
  assert.ok(ids.includes('projects'), 'one project is a real, countable fact')
  assert.ok(!ids.includes('parts'), 'zero parts built must not render as "0 system parts built"')
  for (const s of stats) assert.ok(s.value > 0, `${s.id} rendered a zero`)
})

test('no projects at all prints nothing whatsoever', () => {
  assert.deepEqual(homeStats([]), [])
  assert.deepEqual(homeStats(null), [])
})

test('the figures are counted off the same array the save cap counts', () => {
  const stats = homeStats([complete(), untouched()])
  const by = Object.fromEntries(stats.map((s) => [s.id, s]))
  assert.equal(by.projects.value, 2)
  // Archived records are included, because the cap includes them — the count
  // beside the allowance must not disagree with the rule that enforces it.
  assert.equal(homeStats([complete(), untouched({ archived: true })])[0].value, 2)
  assert.equal(by.colours.value, 4 + 1, 'four colours in the built one, the seed in the other')
  assert.equal(by.parts.value, 4, 'four parts built across the two')
  assert.equal(by.parts.of, 8, 'out of two projects x four parts')
})

/* ── relative time ─────────────────────────────────────────── */

test('relative time is coarse, singular-aware, and refuses to guess', () => {
  const now = Date.parse('2026-09-05T12:00:00.000Z')
  const at = (iso) => relativeTime(iso, now)
  assert.equal(at('2026-09-05T11:59:40.000Z'), 'just now')
  assert.equal(at('2026-09-05T11:59:00.000Z'), '1 minute ago')
  assert.equal(at('2026-09-05T11:30:00.000Z'), '30 minutes ago')
  assert.equal(at('2026-09-05T11:00:00.000Z'), '1 hour ago')
  assert.equal(at('2026-09-05T09:00:00.000Z'), '3 hours ago')
  assert.equal(at('2026-09-04T09:00:00.000Z'), '1 day ago')
  assert.equal(at('2026-09-01T09:00:00.000Z'), '4 days ago')
  // Past a week it becomes a date rather than arithmetic the reader must do.
  assert.ok(!/ago/.test(at('2026-07-01T09:00:00.000Z')))
  // Unparseable or in the future — say nothing rather than print a guess.
  assert.equal(at('not a date'), null)
  assert.equal(at(undefined), null)
  assert.equal(at('2026-09-06T09:00:00.000Z'), null)
})

/* ── the daily pick ────────────────────────────────────────── */

test('the daily pick is stable within a day and moves the next', () => {
  const list = Array.from({ length: 100 }, (_, i) => i)
  assert.deepEqual(pickForDay(list, 500, 2), pickForDay(list, 500, 2))
  assert.notDeepEqual(pickForDay(list, 500, 2), pickForDay(list, 501, 2))
})

test('the daily pick never repeats an item within one day', () => {
  const list = Array.from({ length: 12 }, (_, i) => i)
  for (let day = 0; day < 40; day += 1) {
    const picked = pickForDay(list, day, 4)
    assert.equal(new Set(picked).size, picked.length, `day ${day} picked a duplicate`)
  }
})

test('the stride is coprime with the list, so the rotation reaches everything', () => {
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b))
  for (let n = 3; n <= 130; n += 1) {
    assert.equal(gcd(strideFor(n), n), 1, `stride ${strideFor(n)} is not coprime with ${n}`)
  }
  // The real catalogue sizes this actually runs against.
  const reached = new Set()
  const list = Array.from({ length: 100 }, (_, i) => i)
  for (let day = 0; day < 100; day += 1) reached.add(pickForDay(list, day, 1)[0])
  assert.equal(reached.size, 100, 'a full cycle should reach every artefact')
})

test('an empty or short list degrades rather than throwing', () => {
  assert.deepEqual(pickForDay([], 3, 4), [])
  assert.deepEqual(pickForDay(null, 3, 4), [])
  assert.equal(pickForDay([1, 2], 3, 9).length, 2, 'never returns more than exists, never duplicates')
})

/* ── the first-paint routing decision ────────────────────────────── */

const memoryStore = (initial) => {
  const map = new Map(initial ? Object.entries(initial) : [])
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  }
}

test('the hint round-trips and clears', () => {
  const s = memoryStore()
  writeSessionHint(true, s)
  assert.equal(s.getItem(SESSION_HINT_KEY), '1')
  assert.equal(readSessionHint(s), true)
  writeSessionHint(false, s)
  assert.equal(s.getItem(SESSION_HINT_KEY), null)
  assert.equal(readSessionHint(s), false)
})

test('a hostile or absent store answers "signed out" rather than throwing', () => {
  const hostile = {
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
    removeItem() { throw new Error('blocked') },
  }
  assert.equal(readSessionHint(hostile), false)
  assert.doesNotThrow(() => writeSessionHint(true, hostile))
  assert.equal(readSessionHint(memoryStore({ 'vs-session': 'yes please' })), false, 'only the exact flag counts')
})

test('a signed-in visitor is routed to the User Home WITHOUT waiting for Firebase', () => {
  // The whole point: `loading` is still true, Firebase has not resolved, and the
  // decision is already correct. A wrong answer here is a measured ~1s of loader
  // in front of the signed-in front door (see the note in sessionHint.js).
  assert.equal(rootDestination({ loading: true, hint: true, appHome: SIGNED_IN_HOME }), SIGNED_IN_HOME)
  assert.equal(rootDestination({ loading: true, hint: false, appHome: SIGNED_IN_HOME }), '/home')
})

test('resolved auth always beats the hint, in both directions', () => {
  assert.equal(rootDestination({ loading: false, signedIn: false, hint: true, appHome: SIGNED_IN_HOME }), '/home',
    'a stale hint must not survive the truth')
  assert.equal(rootDestination({ loading: false, signedIn: true, hint: false, appHome: SIGNED_IN_HOME }), SIGNED_IN_HOME,
    'a first-ever sign-in on this browser has no hint yet and must still be routed')
})

test('the destination is whatever onboarding says, so a new account is not skipped past it', () => {
  assert.equal(rootDestination({ loading: false, signedIn: true, hint: true, appHome: '/onboarding' }), '/onboarding')
})

/* ── the routing contract, read off the source ──────────────────────── */

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

test('/home reaches the sales page without consulting auth at all', () => {
  // The founder's exception: "unless they click they home button or navigate to
  // specifly /home". The guarantee is structural — App.jsx answers /home in an
  // early return ABOVE the root decision, so there is no code path on which a
  // signed-in visitor at /home is redirected anywhere.
  const src = read('src/App.jsx')
  const homeBranch = src.indexOf("location.pathname === '/home'")
  const rootBranch = src.indexOf("location.pathname === '/'")
  assert.ok(homeBranch > -1 && rootBranch > -1)
  assert.ok(homeBranch < rootBranch, '/home must be answered before the root redirect can see it')
  // The /home BLOCK ITSELF, not everything between the two branches: unrelated
  // early returns sit in that gap and one of them is legitimately a <Navigate>,
  // so slicing to the root branch made this assert something it never meant.
  const end = src.indexOf('\n  }', homeBranch)
  assert.ok(end > homeBranch, 'the /home early return is no longer recognisable')
  const block = src.slice(homeBranch, end)
  assert.ok(!/Navigate|useAuth|authUser|authLoading|sessionHint/.test(block),
    '/home must render the sales page unconditionally — it must not read auth or redirect. '
    + 'This is the founder’s stated exception: “unless they click they home button or '
    + 'navigate to specifly /home”.')
})

test('the nav Home control still points at the sales page', () => {
  const nav = read('src/components/PillNav.jsx')
  assert.match(nav, /to="\/home"/, 'the nav logo / Home link must still reach /home')
})

test('the sales page never routes on auth, so nothing about it can flash', () => {
  // Kept from first-run-destination.test.js and load-bearing here: the routing
  // decision lives in App.jsx, made once from a synchronous hint, so the sales
  // page cannot re-route once auth resolves.
  //
  // Home.jsx was deleted on 2026-09-18; src/pages/Spectrum.jsx is the sales
  // page and it does read auth, to choose where its CTA points. Reading auth is
  // fine. ROUTING on it here is not.
  const sales = read('src/pages/Spectrum.jsx')
  assert.ok(!/<Navigate\b/.test(sales), 'the sales page renders a redirect of its own')
  assert.ok(!/useNavigate\(/.test(sales), 'the sales page navigates imperatively')
})
