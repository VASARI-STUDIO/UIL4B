// Premade icon groups: the data, the style rule checked against real glyph
// data, who may open which group, and that a locked group (or a gated pack)
// is never requested.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { stripJs as strip } from '../helpers/strip-comments.js'
import {
  DEFAULT_GROUP_STROKE, GROUP_STROKES, GROUP_STYLE_PACKS, ICON_GROUPS_ROUTE, PREMADE_ICON_GROUPS,
  glyphRequestPlan, groupCount, groupNeeds, groupPacks, groupRoute, isGroupOpen, listIconGroups, parseIconRef,
  withProIcons,
} from '../../src/data/iconGroups.js'
import { resolveLibrary } from '../../api/_lib/library/load.js'
import { canSeePack, tierOf } from '../../src/data/iconPackTiers.js'
import { loadGroupGlyphs, glyphFor, resetGroupGlyphs } from '../../src/utils/iconGroupGlyphs.js'
import { groupFileNames, groupIconSvg, groupSprite } from '../../src/utils/iconGroupSvg.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const SNAPSHOT = JSON.parse(read('tests/unit/fixtures/icon-groups-snapshot.json'))
const TIERS = ['anon', 'free', 'paid']

// The Pro groups' icon lists come from the library resolver; the bundle holds
// only stubs. Under the fixtures source the lists are stand-ins borrowed from
// the free groups, so the checks against the real glyph data are skipped.
const LIBRARY = await resolveLibrary()
const GROUPS = withProIcons(LIBRARY.PRO_ICON_GROUPS)
const byId = (id) => GROUPS.find((g) => g.id === id) || null
const REAL = LIBRARY.source === 'pro'
const realOnly = { skip: !REAL && `library source "${LIBRARY.source}" holds stand-in icon lists` }

// ── The data ────────────────────────────────────────────────────────────────

test('there are eight to twenty groups, each of 16–32 distinct icons', () => {
  assert.ok(GROUPS.length >= 8 && GROUPS.length <= 20,
    `expected 8–20 groups, found ${GROUPS.length}`)
  const ids = GROUPS.map((g) => g.id)
  assert.equal(new Set(ids).size, ids.length, 'group ids must be unique')
  for (const g of GROUPS) {
    assert.match(g.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${g.id}: ids are URL-safe slugs`)
    assert.ok(g.label && typeof g.label === 'string', `${g.id}: needs a label`)
    assert.ok(g.icons.length >= 16 && g.icons.length <= 32, `${g.id}: ${g.icons.length} icons, expected 16–32`)
    assert.equal(new Set(g.icons).size, g.icons.length, `${g.id}: an icon is listed twice`)
    for (const ref of g.icons) assert.match(ref, /^[a-z0-9-]+:[a-z0-9-]+$/, `${g.id}: "${ref}" is not a pack:name id`)
  }
})

test('every group draws from more than one pack, and only from packs that meet the style rule', () => {
  // Under the fixtures source the Pro lists are stand-ins, so the stubs' declared packs are checked instead.
  for (const g of (REAL ? GROUPS : PREMADE_ICON_GROUPS)) {
    const packs = groupPacks(g)
    assert.ok(packs.length >= 2, `${g.id} draws from ${packs.join(', ')} only`)
    const outside = packs.filter((p) => !(p in GROUP_STYLE_PACKS))
    assert.deepEqual(outside, [], `${g.id} uses packs outside GROUP_STYLE_PACKS`)
    assert.deepEqual(g.style, { grid: 24, stroke: DEFAULT_GROUP_STROKE, cap: 'round', join: 'round' })
  }
  assert.ok(GROUP_STROKES.includes(DEFAULT_GROUP_STROKE))
})

test('two or three groups are free, Wayfinding is one of them, and the rest are Pro', () => {
  const free = GROUPS.filter((g) => g.access === 'free').map((g) => g.id)
  assert.ok(free.length >= 2 && free.length <= 3, `free groups: ${free.join(', ')}`)
  assert.ok(free.includes('wayfinding'))
  for (const g of GROUPS) assert.ok(['free', 'pro'].includes(g.access), `${g.id}: access "${g.access}"`)
})

test('the bundle holds the Pro groups as stubs: name, count and packs, no icon ids', () => {
  const pro = PREMADE_ICON_GROUPS.filter((g) => g.access === 'pro')
  assert.ok(pro.length >= 5)
  for (const g of pro) {
    assert.equal(g.icons, undefined, `${g.id}: the bundle carries a Pro icon list`)
    assert.ok(g.count >= 16 && g.count <= 32, `${g.id}: count ${g.count}`)
    assert.equal(groupCount(g), g.count)
    assert.ok(groupPacks(g).length >= 2, `${g.id}: packs ${groupPacks(g).join(', ')}`)
  }
  for (const g of PREMADE_ICON_GROUPS.filter((x) => x.access === 'free')) {
    assert.ok(Array.isArray(g.icons) && g.icons.length > 0, `${g.id}: a free group keeps its icons`)
    assert.equal(groupCount(g), g.icons.length)
  }
  // The resolver serves one row per stub, and each row's length is the stub's count.
  if (REAL) for (const g of pro) assert.equal(byId(g.id).icons.length, g.count, `${g.id}: count`)
  assert.deepEqual(LIBRARY.PRO_ICON_GROUPS.map((r) => r.id).sort(), pro.map((g) => g.id).sort())
})

test('withProIcons puts the fetched lists back on the stubs and ignores bad rows', () => {
  assert.equal(withProIcons(undefined), PREMADE_ICON_GROUPS)
  assert.equal(withProIcons([]), PREMADE_ICON_GROUPS)
  assert.equal(withProIcons([{ id: 'commerce', icons: [] }, null, { icons: ['lucide:x'] }]), PREMADE_ICON_GROUPS)
  const out = withProIcons([{ id: 'commerce', label: 'ignored', icons: ['lucide:x', 'tabler:y'] }, { id: 'wayfinding', icons: ['lucide:z'] }])
  const commerce = out.find((g) => g.id === 'commerce')
  assert.deepEqual([...commerce.icons], ['lucide:x', 'tabler:y'])
  assert.equal(commerce.label, PREMADE_ICON_GROUPS.find((g) => g.id === 'commerce').label, 'the stub keeps its own label')
  assert.equal(commerce.access, 'pro')
  assert.equal(out.find((g) => g.id === 'wayfinding'), PREMADE_ICON_GROUPS.find((g) => g.id === 'wayfinding'), 'a free group is never replaced')
  assert.equal(out.find((g) => g.id === 'files').icons, undefined, 'a stub with no row stays a stub')
  assert.equal(groupCount(null), 0)
})

test('the index lists every group with its count, before and after the Pro lists arrive', () => {
  const before = listIconGroups({ tier: 'paid' })
  const after = listIconGroups({ tier: 'paid', groups: GROUPS })
  assert.deepEqual(before.map((g) => [g.id, g.count]), after.map((g) => [g.id, g.count]))
  for (const g of before.filter((x) => x.access === 'pro')) assert.deepEqual(g.preview, [], `${g.id}: a stub has no preview`)
  assert.ok(after.filter((x) => x.access === 'pro').every((g) => g.preview.length > 0))
  assert.equal(glyphRequestPlan(PREMADE_ICON_GROUPS, 'paid').size > 0, true, 'stubs are skipped, free groups still planned')
})

// ── The style rule, against the recorded glyph data ──────────────────────────

test('every group icon exists in its pack (recorded snapshot of the real glyph data)', () => {
  const missing = []
  for (const g of GROUPS) {
    for (const ref of g.icons) {
      const { pack, name } = parseIconRef(ref)
      if (!SNAPSHOT.packs[pack]?.icons?.[name]) missing.push(`${g.id} → ${ref}`)
    }
  }
  assert.deepEqual(missing, [],
    'not in tests/unit/fixtures/icon-groups-snapshot.json. Run `node scripts/snapshot-icon-groups.mjs` '
    + '— it fails on an id the pack does not have.')
})

// The groups added from handover/specs/icon-group-use-cases-2026-11-06.md, with the label each shows.
const ADDED_GROUPS = {
  dashboard: 'Dashboard & analytics',
  'app-navigation': 'App navigation',
  code: 'Code & terminal',
  portfolio: 'Portfolio & creative',
  events: 'Events & tickets',
  'tech-brands': 'Tech brands',
  'payment-brands': 'Payments & crypto',
  'developer-tools': 'Languages & frameworks',
}
const BRAND_GROUPS = ['tech-brands', 'payment-brands', 'developer-tools']

/** Every name the pack's committed icon list (public/iconify/collections) carries. */
function packNames(pack) {
  const list = JSON.parse(read(`public/iconify/collections/${pack}.json`))
  return new Set([...(list.uncategorized || []), ...Object.values(list.categories || {}).flat()])
}

test('the added groups exist with their labels, and the brand groups are Pro', realOnly, () => {
  for (const [id, label] of Object.entries(ADDED_GROUPS)) {
    const g = byId(id)
    assert.ok(g, `no group "${id}"`)
    assert.equal(g.label, label)
    assert.equal(g.access, 'pro', `${id}: the free allowance stays at three groups`)
  }
  assert.deepEqual(BRAND_GROUPS.filter((id) => !byId(id)), [])
  assert.ok(BRAND_GROUPS.length >= 2, 'at least two brand groups')
  // The brand marks must come from the outline packs; a filled or coloured brand pack is outside the style rule.
  for (const id of BRAND_GROUPS) {
    for (const pack of groupPacks(byId(id))) assert.ok(pack in GROUP_STYLE_PACKS, `${id}: ${pack} is not an outline pack`)
  }
  assert.ok(byId('tech-brands').icons.includes('tabler:brand-github'))
  assert.ok(byId('payment-brands').icons.includes('tabler:brand-stripe'))
})

test('every icon in every group resolves to a known pack and a name that pack lists', realOnly, () => {
  const lists = new Map()
  const bad = []
  for (const g of GROUPS) {
    for (const ref of g.icons) {
      const { pack, name } = parseIconRef(ref)
      if (!(pack in GROUP_STYLE_PACKS)) { bad.push(`${g.id} → ${ref}: unknown group pack`); continue }
      if (!tierOf(pack)) { bad.push(`${g.id} → ${ref}: pack has no tier`); continue }
      if (!lists.has(pack)) lists.set(pack, packNames(pack))
      if (lists.get(pack).has(name)) continue
      // The committed Lucide list names canonical icons only; the pack's older names
      // (music, smile, align-left…) are real glyphs the snapshot of the live data records.
      // That allowance is for the groups that existed before the added ones: those must be on the list.
      const older = !(g.id in ADDED_GROUPS)
      if (!(older && SNAPSHOT.packs[pack]?.icons?.[name])) bad.push(`${g.id} → ${ref}: not in ${pack}'s icon list`)
    }
  }
  assert.deepEqual(bad, [])
  // The check can fail: a made-up name and an unknown pack are both caught.
  assert.ok(!packNames('tabler').has('brand-not-a-real-brand'))
  assert.equal('made-up' in GROUP_STYLE_PACKS, false)
})

test('a brand group is locked for a signed-out viewer and a free account, open on Pro', () => {
  for (const id of BRAND_GROUPS) {
    const g = byId(id)
    assert.equal(groupNeeds(g, 'anon'), 'paid')
    assert.equal(groupNeeds(g, 'free'), 'paid')
    assert.equal(groupNeeds(g, 'paid'), null)
    assert.deepEqual(glyphRequestPlan([g], 'anon').size, 0, `${id}: a locked group requested glyphs`)
  }
})

test('the snapshot holds exactly the icons the groups use, so it cannot go stale silently', realOnly, () => {
  const used = new Set(GROUPS.flatMap((g) => g.icons))
  const recorded = Object.entries(SNAPSHOT.packs).flatMap(([pack, v]) => Object.keys(v.icons).map((n) => `${pack}:${n}`))
  assert.deepEqual(recorded.filter((r) => !used.has(r)), [], 'snapshot rows no group uses — re-run the snapshot script')
})

test('every group icon is a 24-grid outline glyph with round caps and joins at its pack\'s native weight', () => {
  const off = []
  for (const g of GROUPS) {
    for (const ref of g.icons) {
      const { pack, name } = parseIconRef(ref)
      const f = SNAPSHOT.packs[pack]?.icons?.[name]
      if (!f) continue
      const native = String(GROUP_STYLE_PACKS[pack].stroke)
      const why = []
      if (f.width !== 24 || f.height !== 24) why.push(`${f.width}×${f.height}`)
      if (!f.stroked) why.push('not stroked on currentColor')
      if (f.strokeWidth.length !== 1 || f.strokeWidth[0] !== native) why.push(`stroke ${f.strokeWidth.join('/')} (pack draws ${native})`)
      if (f.cap.join() !== 'round') why.push(`caps ${f.cap.join('/') || 'none'}`)
      if (f.join.join() !== 'round') why.push(`joins ${f.join.join('/') || 'none'}`)
      if (/-(?:solid|filled|fill)$/.test(name)) why.push('a filled variant')
      if (why.length) off.push(`${g.id} → ${ref}: ${why.join(', ')}`)
    }
  }
  assert.deepEqual(off, [])
})

// ── Who may open which group ────────────────────────────────────────────────

test('a free account opens no group a signed-out viewer cannot, so the index gate offers Pro only', () => {
  // The deliberate exception to the other galleries' Log in gate: logging in
  // buys nothing here, so IconGroups ends on a Pro-only gate for anon and free.
  for (const g of GROUPS) {
    assert.equal(isGroupOpen(g, 'free'), isGroupOpen(g, 'anon'), `${g.id}: a free account changes what opens`)
  }
  assert.ok(GROUPS.some((g) => !isGroupOpen(g, 'anon')), 'no locked group - this assertion is vacuous')
  const src = strip(read('src/pages/IconGroups.jsx'))
  const gate = src.slice(src.indexOf('function GroupIndexGate'), src.indexOf('function GroupIndexGate') + 1600)
  assert.ok(gate.includes("tier === 'anon' && opens > shown"), 'the Log in gate must only appear when an account opens more groups')
})

test('free groups open for every viewer; Pro groups only on Pro', () => {
  for (const g of GROUPS) {
    for (const tier of TIERS) {
      const open = isGroupOpen(g, tier)
      if (g.access === 'free' || tier === 'paid') assert.equal(open, true, `${g.id} should open at ${tier}`)
      else assert.equal(groupNeeds(g, tier), 'paid', `${g.id} should need Pro at ${tier}`)
    }
  }
})

test('a group drawing from a pack the viewer cannot see is locked, whatever its own access says', () => {
  const needsAccount = { id: 'x', label: 'X', access: 'free', icons: ['lucide:x', 'mdi:home'] }
  const needsPro = { id: 'y', label: 'Y', access: 'free', icons: ['lucide:x', 'simple-icons:github'] }
  const unknown = { id: 'z', label: 'Z', access: 'free', icons: ['not-a-pack:thing'] }
  assert.equal(groupNeeds(needsAccount, 'anon'), 'free')
  assert.equal(groupNeeds(needsAccount, 'free'), null)
  assert.equal(groupNeeds(needsPro, 'anon'), 'paid')
  assert.equal(groupNeeds(needsPro, 'free'), 'paid')
  assert.equal(groupNeeds(needsPro, 'paid'), null)
  assert.equal(groupNeeds(unknown, 'free'), 'paid', 'an unknown pack fails closed')
  assert.equal(groupNeeds(null, 'paid'), 'paid')
})

// ── A locked group is never fetched ─────────────────────────────────────────

function spyFetch() {
  const urls = []
  const fetchImpl = async (url) => {
    urls.push(url)
    const u = new URL(url)
    const names = (u.searchParams.get('icons') || '').split(',').filter(Boolean)
    const icons = Object.fromEntries(names.map((n) => [n, { body: '<path stroke="currentColor" stroke-width="2" d="M0 0"/>' }]))
    return { ok: true, json: async () => ({ width: 24, height: 24, icons, aliases: {} }) }
  }
  return { urls, fetchImpl }
}

const requestedRefs = (urls) => urls.flatMap((url) => {
  const u = new URL(url)
  const pack = u.pathname.replace(/^\//, '').replace(/\.json$/, '')
  return (u.searchParams.get('icons') || '').split(',').filter(Boolean).map((n) => `${pack}:${n}`)
})

test('the request plan holds only open groups\' icons, and only packs the viewer may see', () => {
  for (const tier of TIERS) {
    const plan = glyphRequestPlan(GROUPS, tier)
    const allowed = new Set(GROUPS.filter((g) => isGroupOpen(g, tier)).flatMap((g) => g.icons))
    for (const [pack, names] of plan) {
      assert.ok(canSeePack(pack, tier), `${tier}: plan includes gated pack ${pack}`)
      for (const n of names) assert.ok(allowed.has(`${pack}:${n}`), `${tier}: ${pack}:${n} belongs to no open group`)
    }
  }
  const gated = { id: 'g', label: 'G', access: 'free', icons: ['simple-icons:github', 'logos:figma'] }
  assert.equal(glyphRequestPlan([gated], 'free').size, 0)
  assert.equal(glyphRequestPlan(GROUPS, 'anon', { limit: 3 }).get('lucide').length <= 9, true)
})

test('loading glyphs for a signed-out viewer never requests a Pro group\'s icons or a gated pack', async () => {
  resetGroupGlyphs()
  const { urls, fetchImpl } = spyFetch()
  const withGated = [...GROUPS, { id: 'g', label: 'G', access: 'free', icons: ['lucide:x', 'simple-icons:github'] }]
  const ok = await loadGroupGlyphs(glyphRequestPlan(withGated, 'anon'), { fetchImpl })
  assert.equal(ok, true)
  assert.ok(urls.length > 0, 'positive control: the free groups were fetched')
  const got = new Set(requestedRefs(urls))
  const freeRefs = new Set(GROUPS.filter((g) => g.access === 'free').flatMap((g) => g.icons))
  for (const ref of got) assert.ok(freeRefs.has(ref), `requested ${ref}, which no free group holds`)
  for (const url of urls) {
    assert.match(url, /^https:\/\/api\.iconify\.design\/[a-z0-9-]+\.json\?icons=/, 'one batched request per pack')
    assert.doesNotMatch(url, /simple-icons/, 'a gated pack was requested')
  }
  // Every free icon arrived and is cached; asking again costs nothing.
  for (const ref of freeRefs) assert.ok(glyphFor(ref), `${ref} not cached`)
  const before = urls.length
  await loadGroupGlyphs(glyphRequestPlan(withGated, 'anon'), { fetchImpl })
  assert.equal(urls.length, before, 'a cached glyph was requested again')
})

test('a refused batch reports false and is asked again next time', async () => {
  resetGroupGlyphs()
  let calls = 0
  const refuse = async () => { calls += 1; return { ok: false, status: 429 } }
  const plan = new Map([['lucide', ['x']]])
  assert.equal(await loadGroupGlyphs(plan, { fetchImpl: refuse }), false)
  assert.equal(await loadGroupGlyphs(plan, { fetchImpl: refuse }), false)
  assert.equal(calls, 2)
  resetGroupGlyphs()
})

test('listIconGroups gives a locked group no icon ids, and an open one its preview', () => {
  for (const tier of TIERS) {
    for (const row of listIconGroups({ tier, groups: GROUPS })) {
      assert.equal(row.route, `${ICON_GROUPS_ROUTE}?group=${row.id}`)
      assert.equal(row.count, byId(row.id).icons.length)
      if (row.locked) {
        assert.deepEqual(row.preview, [], `${tier}: locked ${row.id} leaked icon ids`)
        assert.ok(['free', 'paid'].includes(row.need))
      } else {
        assert.ok(row.preview.length > 0)
        assert.equal(row.need, null)
      }
    }
  }
  assert.equal(listIconGroups({ tier: 'anon' }).filter((r) => !r.locked).length,
    GROUPS.filter((g) => g.access === 'free').length)
  assert.equal(listIconGroups({ tier: 'paid' }).every((r) => !r.locked), true)
  assert.equal(listIconGroups().length, GROUPS.length, 'defaults to the signed-out view')
  assert.equal(groupRoute('a b'), `${ICON_GROUPS_ROUTE}?group=a%20b`)
})

// ── Files ───────────────────────────────────────────────────────────────────

test('an exported SVG carries the group weight and colour; without a colour it keeps currentColor', () => {
  const glyph = { body: '<g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1"/><circle r="1" fill="currentColor" stroke-width="2"/></g>', width: 24, height: 24 }
  const svg = groupIconSvg(glyph, { color: '#2A60E8', stroke: 2.5 })
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="24" height="24" viewBox="0 0 24 24">/)
  assert.doesNotMatch(svg, /stroke-width="(?!2\.5")/)
  assert.doesNotMatch(svg, /currentColor/)
  assert.match(svg, /stroke="#2a60e8"/)
  const plain = groupIconSvg(glyph, { stroke: 2 })
  assert.match(plain, /currentColor/)
  assert.doesNotMatch(groupIconSvg(glyph, { color: 'red;x' }), /red/, 'only a hex colour is written into the file')
})

test('the sprite has one uniquely named symbol per icon, and file names only carry the pack on a clash', () => {
  assert.deepEqual(groupFileNames(['lucide:mic', 'tabler:mic', 'lucide:x']), ['mic-lucide', 'mic-tabler', 'x'])
  const glyph = { body: '<path stroke="currentColor" stroke-width="2" d="M0 0"/>', width: 24, height: 24 }
  const sprite = groupSprite([
    { ref: 'lucide:mic', glyph }, { ref: 'tabler:mic', glyph }, { ref: 'lucide:gone', glyph: null },
  ], { stroke: 1 })
  const ids = [...sprite.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1])
  assert.deepEqual(ids, ['mic-lucide', 'mic-tabler'])
  assert.match(sprite, /stroke-width="1"/)
})

// ── The page ────────────────────────────────────────────────────────────────

test('the group view fetches only through the request plan, gates the download, and never injects HTML', () => {
  const page = strip(read('src/pages/IconGroups.jsx'))
  assert.match(page, /loadGroupGlyphs\(\s*glyphRequestPlan\(/, 'every fetch goes through glyphRequestPlan')
  assert.equal((page.match(/loadGroupGlyphs\(/g) || []).length, (page.match(/loadGroupGlyphs\(\s*glyphRequestPlan\(/g) || []).length,
    'a loadGroupGlyphs call that does not take its plan from glyphRequestPlan')
  assert.doesNotMatch(page, /api\.iconify\.design/, 'the page builds no Iconify URL of its own')
  assert.doesNotMatch(page, /dangerouslySetInnerHTML/)
  assert.match(page, /useExportGate/)
  assert.match(page, /viewerTier\(/, 'the page derives the viewer tier the Icon Library uses')
})

test('the Groups tab is registered like the other library tabs', async () => {
  const lib = strip(read('src/pages/IconEmojiLibrary.jsx'))
  assert.match(lib, /route:\s*ICON_GROUPS_ROUTE|route:\s*'\/create\/icons\/groups'/, 'LIB_TABS has the Groups row')
  const { createRoutes } = await import('../../src/data/toolTree.js')
  assert.ok(createRoutes().includes(ICON_GROUPS_ROUTE), 'toolTree does not know the route, so App.jsx will not mount it')
  const { PAGE_TITLES, PAGE_DESCRIPTIONS } = await import('../../src/data/routeMetaMap.js')
  assert.ok(PAGE_TITLES[ICON_GROUPS_ROUTE] && PAGE_DESCRIPTIONS[ICON_GROUPS_ROUTE])
  assert.match(read('public/sitemap.xml'), /<loc>https:\/\/uil4b\.com\/create\/icons\/groups<\/loc>/)
})
