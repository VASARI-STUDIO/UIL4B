// Prompt gallery overview: which sections become covers and which cover takes
// the whole row.
//
// Covers sit two to a row, sorted by how many outputs each one shows. A cover
// with a partner showing the SAME number of outputs shares a row with it; a
// cover with no such partner spans the row, so no row has an empty half and no
// row mixes a four-output cover with a two-output one. The rule is about the
// number of tiles shown, not about the position in the list: an odd last cover
// does not span by default, and an unpaired one in the middle does.
//
// Each expected list below is worked out by hand from the rule, not by running
// the code under test.
import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

// The source imports `../../utils/promptStore` without an extension (Vite
// resolves it; Node's loader does not). A resolve hook that retries with `.js`
// lets the real module load, with nothing mocked.
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try { return await next(specifier, context) }
  catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) return next(specifier + '.js', context)
    throw e
  }
}`))

const { buildOverview, categoryMembers, countLine } = await import('../../src/components/prompt/promptGallery.js')
const { TAG_CATEGORIES } = await import('../../src/data/promptCategories.js')

const SLUGS = TAG_CATEGORIES.map((c) => c.slug)
// ['website', '3d-motion', 'ui-components', 'css-visual', 'branding']

/**
 * Rows for the library: counts[i] main prompts in the i-th category, each
 * tagged with that category's first tag so it is also a member of it.
 */
function library(counts) {
  const rows = []
  counts.forEach((n, i) => {
    for (let k = 0; k < n; k += 1) {
      rows.push({ id: `${SLUGS[i]}-${k}`, category: SLUGS[i], tags: TAG_CATEGORIES[i].tags[0], saves: 100 - k })
    }
  })
  return rows
}
const open = () => true
const spans = (overview) => overview.covers.map((c) => Boolean(c.span))

test('covers showing 4, 4, 4 and 2 outputs: the first two share a row, the third and the 2-output one each span', () => {
  const o = buildOverview(library([4, 4, 4, 2]), open)
  assert.deepEqual(o.covers.map((c) => c.cat.slug), ['website', '3d-motion', 'ui-components', 'css-visual'])
  assert.deepEqual(o.covers.map((c) => c.shown.length), [4, 4, 4, 2])
  assert.deepEqual(spans(o), [false, false, true, true])
})

test('covers showing 4, 4 and 2 outputs: the pair shares a row and the 2-output cover spans', () => {
  const o = buildOverview(library([4, 4, 2]), open)
  assert.deepEqual(o.covers.map((c) => c.shown.length), [4, 4, 2])
  assert.deepEqual(spans(o), [false, false, true])
})

test('covers showing 4, 4, 2 and 2 outputs: two equal pairs, nothing spans', () => {
  const o = buildOverview(library([4, 4, 2, 2]), open)
  assert.deepEqual(o.covers.map((c) => c.shown.length), [4, 4, 2, 2])
  assert.deepEqual(spans(o), [false, false, false, false])
})

test('covers showing 4, 2 and 2 outputs: the lone 4-output cover spans and the 2s pair (the last cover is not the one that spans)', () => {
  const o = buildOverview(library([4, 2, 2]), open)
  assert.deepEqual(o.covers.map((c) => c.shown.length), [4, 2, 2])
  assert.deepEqual(spans(o), [true, false, false])
})

test('a single cover spans the row', () => {
  const o = buildOverview(library([3]), open)
  assert.deepEqual(spans(o), [true])
})

test('a section that earns a shelf is not a cover and does not take part in the pairing', () => {
  // Website has 6 open main prompts: a shelf. The other three are covers (4, 4, 2).
  const o = buildOverview(library([6, 4, 4, 2]), open)
  assert.deepEqual(o.shelves.map((s) => s.cat.slug), ['website'])
  assert.deepEqual(o.covers.map((c) => c.cat.slug), ['3d-motion', 'ui-components', 'css-visual'])
  assert.deepEqual(spans(o), [false, false, true])
})

test('a section with six prompts but a locked first one is a cover that shows four', () => {
  const rows = library([6, 4])
  const lockedWebsiteLead = new Set(['website-0'])
  const o = buildOverview(rows, (p) => !lockedWebsiteLead.has(p.id) && p.category !== 'website')
  assert.deepEqual(o.shelves, [])
  assert.deepEqual(o.covers.map((c) => c.cat.slug), ['website', '3d-motion'])
  assert.deepEqual(o.covers.map((c) => c.shown.length), [4, 4])
  assert.deepEqual(spans(o), [false, false])
})

// The lock pill is centred with left:50%, so unless it sizes to its content it
// can only be as wide as the half of the tile to its right. In a narrow cover
// tile that squeezed the padlock to 0 x 0 beside the "Free account" label.
test('the lock pill sizes to its content and the padlock cannot shrink', async () => {
  const { readFileSync } = await import('node:fs')
  const css = readFileSync(new URL('../../src/styles/pages/prompt-library.css', import.meta.url), 'utf8')
  const pill = css.match(/\.plib-page \.pl-lockmark\{([^}]*)\}/)
  assert.ok(pill, 'the .pl-lockmark rule exists')
  assert.match(pill[1], /width:\s*max-content/)
  assert.match(css, /\.plib-page \.pl-lock-glyph\{[^}]*flex:\s*none/)
})

for (const size of [4, 5]) {
  test(`equal-length tag members and shown outputs with different ids still offer more (${size} outputs)`, () => {
    const rows = library([1, 0, 0, 0, size])
    const cat = TAG_CATEGORIES.find((c) => c.slug === 'branding')
    rows[0].tags = 'elegant'
    rows[1].tags = 'unmatched'
    const tagged = rows.filter((p) => cat.tags.includes(p.tags))
    const overview = buildOverview(rows, open)
    const section = [...overview.shelves, ...overview.covers].find((s) => s.cat.slug === cat.slug)
    assert.equal(tagged.length, section.shown.length)
    assert.notDeepEqual(new Set(tagged.map((p) => p.id)), new Set(section.shown.map((p) => p.id)))
    assert.equal(section.more, true)
    assert.equal(section.moreOnPhone, true)
    assert.equal(section.members.length, size + 1)
    assert.ok(section.members.some((p) => !section.shown.some((shown) => shown.id === p.id)))
  })
}

test('every overview output belongs to its category list, including primary prompts without matching tags', async () => {
  const { COMMUNITY_PROMPT_ROWS } = await import('../../src/data/communityPrompts.js')
  const isOpen = (p) => p.free === true
  const overview = buildOverview(COMMUNITY_PROMPT_ROWS, isOpen)
  for (const section of [...overview.shelves, ...overview.covers]) {
    const members = categoryMembers(section.cat, COMMUNITY_PROMPT_ROWS)
    const memberIds = new Set(members.map((p) => p.id))
    for (const p of section.shown) assert.ok(memberIds.has(p.id), `${p.id} belongs in ${section.cat.slug}`)
    assert.deepEqual(section.members, members)
    assert.equal(countLine(section.members, isOpen), countLine(members, isOpen))
    assert.equal(section.more, members.some((p) => !section.shown.some((shown) => shown.id === p.id)))
  }
  const branding = categoryMembers(TAG_CATEGORIES.find((c) => c.slug === 'branding'), COMMUNITY_PROMPT_ROWS)
  assert.ok(branding.some((p) => p.id === 'c-9'))
  assert.ok(branding.some((p) => p.category === 'website'))
})

// The tab choice and the list hash. A list link puts the page on Community once,
// when the address changes to it. Forcing it on every render undoes "My Prompts"
// clicked inside a list (the tab is set before the router drops the hash), and
// storing the forced value overwrites a saved My Prompts choice.
test('the page forces Community only when the address changes to a list, and stores only a chosen tab', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const { stripJs } = await import('../helpers/strip-comments.js')
  const src = stripJs(fs.readFileSync(path.join(process.cwd(), 'src/pages/PromptLibrary.jsx'), 'utf8'))
  assert.ok(/const \[seenList, setSeenList\] = useState\(listKey\)/.test(src), 'the last list address must be remembered')
  assert.ok(/if \(listKey !== seenList\) \{[\s\S]*?if \(listKey && savedTab !== 'community'\) setTab\('community'\)/.test(src),
    'Community must be forced only when the list address changes')
  assert.ok(!/if \(hashIsList && savedTab !== 'community'\) setTab\('community'\)/.test(src),
    'forcing Community on every render flips a My Prompts click back')
  assert.ok(!/useEffect\(\(\) => \{\s*try \{ localStorage\.setItem\('vs-prompt-tab'/.test(src),
    'an effect that stores the shown tab saves the forced one too')
  const switchTab = src.slice(src.indexOf('const switchTab = '), src.indexOf('const openSubmitPanel'))
  assert.ok(/localStorage\.setItem\('vs-prompt-tab', next\)/.test(switchTab), 'switchTab must store the tab the visitor chose')
})
