// The Learn index: guides grouped by topic, a search that reads their text,
// and the section's own share card. The three product gaps the learn-content
// row in pipeline.js carried from the day the first guide shipped.
//
// tests/unit/learn-search.test.js proves the extractor and the matcher on
// disk. What only a browser can say is asserted here:
//
//   1. THE GROUPING IS NAVIGABLE. A <section> per topic with a real heading,
//      which is what a screen-reader user jumps between — and the grouping
//      comes from each guide's own `topic`, so every card sits under the
//      heading its registry entry names.
//   2. THE SEARCH REACHES THE BODY. The phrase searched for is picked by the
//      same rule the unit test uses: words a reader could only have got from
//      the guide's prose. If the page had quietly gone back to searching
//      titles, the card would still render and this would go red.
//   3. IT ANNOUNCES, IT IS OPERABLE WITHOUT A POINTER, AND IT NEVER STRANDS.
//      The result count reaches a live region; the field, its clear control,
//      the results and the empty state's way out are all on the Tab order;
//      and a search that matches nothing says what to do next.
//   4. THE RESULTS ARE ACTUALLY PAINTED. The landing's scroll reveal is a
//      one-shot observer; a card re-mounted by a search could carry the reveal
//      attribute with nothing left to reveal it, at opacity 0 for ever.
//      Playwright's toBeVisible() does not see opacity, so the value is read.
//   5. 390px, reduced motion and both themes — measured, not assumed.
//   6. /learn and every guide unfurl as the Learn card, not the homepage's.
import { test, expect } from './base.js'
import { expectRendered, go, watch } from './helpers.js'
import { LEARN_ARTICLES, TOPICS } from '../../src/data/learnIndex.js'
import { learnSearchText } from '../../scripts/learn-search-text.mjs'
import { bodyOnlyPhrase } from '../unit/helpers/learn-search-phrases.js'

const topicId = (topic) => `learn-topic-${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
const topicsWithGuides = TOPICS.filter((t) => LEARN_ARTICLES.some((a) => a.topic === t))
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

let bodies
let phrase
let target
test.beforeAll(async () => {
  bodies = await learnSearchText()
  // The first guide with a body-only phrase — there must be one, or the
  // search tests below would be searching for nothing.
  for (const a of LEARN_ARTICLES) {
    const p = bodyOnlyPhrase(a, LEARN_ARTICLES, bodies)
    if (p) { phrase = p; target = a; break }
  }
  expect(phrase, 'no guide has a phrase unique to its body — the search cannot be tested').toBeTruthy()
})

const field = (page) => page.getByRole('searchbox', { name: 'Search the guides' })

/**
 * Every running CSS transition and animation finished. The theme switch is
 * animated, so a colour read straight after flipping the attribute is a value
 * from the middle of the transition — measured once at 1.07:1, the light ink
 * on the dark ground — and would fail a page that reads perfectly well.
 */
const settled = (page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))

/** Computed opacity of every element matching `sel`. */
const opacities = (page, sel) => page.$$eval(sel, (els) => els.map((el) => getComputedStyle(el).opacity))

/**
 * WCAG contrast of an element's text against the ground actually behind it,
 * compositing translucent backgrounds down to the first opaque one.
 */
const contrastOf = (page, sel) => page.evaluate((sel) => {
  const el = document.querySelector(sel)
  if (!el) return null
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
    return { r, g, b, a: Number.isFinite(a) ? a : 1 }
  }
  const layers = []
  for (let node = el; node; node = node.parentElement) {
    const c = parse(getComputedStyle(node).backgroundColor)
    if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break }
  }
  let bg = layers.length && layers[layers.length - 1].a >= 1 ? layers.pop() : { r: 255, g: 255, b: 255, a: 1 }
  while (layers.length) {
    const top = layers.pop()
    bg = { r: top.r * top.a + bg.r * (1 - top.a), g: top.g * top.a + bg.g * (1 - top.a), b: top.b * top.a + bg.b * (1 - top.a), a: 1 }
  }
  const lin = (v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  const lum = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  const fg = parse(getComputedStyle(el).color)
  const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a)
  return { ratio: (hi + 0.05) / (lo + 0.05), fg: getComputedStyle(el).color, bg }
}, sel)

test.describe('the Learn index', () => {
  test('groups every guide under its own topic, as sections a screen reader can jump between', async ({ page }) => {
    watch(page, 'screen-reader user moving between the Learn topics by heading')
    await go(page, '/learn')

    // One labelled section per topic that has a guide, in the registry's order,
    // and nothing for a topic that has none.
    const sections = page.locator('.lidx-sections section[aria-labelledby]')
    await expect(sections).toHaveCount(topicsWithGuides.length)
    for (let i = 0; i < topicsWithGuides.length; i += 1) {
      const topic = topicsWithGuides[i]
      const section = sections.nth(i)
      await expect(section, `section ${i} is not ${topic}`).toHaveAttribute('id', topicId(topic))
      const heading = section.getByRole('heading', { level: 3 })
      await expect(heading, `${topic} has no h3`).toHaveCount(1)
      await expect(heading).toContainText(topic)
      const own = LEARN_ARTICLES.filter((a) => a.topic === topic)
      await expect(heading, `${topic}'s heading does not count its guides`)
        .toContainText(new RegExp(`\\b${own.length} guide`))
      // The section is labelled BY its own heading — same element, by id.
      const labelledBy = await section.getAttribute('aria-labelledby')
      await expect(heading).toHaveAttribute('id', labelledBy)

      // Every card under this heading is a guide of this topic, and every guide
      // of this topic is under it.
      const cards = section.locator('.lidx-card')
      await expect(cards).toHaveCount(own.length)
      for (const a of own) {
        await expect(section.locator(`.lidx-card[href="/learn/${a.slug}"]`),
          `${a.slug} is not under the ${topic} heading`).toHaveCount(1)
      }
    }
    await expect(page.locator('.lidx-card')).toHaveCount(LEARN_ARTICLES.length)

    // The topic links at the top point at sections that exist.
    const links = page.locator('.lidx-topics a')
    await expect(links).toHaveCount(topicsWithGuides.length)
    for (let i = 0; i < topicsWithGuides.length; i += 1) {
      const href = await links.nth(i).getAttribute('href')
      expect(href).toBe(`#${topicId(topicsWithGuides[i])}`)
      await expect(page.locator(href)).toBeAttached()
    }
    // And following one moves the reader to that section.
    await links.last().focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => new URL(page.url()).hash).toBe(`#${topicId(topicsWithGuides.at(-1))}`)
  })

  test('THE ONE THAT MATTERS: a phrase only the body says finds its guide, and the page says so', async ({ page }) => {
    watch(page, 'reader searching for something they remember from inside a guide')
    await go(page, '/learn')

    const input = field(page)
    await expect(input).toBeVisible()
    const status = page.locator('[role="status"]')
    await expect(status).toHaveAttribute('aria-live', 'polite')
    await expect(status).toHaveText('')

    await input.fill(phrase)
    const cards = page.locator('.lidx-card')
    await expect(cards, `"${phrase}" should match exactly ${target.slug}`).toHaveCount(1)
    await expect(cards.first()).toHaveAttribute('href', `/learn/${target.slug}`)
    // The card shows the sentence it matched in, with the term marked — the
    // reader has no other way to see why a title that says nothing of the
    // sort came back.
    const hit = cards.first().locator('.lidx-hit')
    await expect(hit).toBeVisible()
    const marked = (await hit.locator('mark').innerText()).toLowerCase()
    expect(phrase.split(' ').some((t) => marked.includes(t)), `the mark "${marked}" carries no term of "${phrase}"`).toBe(true)
    expect(marked, 'the mark is a stub of a word rather than the word').toMatch(/^\S+$/)
    await expect(status).toHaveText(new RegExp(`^1 guide matches “${esc(phrase)}”\\.$`))
    // The card is still under its topic's heading, so the grouping survives a
    // search rather than collapsing to a flat list.
    await expect(page.locator(`#${topicId(target.topic)} .lidx-card`)).toHaveCount(1)
    await expect(page.locator(`#${topicId(target.topic)} h3`)).toContainText(/1 of \d+/)

    // A title word ranks the titled guide first among several — first on the
    // PAGE, which means its topic group moves ahead of a group whose only hit
    // is a body mention, rather than first within its own group.
    await input.fill('scale')
    await expect(cards.first()).toHaveAttribute('href', '/learn/type-scales')
    await expect(page.locator('.lidx-sections section').first()).toHaveAttribute('id', topicId('Typography'))
    const n = await cards.count()
    expect(n).toBeGreaterThan(1)
    expect(await page.locator('.lidx-sections section').count(), '"scale" should span more than one topic for this ordering to mean anything')
      .toBeGreaterThan(1)
    await expect(status).toHaveText(`${n} guides match “scale”.`)

    // Escape empties the field and the whole index comes back.
    await input.press('Escape')
    await expect(input).toHaveValue('')
    await expect(cards).toHaveCount(LEARN_ARTICLES.length)
    await expect(status).toHaveText(`Showing all ${LEARN_ARTICLES.length} guides.`)
  })

  test('a search that matches nothing says what to do next, and the way out is on the keyboard', async ({ page }) => {
    watch(page, 'keyboard-only reader whose search came back empty')
    await go(page, '/learn')
    const input = field(page)
    await input.fill('qzxvw')

    await expect(page.locator('.lidx-card')).toHaveCount(0)
    const empty = page.locator('.lidx-empty')
    await expect(empty).toBeVisible()
    await expect(empty).toContainText('No guide mentions “qzxvw”')
    // Says what to do: a narrower term, or a topic — every topic by name.
    await expect(empty).toContainText(/try/i)
    for (const t of topicsWithGuides) await expect(empty).toContainText(t.toLowerCase())
    await expect(page.locator('[role="status"]')).toHaveText('No guide mentions “qzxvw”.')

    // Tab: field → clear control → the empty state's way out. Enter on it
    // restores the index and puts focus back in the field.
    await input.focus()
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAccessibleName('Clear search')
    await page.keyboard.press('Tab')
    const out = page.locator(':focus')
    await expect(out).toHaveText(`Show all ${LEARN_ARTICLES.length} guides`)
    const box = await out.boundingBox()
    expect(box.height, 'the way out is below the 24px target floor').toBeGreaterThanOrEqual(24)
    await page.keyboard.press('Enter')
    await expect(page.locator('.lidx-card')).toHaveCount(LEARN_ARTICLES.length)
    await expect(input).toBeFocused()
    await expect(empty).toHaveCount(0)
  })

  test('keyboard-only: from the field, through a result, into the guide', async ({ page }) => {
    watch(page, 'keyboard-only reader opening a search result')
    await go(page, '/learn')
    const input = field(page)
    await input.fill(phrase)
    await expect(page.locator('.lidx-card')).toHaveCount(1)
    await page.keyboard.press('Tab') // the clear control
    await page.keyboard.press('Tab') // the one result
    const focused = page.locator(':focus')
    await expect(focused).toHaveClass(/lidx-card/)
    await expect(focused).toHaveAttribute('href', `/learn/${target.slug}`)
    await page.keyboard.press('Enter')
    await expect.poll(() => new URL(page.url()).pathname).toBe(`/learn/${target.slug}`)
    await expectRendered(page, `/learn/${target.slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(target.title)
  })

  test('results are painted, not stranded by the scroll reveal — with and without reduced motion', async ({ page }) => {
    watch(page, 'reader who searched, cleared, and searched again')
    for (const reduced of [false, true]) {
      await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
      await go(page, '/learn')
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(reduced)
      const input = field(page)
      await input.fill(phrase)
      await expect(page.locator('.lidx-card')).toHaveCount(1)
      expect(await opacities(page, '.lidx-card'), `reduced=${reduced}: the result is invisible`).toEqual(['1'])
      // Clear, then the whole index has to be painted — these cards were
      // re-mounted after useReveal()'s one scan, so nothing will reveal them.
      await input.fill('')
      await expect(page.locator('.lidx-card')).toHaveCount(LEARN_ARTICLES.length)
      await expect.poll(() => opacities(page, '.lidx-card'), {
        message: `reduced=${reduced}: cards re-mounted after a search are stuck transparent`,
      }).toEqual(Array(LEARN_ARTICLES.length).fill('1'))
      // And a second search still finds it.
      await input.fill(phrase)
      await expect(page.locator('.lidx-card')).toHaveCount(1)
    }
  })

  test('holds together at 390px', async ({ page }) => {
    watch(page, 'reader searching the guides on a phone')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/learn')
    const input = field(page)
    const fieldBox = await page.locator('.lidx-tools .lbry-search').boundingBox()
    expect(fieldBox.height, 'the field is below a comfortable touch height').toBeGreaterThanOrEqual(44)
    expect(fieldBox.width).toBeLessThanOrEqual(390)

    for (const q of [phrase, 'scale', 'qzxvw']) {
      await input.fill(q)
      await expect(page.locator('[role="status"]')).not.toHaveText('')
      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
      }))
      expect(overflow.scroll, `"${q}" at 390px scrolls sideways: ${overflow.scroll} > ${overflow.client}`)
        .toBeLessThanOrEqual(overflow.client + 1)
    }
    const clear = page.getByRole('button', { name: 'Clear search' })
    const clearBox = await clear.boundingBox()
    expect(Math.min(clearBox.width, clearBox.height)).toBeGreaterThanOrEqual(24)
    await expect(page.locator('.lidx-empty .ui-pill')).toBeVisible()
    await input.fill(phrase)
    await expect(page.locator('.lidx-hit')).toBeVisible()
  })

  test('reads in both themes, by measured contrast', async ({ page }) => {
    watch(page, 'reader searching the guides in the dark theme, then the light')
    await go(page, '/learn')
    const input = field(page)
    const seen = {}
    for (const theme of ['light', 'dark']) {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
      await input.fill(phrase)
      await settled(page)
      await expect(page.locator('.lidx-hit mark')).toBeVisible()
      const checks = {
        status: '.lidx-status',
        heading: '.lidx-topic-h',
        count: '.lidx-topic-h .lidx-topic-n',
        snippet: '.lidx-hit',
        mark: '.lidx-hit mark',
        field: '.lidx-tools .lbry-search input',
      }
      for (const [name, sel] of Object.entries(checks)) {
        const c = await contrastOf(page, sel)
        expect(c, `${sel} not found`).toBeTruthy()
        expect(c.ratio, `${theme}: ${name} (${sel}) reads ${c.fg} on ${JSON.stringify(c.bg)} at ${c.ratio.toFixed(2)}:1`)
          .toBeGreaterThanOrEqual(4.5)
      }
      await input.fill('qzxvw')
      await settled(page)
      for (const sel of ['.lidx-empty-h', '.lidx-empty-p', '.lidx-empty .ui-pill']) {
        const c = await contrastOf(page, sel)
        expect(c.ratio, `${theme}: ${sel} at ${c.ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      }
      await input.fill('')
      await settled(page)
      for (const sel of ['.lidx-topics a', '.lidx-topics .lidx-topic-n']) {
        const c = await contrastOf(page, sel)
        expect(c.ratio, `${theme}: ${sel} at ${c.ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      }
      seen[theme] = await page.locator('.lidx-tools .lbry-search').evaluate((el) => getComputedStyle(el).backgroundColor)
    }
    // Positive control: the field actually changed ground between themes, so
    // the two passes above measured two different pages.
    expect(seen.light).not.toBe(seen.dark)
  })
})

test.describe('the Learn share card', () => {
  test('/learn and every guide unfurl as the Learn card, and the card is served', async ({ request }) => {
    // An unfurler reads the SERVED DOCUMENT and runs no JavaScript, so this
    // reads the shell the server returns rather than the DOM after boot. The
    // trailing slash is the test server's doing, not the product's: `vite
    // preview` resolves `/learn/` to dist/learn/index.html but answers a bare
    // `/learn` with the SPA fallback, whereas in production vercel.json rewrites
    // the bare path to the same shell (tests/unit/prerender-routes.test.js
    // holds the rewrites and the shells together). Measured before writing
    // this: `/learn` → og-image.png, `/learn/` → og-learn.png, on one build.
    const image = (html, attrName, key) => {
      const m = html.match(new RegExp(`<meta\\s+${attrName}="${key}"\\s+content="([^"]*)"`))
      return m ? m[1] : null
    }
    for (const route of ['/learn', ...LEARN_ARTICLES.map((a) => `/learn/${a.slug}`)]) {
      const res = await request.get(`${route}/`)
      expect(res.ok(), `${route}/ did not serve`).toBe(true)
      const html = await res.text()
      expect(image(html, 'property', 'og:image'), `${route} unfurls as a different picture`)
        .toMatch(/\/previews\/og-learn\.png$/)
      expect(image(html, 'name', 'twitter:image')).toMatch(/\/previews\/og-learn\.png$/)
      expect(image(html, 'property', 'og:image:alt'))
        .toMatch(new RegExp(`^UI L4B Learn — ${LEARN_ARTICLES.length} guides on `))
      // And it is Learn's shell, not the fallback wearing Learn's picture.
      expect(html).toMatch(/<title>UI L4B \| /)
      expect(html).not.toMatch(/<title>UI L4B \| Design Toolkit<\/title>/)
    }
    // Control: the section next door has not been swept into it.
    const discover = await (await request.get('/discover/')).text()
    expect(image(discover, 'property', 'og:image')).toMatch(/\/previews\/og-discover\.png$/)

    const response = await request.get('/previews/og-learn.png')
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toMatch(/^image\/png\b/i)
    const body = await response.body()
    expect([...body.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(body.readUInt32BE(16)).toBe(1200)
    expect(body.readUInt32BE(20)).toBe(630)
    expect(body.length).toBeLessThanOrEqual(200 * 1024)
  })
})
