// The free edition: a plan that is not Pro downloading the guidelines or the style guide of a Pro theme gets at most seven pages, each
// with the "Made with UIL4B" credit, never a blurred or locked page. Pro gets the whole document with no credit, and a theme that is
// free already is drawn whole for everyone.
//
// MUTATIONS (each turns the tests named red):
//   the FREE_EDITION_PAGES break removed from pagesDoc in exportThemeRoute.js     -> "Free gets at most seven pages of a Pro theme's guidelines"
//   withFreeCredit no longer applied in pagesDoc                                  -> same test (no credit on the pages)
//   `freeEdition: access.edition === 'free'` dropped from serveThemeExport         -> "the route draws the free edition for Free and the whole document for Pro"
//   the FREE_EDITION_ROWS check in themeAccess.js widened to every row             -> "the UI kit and book of a Pro theme stay Pro"
import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import { loadEngine, renderThemeExport, serveThemeExport, FREE_CREDIT, withFreeCredit } from '../../api/_lib/exportThemeRoute.js'
import { assertThemeAccess, FREE_EDITION_PAGES } from '../../api/_lib/themeAccess.js'
import { FREE_CREDIT_SCREEN_MAX } from '../../api/_lib/exportThemeRoute.js'
import { SCREEN_BREAK } from '../../api/_lib/exportThemes/engine/guide-layout.js'
import { EXPORT_THEMES, themeHasRow, isThemeExportPro } from '../../src/data/exportThemes.js'

const FONTS = { heading: { family: 'Barlow Condensed', weight: 700, category: 'sans-serif' }, body: { family: 'Roboto', weight: 400, category: 'sans-serif' } }
const design = { palette: { base: '#2E7BB8', harmony: 'auto', colors: ['#2E7BB8', '#06070A', '#F2B544', '#EEF3F8'] }, fonts: FONTS }
const E = await loadEngine()
const PRO_THEME = '23-broadsheet'
const PRO_GUIDE_THEME = '24-standards'

const frames = (html) => (html.match(/class="(?:[^"]*\s)?pg(?:\s[^"]*)?"/g) || []).length
const credits = (html) => (html.match(/class="uil4b-credit"/g) || []).length

mock.method(console, 'warn', () => {})

test("Free gets at most seven pages of a Pro theme's guidelines, each with the credit; Pro gets them all, with none", async () => {
  const free = (await renderThemeExport({ theme: PRO_THEME, row: 'slides', format: 'pdf', design, projectName: 'Tide', freeEdition: true }, E)).html
  const pro = (await renderThemeExport({ theme: PRO_THEME, row: 'slides', format: 'pdf', design, projectName: 'Tide' }, E)).html
  assert.ok(frames(pro) > FREE_EDITION_PAGES, `the full guidelines have more than ${FREE_EDITION_PAGES} pages (${frames(pro)})`)
  assert.equal(frames(free), FREE_EDITION_PAGES)
  assert.equal(credits(free), frames(free), 'every free page carries the credit')
  assert.ok(free.includes(FREE_CREDIT))
  assert.equal(credits(pro), 0, 'Pro never carries the credit')
  assert.doesNotMatch(free, /blur\(/, 'nothing is blurred')
})

test("Free gets at most seven pages of a Pro theme's style guide, and the markdown carries the credit", async () => {
  const html = (await renderThemeExport({ theme: PRO_GUIDE_THEME, row: 'guide', format: 'pdf', design, projectName: 'Tide', freeEdition: true }, E)).html
  assert.ok(frames(html) >= 1 && frames(html) <= FREE_EDITION_PAGES, `pages ${frames(html)}`)
  assert.equal(credits(html), frames(html))
  const { md } = await renderThemeExport({ theme: PRO_GUIDE_THEME, row: 'guide', format: 'md', design, projectName: 'Tide', freeEdition: true }, E)
  assert.ok(md.trimEnd().endsWith(FREE_CREDIT))
  const proMd = (await renderThemeExport({ theme: PRO_GUIDE_THEME, row: 'guide', format: 'md', design, projectName: 'Tide' }, E)).md
  assert.ok(!proMd.includes(FREE_CREDIT))
})

test('the UI kit and book of a Pro theme stay Pro; a free theme is not cut', () => {
  const free = { id: 'free' }
  for (const row of ['ui-kit', 'book']) {
    const v = assertThemeAccess(free, { theme: PRO_THEME, row, format: row === 'ui-kit' ? 'zip' : 'pdf' }, { freeEdition: true })
    assert.deepEqual([v.ok, v.code], [false, 'pro_required'], row)
  }
  for (const row of ['slides', 'guide']) {
    const theme = row === 'guide' ? PRO_GUIDE_THEME : PRO_THEME
    assert.deepEqual(assertThemeAccess(free, { theme, row, format: 'pdf' }, { freeEdition: true }), { ok: true, edition: 'free' })
    assert.equal(assertThemeAccess(free, { theme, row, format: 'pdf' }).code, 'pro_required', 'the previews keep the plain verdict')
  }
  assert.deepEqual(assertThemeAccess(free, { theme: '33-flyleaf', row: 'slides', format: 'pdf' }, { freeEdition: true }), { ok: true })
  assert.deepEqual(assertThemeAccess({ id: 'pro' }, { theme: PRO_THEME, row: 'slides', format: 'pdf' }, { freeEdition: true }), { ok: true })
})

test('the route draws the free edition for Free and the whole document for Pro', async () => {
  const run = async (plan) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v }, status(c) { this.code = c; return this }, json(b) { this.body = b; return this }, send(b) { this.sent = b; return this } }
    await serveThemeExport({ headers: {} }, res, {
      body: { theme: PRO_THEME, row: 'slides', format: 'pdf', design, projectName: 'Tide' },
      decoded: { uid: 'u1' }, plan, consume: async () => ({ allowed: true }), engine: E,
    })
    assert.equal(res.code, 200, JSON.stringify(res.body))
    return String(res.sent ?? res.body?.html ?? '')
  }
  const free = await run({ id: 'free' })
  const pro = await run({ id: 'pro' })
  assert.equal(frames(free), FREE_EDITION_PAGES)
  assert.equal(credits(free), FREE_EDITION_PAGES)
  assert.equal(credits(pro), 0)
  assert.ok(frames(pro) > FREE_EDITION_PAGES)
})

test('the credit lands inside each page frame and in the head once', () => {
  const html = '<html><head><title>x</title></head><body><section class="pg cover" data-page="a">A</section><div class="x pg">B</div><div class="pgx">C</div></body></html>'
  const out = withFreeCredit(html)
  assert.equal(credits(out), 2, 'two frames, not the pgx div')
  assert.equal((out.match(/\.uil4b-credit\{/g) || []).length, 1)
  assert.match(out, /<section class="pg cover" data-page="a"><p class="uil4b-credit">Made with UIL4B<\/p>A/)
})

test('every Pro theme: the free guidelines and style guide are at most seven pages, every one with the credit', async () => {
  for (const { id: theme } of EXPORT_THEMES) {
    for (const row of ['slides', 'guide']) {
      if (!themeHasRow(theme, row) || !isThemeExportPro(row, theme)) continue
      const { html } = await renderThemeExport({ theme, row, format: 'pdf', design, projectName: 'Tide', freeEdition: true }, E)
      const n = frames(html)
      assert.ok(n >= 1 && n <= FREE_EDITION_PAGES, `${theme} ${row}: ${n} pages`)
      assert.equal(credits(html), n, `${theme} ${row}: a page without the credit`)
    }
  }
})

test('the phone edition of a free style guide site carries the credit, shown below the guide screen break', async () => {
  assert.equal(FREE_CREDIT_SCREEN_MAX, SCREEN_BREAK - 1)
  const out = withFreeCredit('<html><head></head><body><div class="sg-screen">phone</div>\n<div class="sg-pages"><section class="pg">p</section></div></body></html>')
  assert.match(out, /<div class="sg-screen">phone<\/div>\n<p class="uil4b-credit uil4b-credit--screen">Made with UIL4B<\/p>\n<div class="sg-pages">/)
  assert.match(out, new RegExp(`@media screen and \\(max-width:${SCREEN_BREAK - 1}px\\)\\{\\.uil4b-credit--screen\\{display:block\\}\\}`))
  assert.ok(!withFreeCredit('<html><head></head><body><section class="pg">p</section></body></html>').includes('uil4b-credit--screen'))
})
