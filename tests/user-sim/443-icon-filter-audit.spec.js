// ICON FILTER AUDIT (Q214): EVERY SHOWN RESULT MATCHES THE ACTIVE PACK, WEIGHT AND CATEGORY FILTERS.
//
// What a person sees in /create/icons, and what must never be on screen:
//   - Pack x weight: Regular lists no suffixed glyph (-bold, -fill, -solid, -duotone ...); Bold, Fill and Duo list
//     only the glyphs that carry that weight's suffix, in the packs that draw it.
//   - Categories: Coloured (and its Brands, Flags and Flat types), Editable and Animated list only their own packs,
//     and the weight never leaks the suffixed twins in (a category is always Regular).
//   - Search: inside a pack, inside a category, and in All with a weight active, every hit obeys the same filters.
//   - A filter changed while a page is still loading, or after the grid has been scrolled, leaves no stale cell.
//   Each of these is checked on page 1 and again after the grid has been scrolled on (past 120 cells, and past the
//   480-cell "Show more icons" button where the scope has that many).
//
// HOW THE CATALOGUES ARE MADE. The Iconify fixture is 20 names a pack: too small to scroll. Each test serves its own
// catalogue instead (page routes outrank the stub's context route, as in 438): every pack lists 520 concepts, each
// repeated once per weight suffix the pack really has, and every name carries its pack (`ph-ic007-bold`) so a cell
// can be traced to its pack in a single-pack grid too. The rules a cell is judged by are written out below by hand,
// not imported from the app, so a bug in the app's rules cannot agree with itself.
//
// Signed in on Pro, so no per-pack cap for a free or signed-out account hides a leak. Waits are on state: the
// announced count, the cells, or a held request that the test itself lets go. No timers.
//
// MUTATIONS (each to be seen red, then the source restored byte for byte; `git diff --stat src/` empty after):
//   - keepWeight in IconLibrary.jsx: return `open` unfiltered for a weight (`return rule ? open : []`)
//     -> the pack x weight tests and the All-with-weight tests fail;
//   - browseGroup in IconLibrary.jsx: drop the category scope (`g.packs.filter(canSee)` becomes every pack)
//     -> the category tests fail;
//   - doSearch in IconLibrary.jsx: drop the `.filter(ic => matchesWeight(...))` line of the global search
//     -> the search tests fail.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER, SNAPSHOT_PATH_RE, isLiveIconify } from './iconify-stub.js'

const LIVE = 'UIL4B_LIVE_ICONIFY is set: the live catalogue is not the fixture, so nothing here is measurable'
const BASES = 520
const GLYPH = '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'

test.beforeEach(() => { test.skip(isLiveIconify(), LIVE) })

// ── The catalogue: which suffixes each pack really carries ────────────────────────────────────────────────────────
const VARIANTS = {
  ph: ['', '-thin', '-light', '-bold', '-fill', '-duotone'],
  iconamoon: ['', '-thin', '-light', '-bold', '-fill', '-duotone'],
  glyphs: ['', '-bold', '-duo', '-outline'],
  heroicons: ['', '-solid', '-16-solid', '-20-solid'],
  tabler: ['', '-filled'],
  iconoir: ['', '-solid'],
  fluent: ['-24-regular', '-24-filled', '-16-regular'],
  bi: ['', '-fill'],
  pixelarticons: ['', '-sharp', '-solid'],
  stash: ['', '-light', '-solid', '-duotone'],
  'lets-icons': ['', '-light', '-fill', '-duotone', '-fill-duotone'],
  mynaui: ['', '-solid'],
  mdi: ['', '-outline'],
  'material-symbols': ['', '-outline', '-rounded', '-sharp'],
  solar: ['-bold', '-bold-duotone', '-linear'],
  lucide: [''],
  'simple-icons': [''],
  'logos': [''], devicon: [''], 'skill-icons': [''], 'token-branded': [''],
  'circle-flags': [''], flag: [''], flagpack: [''], cif: [''],
  'flat-color-icons': [''], 'vscode-icons': [''],
}
const pad = (i) => String(i).padStart(3, '0')
const namesOf = (pack, bases = BASES) => Array.from({ length: bases }, (_, i) => (VARIANTS[pack] || ['']).map((s) => `${pack}-ic${pad(i)}${s}`)).flat()

// ── The rules, written out by hand ────────────────────────────────────────────────────────────────────────────────
const ends = (...tails) => (n) => tails.some((t) => n.endsWith(t))
const REGULAR = {
  ph: (n) => !ends('-thin', '-light', '-bold', '-fill', '-duotone')(n),
  iconamoon: (n) => !ends('-thin', '-light', '-bold', '-fill', '-duotone')(n),
  glyphs: (n) => !ends('-bold', '-duo', '-outline')(n),
  heroicons: (n) => !n.endsWith('-solid'),
  tabler: (n) => !n.endsWith('-filled'),
  iconoir: (n) => !n.endsWith('-solid'),
  fluent: (n) => n.endsWith('-24-regular'),
  bi: (n) => !n.endsWith('-fill'),
  pixelarticons: (n) => !ends('-sharp', '-solid')(n),
  stash: (n) => !ends('-light', '-solid', '-duotone')(n),
  'lets-icons': (n) => !ends('-light', '-fill', '-duotone', '-duotone-line', '-fill-duotone')(n),
  mynaui: (n) => !n.endsWith('-solid'),
  mdi: (n) => !n.endsWith('-outline'),
  'material-symbols': (n) => !ends('-outline', '-rounded', '-sharp')(n),
  solar: (n) => ends('-bold', '-bold-duotone')(n),
}
const WEIGHT = {
  bold: { ph: ends('-bold'), iconamoon: ends('-bold'), glyphs: ends('-bold') },
  fill: {
    ph: ends('-fill'), iconamoon: ends('-fill'), 'lets-icons': ends('-fill'), bi: ends('-fill'),
    heroicons: (n) => n.endsWith('-solid') && !/-(?:16|20)-solid$/.test(n),
    tabler: ends('-filled'), iconoir: ends('-solid'), fluent: ends('-24-filled'),
    pixelarticons: ends('-solid'), stash: ends('-solid'), mynaui: ends('-solid'),
  },
  duo: { ph: ends('-duotone'), iconamoon: ends('-duotone'), stash: ends('-duotone'), glyphs: ends('-duo'), 'lets-icons': ends('-duotone') },
}
const passes = (pack, name, weight) => (weight === 'regular' ? (REGULAR[pack]?.(name) ?? true) : !!WEIGHT[weight]?.[pack]?.(name))
const weightsOf = (pack) => ['bold', 'fill', 'duo'].filter((w) => WEIGHT[w][pack])
const WEIGHT_BUTTON = { regular: /^Regular/, bold: /^Bold/, fill: /^Fill/, duo: /^Duo/ }
const expectedNames = (pack, weight) => namesOf(pack).filter((n) => passes(pack, n, weight))

const GROUP = {
  coloured: ['logos', 'devicon', 'skill-icons', 'token-branded', 'circle-flags', 'flag', 'flagpack', 'cif', 'flat-color-icons', 'vscode-icons'],
  brands: ['logos', 'devicon', 'skill-icons', 'token-branded'],
  flags: ['circle-flags', 'flag', 'flagpack', 'cif'],
  flat: ['flat-color-icons', 'vscode-icons'],
  editable: ['lucide', 'tabler', 'iconoir', 'heroicons'],
  animated: ['line-md', 'svg-spinners', 'meteocons'],
}
const WEIGHT_PACKS = Object.keys(WEIGHT.fill).concat(['glyphs']).filter((p, i, a) => a.indexOf(p) === i)
const ALL_BOLD = Object.keys(WEIGHT.bold)

// ── Serving the catalogue ─────────────────────────────────────────────────────────────────────────────────────────
const HEADERS = { 'access-control-allow-origin': '*', [ICONIFY_STUB_HEADER]: '1' }
const SEARCH_PACKS = Object.keys(VARIANTS).concat(['line-md'])

/**
 * Answer the pack list, the site's snapshot of it, the glyph batch and the search for every pack in VARIANTS.
 * `hold` maps a prefix to a promise: that pack's list is not answered until it settles, and `arrived(prefix)`
 * resolves once the page has asked for it.
 */
async function serveCatalogue(page, { hold = {}, bases = BASES } = {}) {
  const asked = new Map()
  const arrivals = new Map()
  const answers = new Map()
  const answered = (prefix) => {
    if (!answers.has(prefix)) { let done; answers.set(prefix, Object.assign(new Promise((res) => { done = res }), { done })) }
    return answers.get(prefix)
  }
  const arrived = (prefix) => {
    if (!arrivals.has(prefix)) arrivals.set(prefix, new Promise((res) => asked.set(prefix, res)))
    return arrivals.get(prefix)
  }
  const list = (prefix) => async (route) => {
    arrived(prefix); asked.get(prefix)?.()
    if (hold[prefix]) await hold[prefix]
    const names = namesOf(prefix, bases)
    await route.fulfill({ status: 200, contentType: 'application/json', headers: HEADERS, body: JSON.stringify({ prefix, total: names.length, title: prefix, uncategorized: names }) }).catch(() => {})
    answered(prefix).done()
  }
  await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/collection' && VARIANTS[u.searchParams.get('prefix')], (route) => list(new URL(route.request().url()).searchParams.get('prefix'))(route))
  await page.route((u) => VARIANTS[u.pathname.match(SNAPSHOT_PATH_RE)?.[1]], (route) => list(new URL(route.request().url()).pathname.match(SNAPSHOT_PATH_RE)[1])(route))
  await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && /^\/[^/]+\.json$/.test(u.pathname) && u.search.includes('icons=') && VARIANTS[u.pathname.slice(1, -5)], (route) => {
    const url = new URL(route.request().url())
    const prefix = url.pathname.slice(1, -5)
    const icons = Object.fromEntries((url.searchParams.get('icons') || '').split(',').filter(Boolean).map((n) => [n, { body: GLYPH }]))
    return route.fulfill({ status: 200, contentType: 'application/json', headers: HEADERS, body: JSON.stringify({ prefix, width: 24, height: 24, icons, aliases: {} }) })
  })
  // Search: every pack asked for (or every pack at all when none is named), interleaved so the first hits span packs.
  await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/search', (route) => {
    const url = new URL(route.request().url())
    const query = (url.searchParams.get('query') || '').toLowerCase()
    const named = (url.searchParams.get('prefix') || url.searchParams.get('prefixes') || '').split(',').filter(Boolean)
    const packs = (named.length ? named : SEARCH_PACKS).filter((p) => VARIANTS[p] || p === 'line-md')
    const perPack = packs.map((p) => namesOf(p === 'line-md' ? 'lucide' : p, bases).map((n) => `${p}:${p === 'line-md' ? n.replace(/^lucide/, 'line-md') : n}`).filter((id) => id.split(':')[1].includes(query)))
    const icons = []
    for (let i = 0; perPack.some((l) => i < l.length); i += 1) perPack.forEach((l) => { if (i < l.length) icons.push(l[i]) })
    const limit = Number(url.searchParams.get('limit')) || 64
    return route.fulfill({ status: 200, contentType: 'application/json', headers: HEADERS, body: JSON.stringify({ icons: icons.slice(0, limit), total: icons.length, limit, start: 0, collections: {} }) })
  })
  return { arrived, answered }
}

// ── Driving and reading the library ───────────────────────────────────────────────────────────────────────────────
const PACK_LABELS = {
  Lucide: 'lucide', Tabler: 'tabler', Iconoir: 'iconoir', Heroicons: 'heroicons', Phosphor: 'ph', 'Material Design': 'mdi',
  'Material Symbols': 'material-symbols', Solar: 'solar', 'Fluent UI': 'fluent', Pixelarticons: 'pixelarticons',
  'Bootstrap Icons': 'bi', IconaMoon: 'iconamoon', 'Stash Icons': 'stash', Glyphs: 'glyphs', 'Lets Icons': 'lets-icons',
  'Myna UI Icons': 'mynaui', 'Simple Icons': 'simple-icons', 'Logos (colour)': 'logos', Devicon: 'devicon',
  'Skill Icons': 'skill-icons', 'Circle Flags': 'circle-flags', 'Flag Icons': 'flag', Flagpack: 'flagpack',
  'Currency Flags': 'cif', 'Flat Color Icons': 'flat-color-icons', 'VSCode Icons': 'vscode-icons', 'Web3 Icons': 'token-branded',
  'Line MD (animated)': 'line-md', 'SVG Spinners (animated)': 'svg-spinners', 'Meteocons (animated)': 'meteocons',
}

async function openLibrary(page, { width = 1440, path = '/create/icons', serve = true, hold, bases } = {}) {
  watch(page, 'designer on the Pro plan checking that every icon shown obeys the filters')
  await page.setViewportSize({ width, height: width < 600 ? 844 : 900 })
  const served = serve ? await serveCatalogue(page, { hold, bases }) : null
  await signIn(page, { plan: 'pro' })
  await go(page, path)
  await expect(page.locator('.ig .ic:not(.ig-skel)').first()).toBeVisible({ timeout: 20_000 })
  return served
}

/** Every cell now in the grid: its name, and the pack it came from (the name carries it; a mixed grid also labels it). */
const readCells = (page) => page.locator('.ig .ic:not(.ig-skel)').evaluateAll((els) => els.map((e) => ({
  name: e.querySelector('.ic-name')?.textContent || '',
  label: (e.getAttribute('aria-label') || '').replace(/^Customise [^,]*(?:, )?/, ''),
})))
const packOfCell = (c, fixed) => c.name.match(/^(.+?)-ic\d{3}/)?.[1] || PACK_LABELS[c.label] || fixed

/**
 * Fail if any cell in the grid breaks the filter: its pack outside `packs`, its name failing the weight rule, or
 * (with `query`) not containing the search text. The grid also has to have cells, or "nothing leaked" proves nothing.
 */
async function expectFiltered(page, { packs, weight = 'regular', query = '', fixed = null, why }) {
  const cells = await readCells(page)
  expect(cells.length, `${why}: the grid is empty, so there is nothing to check`).toBeGreaterThan(0)
  const bad = cells.filter((c) => {
    const pack = packOfCell(c, fixed)
    return (packs && !packs.includes(pack)) || !passes(pack, c.name, weight) || (query && !c.name.includes(query))
  }).map((c) => `${c.name} [${packOfCell(c, fixed)}]`)
  expect(bad.slice(0, 8), `${why}: ${bad.length} of ${cells.length} cells break the filter (${weight}${packs ? `, packs ${packs.join('/')}` : ''})`).toEqual([])
  return cells
}

/** Scroll the grid on until `count` cells are mounted, pressing "Show more icons" where the scroll stops. */
async function revealCells(page, count) {
  await expect.poll(async () => {
    await page.evaluate(() => {
      document.querySelector('.ig-sentinel, .ig-more')?.scrollIntoView({ block: 'end' })
      document.querySelector('.ig-more button')?.click()
    })
    return page.locator('.ig .ic:not(.ig-skel)').count()
  }, { timeout: 30_000, message: `the grid never revealed ${count} cells` }).toBeGreaterThanOrEqual(count)
}

const filtersButton = (page) => page.getByRole('button', { name: /^Filters(?: \d+)?$/ })
const sheet = (page) => page.getByRole('dialog', { name: 'Filters' })

/** Run `act` with the controls in reach: inside the Filters sheet on a phone, on the toolbar elsewhere. */
async function withControls(page, act) {
  const inSheet = await filtersButton(page).isVisible()
  if (inSheet) { await filtersButton(page).click(); await expect(sheet(page)).toBeVisible() }
  await act()
  if (inSheet) { await sheet(page).getByRole('button', { name: 'Done', exact: true }).click(); await expect(sheet(page)).toBeHidden() }
}
const pickPack = (page, pack) => withControls(page, () => chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), pack))
// The weight and category controls stay on the page at 390px; only the pack menu moves into the Filters sheet.
const pickWeight = (page, weight) => page.getByRole('group', { name: 'Icon weight' }).getByRole('button', { name: WEIGHT_BUTTON[weight] }).click()
const pickCategory = (page, name) => page.getByRole('group', { name: 'Icon category' }).getByRole('button', { name: new RegExp(`^${name}`) }).click()
const search = (page, text) => page.getByRole('searchbox', { name: /search icons/i }).fill(text)

/** The pack's own list has been drawn: the announced count is what the hand-written rules say it should be. */
const listed = (page, count) => expect(page.locator('#ig-result-count')).toHaveText(`${count.toLocaleString('en-US')} icons`, { timeout: 20_000 })

// ── 1. Pack x weight ──────────────────────────────────────────────────────────────────────────────────────────────
for (const pack of WEIGHT_PACKS) {
  test(`${pack}: Regular and each weight it draws list only matching glyphs, on page 1 and scrolled`, async ({ page }) => {
    await openLibrary(page)
    await pickPack(page, pack)
    for (const weight of ['regular', ...weightsOf(pack)]) {
      if (weight !== 'regular') await pickWeight(page, weight)
      const total = expectedNames(pack, weight).length
      expect(total, `the catalogue has ${weight} names for ${pack}`).toBeGreaterThan(0)
      await listed(page, total)
      await expectFiltered(page, { packs: [pack], weight, fixed: pack, why: `${pack} ${weight} page 1` })
      const target = Math.min(total, pack === 'ph' ? 500 : 250)
      await revealCells(page, target)
      const later = await expectFiltered(page, { packs: [pack], weight, fixed: pack, why: `${pack} ${weight} scrolled to ${target}` })
      expect(later.length, `${pack} ${weight} scrolled`).toBeGreaterThan(120)
    }
  })
}

test('All: each weight lists only the packs that draw it, with matching names, on page 1 and scrolled', async ({ page }) => {
  await openLibrary(page)
  for (const weight of ['bold', 'fill', 'duo']) {
    await pickWeight(page, weight)
    const packs = Object.keys(WEIGHT[weight])
    await expect.poll(async () => (await readCells(page)).length, { timeout: 20_000, message: `All ${weight} lists cells` }).toBeGreaterThan(0)
    await expect.poll(async () => (await readCells(page)).every((c) => passes(packOfCell(c), c.name, weight)), { timeout: 20_000, message: `All ${weight} settles on ${weight} glyphs` }).toBe(true)
    await expectFiltered(page, { packs, weight, why: `All ${weight} page 1` })
    await revealCells(page, 250)
    await expectFiltered(page, { packs, weight, why: `All ${weight} scrolled` })
  }
})

test('All Regular lists no suffixed glyph, on page 1 and scrolled', async ({ page }) => {
  await openLibrary(page, { serve: false })
  await expect(page.locator('.ig .ic:not(.ig-skel)').first()).toBeVisible({ timeout: 20_000 })
  const check = async (why) => {
    const cells = await readCells(page)
    const bad = cells.filter((c) => { const pack = packOfCell(c); return pack && !passes(pack, c.name, 'regular') }).map((c) => `${c.name} [${c.label}]`)
    expect(bad.slice(0, 8), `${why}: Regular must not list weight twins`).toEqual([])
    return cells.length
  }
  expect(await check('All Regular page 1')).toBeGreaterThan(0)
  await revealCells(page, 250)
  await check('All Regular scrolled')
})

// ── 2. Categories ─────────────────────────────────────────────────────────────────────────────────────────────────
const CAT_BASES = 130
const CATEGORY_CASES = [
  { id: 'coloured', url: '?category=coloured', packs: GROUP.coloured, why: 'Coloured' },
  { id: 'brands', url: '?category=coloured&style=brands', packs: GROUP.brands, why: 'Coloured, Brands' },
  { id: 'flags', url: '?category=coloured&style=flags', packs: GROUP.flags, why: 'Coloured, Flags' },
  { id: 'flat', url: '?category=coloured&style=flat', packs: GROUP.flat, why: 'Coloured, Flat' },
  { id: 'editable', url: '?category=editable', packs: GROUP.editable, why: 'Editable' },
]
for (const c of CATEGORY_CASES) {
  test(`${c.why} lists only its own packs, Regular glyphs, on page 1 and scrolled`, async ({ page }) => {
    await openLibrary(page, { path: `/create/icons${c.url}`, bases: CAT_BASES })
    await expectFiltered(page, { packs: c.packs, why: `${c.why} page 1` })
    const total = c.packs.reduce((n, p) => n + namesOf(p, CAT_BASES).filter((x) => passes(p, x, 'regular')).length, 0)
    await revealCells(page, Math.min(total, 250))
    await expectFiltered(page, { packs: c.packs, why: `${c.why} scrolled to 250` })
    await revealCells(page, Math.min(total, 500))
    const end = await expectFiltered(page, { packs: c.packs, why: `${c.why} scrolled past 480` })
    expect(new Set(end.map((x) => packOfCell(x))).size, `${c.why} should list more than one of its packs`).toBeGreaterThan(c.packs.length > 1 ? 1 : 0)
  })
}

test('a weight chosen in All does not carry weight twins into a category', async ({ page }) => {
  await openLibrary(page, { bases: CAT_BASES })
  await pickWeight(page, 'fill')
  await pickCategory(page, 'Editable')
  await expect.poll(async () => (await readCells(page)).length, { timeout: 20_000 }).toBeGreaterThan(0)
  await expectFiltered(page, { packs: GROUP.editable, why: 'Editable after Fill was active in All' })
  await revealCells(page, 250)
  await expectFiltered(page, { packs: GROUP.editable, why: 'Editable after Fill was active in All, scrolled' })
})

// ── 3. Search ─────────────────────────────────────────────────────────────────────────────────────────────────────
const hits = (page) => expect.poll(async () => (await readCells(page)).length, { timeout: 20_000 }).toBeGreaterThan(0)

test('search inside a pack lists only that pack and its weight, page 1 and scrolled', async ({ page }) => {
  await openLibrary(page)
  await pickPack(page, 'glyphs')
  await listed(page, expectedNames('glyphs', 'regular').length)
  await search(page, 'ic')
  await expect.poll(async () => (await readCells(page)).length, { timeout: 20_000 }).toBeGreaterThan(0)
  await expectFiltered(page, { packs: ['glyphs'], query: 'ic', fixed: 'glyphs', why: 'search in Glyphs, Regular, page 1' })
  await revealCells(page, 130)
  await expectFiltered(page, { packs: ['glyphs'], query: 'ic', fixed: 'glyphs', why: 'search in Glyphs, Regular, scrolled' })
  await pickWeight(page, 'bold')
  await expect.poll(async () => (await readCells(page)).every((c) => c.name.endsWith('-bold')), { timeout: 20_000 }).toBe(true)
  await expectFiltered(page, { packs: ['glyphs'], weight: 'bold', query: 'ic', fixed: 'glyphs', why: 'search in Glyphs, Bold' })
  await revealCells(page, 130)
  await expectFiltered(page, { packs: ['glyphs'], weight: 'bold', query: 'ic', fixed: 'glyphs', why: 'search in Glyphs, Bold, scrolled' })
})

test('search inside a category lists only that category, Regular, page 1 and scrolled', async ({ page }) => {
  await openLibrary(page, { path: '/create/icons?category=editable' })
  await hits(page)
  await search(page, 'ic1')
  await expect.poll(async () => (await readCells(page)).every((c) => c.name.includes('ic1')), { timeout: 20_000 }).toBe(true)
  await expectFiltered(page, { packs: GROUP.editable, query: 'ic1', why: 'search in Editable, page 1' })
  await revealCells(page, 250)
  await expectFiltered(page, { packs: GROUP.editable, query: 'ic1', why: 'search in Editable, scrolled' })
})

test('search inside Coloured keeps to the colour packs', async ({ page }) => {
  await openLibrary(page, { path: '/create/icons?category=coloured' })
  await hits(page)
  await search(page, 'ic1')
  await expect.poll(async () => (await readCells(page)).every((c) => c.name.includes('ic1')), { timeout: 20_000 }).toBe(true)
  await expectFiltered(page, { packs: GROUP.coloured, query: 'ic1', why: 'search in Coloured' })
})

for (const weight of ['bold', 'fill', 'duo']) {
  test(`search in All with ${weight} active lists only ${weight} glyphs`, async ({ page }) => {
    await openLibrary(page)
    await pickWeight(page, weight)
    await hits(page)
    await search(page, 'ic0')
    await expect.poll(async () => (await readCells(page)).every((c) => c.name.includes('ic0')), { timeout: 20_000 }).toBe(true)
    await expectFiltered(page, { packs: Object.keys(WEIGHT[weight]), weight, query: 'ic0', why: `search in All, ${weight}` })
  })
}

test('search in All on Regular drops weight twins and animated sets', async ({ page }) => {
  await openLibrary(page)
  await hits(page)
  await search(page, 'ic')
  await expect.poll(async () => (await readCells(page)).every((c) => c.name.includes('-ic')), { timeout: 20_000 }).toBe(true)
  const cells = await expectFiltered(page, { weight: 'regular', query: '-ic', why: 'search in All, Regular, page 1' })
  expect(cells.filter((c) => packOfCell(c) === 'line-md'), 'animated sets never list from the global search').toEqual([])
  await revealCells(page, 130)
  await expectFiltered(page, { weight: 'regular', query: '-ic', why: 'search in All, Regular, scrolled' })
})

// ── 4. A filter changed mid-load, or after scrolling, leaves nothing stale ────────────────────────────────────────
test('a pack list that arrives after the viewer has moved on is not drawn', async ({ page }) => {
  let release
  const gate = new Promise((res) => { release = res })
  const served = await openLibrary(page, { hold: { tabler: gate } })
  await expect(page.locator('.ig .ic:not(.ig-skel)').first()).toBeVisible({ timeout: 20_000 })
  await pickPack(page, 'tabler')
  await served.arrived('tabler')
  await pickPack(page, 'ph')
  await pickWeight(page, 'bold')
  await listed(page, expectedNames('ph', 'bold').length)
  release()
  // The late Tabler list is now let go; the grid must stay Phosphor Bold. Wait for it to be answered, then two frames.
  await served.answered('tabler')
  await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))))
  await expectFiltered(page, { packs: ['ph'], weight: 'bold', fixed: 'ph', why: 'Phosphor Bold after a late Tabler list' })
  await listed(page, expectedNames('ph', 'bold').length)
})

test('a weight chosen while the pack is still loading is the one that is shown', async ({ page }) => {
  let release
  const gate = new Promise((res) => { release = res })
  const served = await openLibrary(page, { hold: { ph: gate } })
  await expect(page.locator('.ig .ic:not(.ig-skel)').first()).toBeVisible({ timeout: 20_000 })
  await pickPack(page, 'ph')
  await served.arrived('ph')
  await pickWeight(page, 'bold')
  release()
  await listed(page, expectedNames('ph', 'bold').length)
  await expectFiltered(page, { packs: ['ph'], weight: 'bold', fixed: 'ph', why: 'Phosphor, Bold chosen mid-load' })
  await revealCells(page, 250)
  await expectFiltered(page, { packs: ['ph'], weight: 'bold', fixed: 'ph', why: 'Phosphor, Bold chosen mid-load, scrolled' })
})

test('after scrolling a long list, a new weight replaces every cell', async ({ page }) => {
  await openLibrary(page)
  await pickPack(page, 'ph')
  await listed(page, expectedNames('ph', 'regular').length)
  await revealCells(page, 250)
  await pickWeight(page, 'bold')
  await listed(page, expectedNames('ph', 'bold').length)
  const cells = await expectFiltered(page, { packs: ['ph'], weight: 'bold', fixed: 'ph', why: 'Phosphor Bold right after scrolling Regular' })
  expect(cells.length).toBeGreaterThan(0)
})

test('after scrolling a category, a new category or pack replaces every cell', async ({ page }) => {
  await openLibrary(page, { path: '/create/icons?category=coloured' })
  await expect(page.locator('.ig .ic:not(.ig-skel)').first()).toBeVisible({ timeout: 20_000 })
  await revealCells(page, 250)
  await pickCategory(page, 'Editable')
  await expect.poll(async () => (await readCells(page)).every((c) => GROUP.editable.includes(packOfCell(c))), { timeout: 20_000 }).toBe(true)
  await expectFiltered(page, { packs: GROUP.editable, why: 'Editable right after scrolling Coloured' })
  await revealCells(page, 250)
  await pickPack(page, 'glyphs')
  await listed(page, expectedNames('glyphs', 'regular').length)
  await expectFiltered(page, { packs: ['glyphs'], fixed: 'glyphs', why: 'Glyphs right after scrolling Editable' })
})

test('after scrolling All with a weight, choosing a pack replaces every cell', async ({ page }) => {
  await openLibrary(page)
  await pickWeight(page, 'bold')
  await expect.poll(async () => (await readCells(page)).length, { timeout: 20_000 }).toBeGreaterThan(0)
  await revealCells(page, 250)
  await pickPack(page, 'glyphs')
  await listed(page, expectedNames('glyphs', 'bold').length)
  await expectFiltered(page, { packs: ['glyphs'], weight: 'bold', fixed: 'glyphs', why: 'Glyphs Bold right after scrolling All Bold' })
})

// ── 5. A phone ────────────────────────────────────────────────────────────────────────────────────────────────────
test('at 390px a pack and weight chosen in the Filters sheet list only matching glyphs, page 1 and scrolled', async ({ page }) => {
  await openLibrary(page, { width: 390 })
  await pickPack(page, 'ph')
  await pickWeight(page, 'bold')
  await listed(page, expectedNames('ph', 'bold').length)
  await expectFiltered(page, { packs: ['ph'], weight: 'bold', fixed: 'ph', why: 'at 390: Phosphor Bold page 1' })
  await revealCells(page, 250)
  await expectFiltered(page, { packs: ['ph'], weight: 'bold', fixed: 'ph', why: 'at 390: Phosphor Bold scrolled' })
  await pickWeight(page, 'regular')
  await listed(page, expectedNames('ph', 'regular').length)
  await expectFiltered(page, { packs: ['ph'], fixed: 'ph', why: 'at 390: Phosphor Regular' })
})
