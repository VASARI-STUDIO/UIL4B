// THE HOMEPAGE EXPORTS SECTION (#exports), AS A VISITOR MEETS IT.
//
// Three stacked cards (.hx-card): card 1 picks a piece (palette, type scale,
// images, icons) and a format and copies the file; card 2 brings one of the
// export files forward; card 3 picks one of three sample projects. The export
// themes switch ships off, so card 2 shows the three exports the app makes today.
// From 1024 wide and 560 tall the cards stack: each docks 12px lower than the one
// before and a covered card does not change. Anywhere smaller they are a plain column.
//
// Every test names, in a comment, the source change that turns it red.
import { test, expect } from './base.js'
import { go, HOME_LAZY_SECTIONS, watch } from './helpers.js'

const SECTION = '#exports'
const card = (page, i) => page.locator(`${SECTION} .hx-card[data-card="${i}"]`)
const group = (page, name) => page.locator(SECTION).getByRole('group', { name, exact: true })
const pieces = (page) => group(page, 'What to export').getByRole('button')
const formats = (page) => group(page, 'File format').getByRole('button')
const fileName = (page) => card(page, 0).locator('.hx-fname')
const copyPill = (page) => card(page, 0).locator('.hx-pill')
const docRows = (page) => group(page, 'Which file to bring forward').getByRole('button')
const projectRows = (page) => group(page, 'Example projects').getByRole('button')

const squash = (s) => s.replace(/\s+/g, ' ').trim()

// The page attaches its first-input listener after the route commits, so a press sent before that is lost.
// The key is pressed until the stand-ins are gone. It is a key and not a wheel on purpose: the app's
// smooth scroll (Lenis, useSmoothScroll.js) turns every wheel into a lerped scroll that keeps writing
// the scroll position to the page's top for a second or more, and a scroll this test aims in that
// window is undone: the page is back at 3px, the cards at 6209, 6897 and 7585, the covered cards unscaled.
// A key opens the sections the same way (useBelowFoldReady) and scrolls nothing.
// homeSectionsLoaded is not used here for the same reason: it sends a wheel.
async function sectionsLoaded(page) {
  await expect.poll(async () => {
    await page.keyboard.press('Shift')
    return page.locator('[data-deferred-hold]').count()
  }, { message: 'the below-fold sections never mounted', timeout: 20_000, intervals: [500] }).toBe(0)
  for (const id of HOME_LAZY_SECTIONS) {
    await expect(page.locator(`#${id} h2`), `the ${id} section never loaded`).toBeAttached({ timeout: 20_000 })
  }
}

async function open(browser, { width = 1440, height = 900, touch = false, reducedMotion = 'no-preference', permissions = [], stubClipboard } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    reducedMotion,
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
  })
  if (permissions.length) await ctx.grantPermissions(permissions)
  if (stubClipboard) await ctx.addInitScript(stubClipboard)
  const page = await ctx.newPage()
  watch(page, 'a visitor on the homepage')
  await go(page, '/')
  // The section loads after the first screen; the rest of the page's sections too,
  // and the ones above it change its place when they arrive.
  await sectionsLoaded(page)
  // Rest card 1 at its dock line, as a visitor scrolling down meets it, so cards 2 and 3 are not yet over its controls.
  await page.evaluate(() => {
    const first = document.querySelector('#exports .hx-card[data-card="0"]')
    const sticky = getComputedStyle(first).position === 'sticky'
    window.scrollTo(0, first.parentElement.getBoundingClientRect().top + window.scrollY - (sticky ? parseFloat(getComputedStyle(first).top) : 72))
  })
  return { ctx, page }
}

// ── card 1: the picker ─────────────────────────────────────────────────────────

test('card 1 offers four pieces and each one swaps the file and the picture', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  try {
    await expect(pieces(page)).toHaveCount(4)
    // Red if PIECES loses or reorders a piece, or pickPiece stops swapping the view.
    const expected = [
      { name: /^Palette/, file: 'kerbside-palette.css', view: 'palette', count: 10 },
      { name: /^Type scale/, file: 'kerbside-type-scale.css', view: 'type', count: 6 },
      { name: /^Compressed images/, file: 'kerbside-images-webp.zip', view: 'images', count: 5 },
      { name: /^Icons/, file: 'kerbside-icons-svg.zip', view: 'icons', count: 24 },
    ]
    for (const [i, e] of expected.entries()) {
      const piece = pieces(page).nth(i)
      await expect(piece).toHaveAccessibleName(e.name)
      await piece.click()
      await expect(piece).toHaveAttribute('aria-pressed', 'true')
      await expect(pieces(page).locator('xpath=self::*[@aria-pressed="true"]')).toHaveCount(1)
      await expect(fileName(page)).toHaveText(e.file)
      const view = card(page, 0).locator(`[data-view="${e.view}"]`)
      await expect(view).toBeVisible()
      // Red if a view draws the wrong number of rows, cells or icons.
      await expect(view.locator(':scope > *')).toHaveCount(e.count)
    }
  } finally {
    await ctx.close()
  }
})

test('card 1 palette ramp runs 50 to 900 with Signal as the one primary', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  try {
    const rows = card(page, 0).locator('[data-view="palette"] .hx-rrow')
    await expect(rows.first().locator('.hx-step')).toHaveText('50')
    await expect(rows.last().locator('.hx-step')).toHaveText('900')
    // Red if kerbsideRamp stops pinning the 500 step to the brand hex, or marks a second row primary.
    const primary = card(page, 0).locator('.hx-rrow', { has: page.locator('.hx-role') })
    await expect(primary).toHaveCount(1)
    await expect(primary.locator('.hx-step')).toHaveText('500')
    await expect(primary.locator('.hx-hex')).toHaveText('#FF5A1F')
  } finally {
    await ctx.close()
  }
})

test('card 1 format segments rename the file, and a new piece starts on its first format', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  try {
    await expect(formats(page)).toHaveText(['CSS', 'Tailwind', 'JSON'])
    // Red if TOKEN_FORMATS changes its labels or extensions, or the segments stop driving the file name.
    for (const [label, file] of [['Tailwind', 'kerbside-palette.js'], ['JSON', 'kerbside-palette.json'], ['CSS', 'kerbside-palette.css']]) {
      const seg = formats(page).filter({ hasText: new RegExp(`^${label}$`) })
      await seg.click()
      await expect(seg).toHaveAttribute('aria-pressed', 'true')
      await expect(fileName(page)).toHaveText(file)
    }
    await formats(page).nth(2).click()
    await pieces(page).nth(1).click()
    // Red if pickPiece stops resetting the format (the type scale would stay on JSON).
    await expect(fileName(page)).toHaveText('kerbside-type-scale.css')
    // Images and icons make one kind of file each.
    await pieces(page).nth(2).click()
    await expect(formats(page)).toHaveText(['WebP'])
    await expect(card(page, 0).locator('.hx-fsize')).toHaveText('1.16 MB')
    await pieces(page).nth(3).click()
    await expect(formats(page)).toHaveText(['SVG'])
  } finally {
    await ctx.close()
  }
})

// ── card 1: Copy file ──────────────────────────────────────────────────────────

test('Copy file puts the chosen format on the clipboard and then says Copied', async ({ browser }) => {
  const { ctx, page } = await open(browser, { permissions: ['clipboard-read', 'clipboard-write'] })
  try {
    await expect(copyPill(page)).toHaveText('Copy file')
    await copyPill(page).click()
    await expect(copyPill(page)).toHaveText('Copied')
    // Red if copyFile writes another text than file.text (the clipboard would not start with :root).
    // The Windows clipboard turns line feeds into CRLF on the way back.
    const css = (await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n')
    expect(css.startsWith(':root {\n  --kerbside-50: ')).toBe(true)
    expect(css).toContain('\n  --kerbside-500: #FF5A1F;\n')
    expect(css.endsWith('}\n')).toBe(true)
    // The label goes back on its own.
    await expect(copyPill(page)).toHaveText('Copy file', { timeout: 4000 })

    // Red if the segment picked stops reaching the copied text.
    await formats(page).filter({ hasText: /^JSON$/ }).click()
    await expect(copyPill(page)).toHaveText('Copy file')
    await copyPill(page).click()
    await expect(copyPill(page)).toHaveText('Copied')
    const json = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))
    expect(json.kerbside['500']).toEqual({ $value: '#FF5A1F' })
  } finally {
    await ctx.close()
  }
})

// A clipboard whose write stays pending until the test settles it, so the moment
// between click and answer can be looked at.
const PENDING_CLIPBOARD = () => {
  Object.defineProperty(navigator.clipboard, 'writeText', {
    configurable: true,
    value: (text) => new Promise((resolve, reject) => {
      window.__clip = { text, resolve, reject }
    }),
  })
}

test('Copied waits for the clipboard write to succeed', async ({ browser }) => {
  const { ctx, page } = await open(browser, { stubClipboard: PENDING_CLIPBOARD })
  try {
    await copyPill(page).click()
    await page.waitForFunction(() => window.__clip)
    // Red if copyFile calls setCopied(true) before the write promise settles.
    await expect(copyPill(page)).toHaveText('Copy file')
    await page.evaluate(() => window.__clip.resolve())
    await expect(copyPill(page)).toHaveText('Copied')
  } finally {
    await ctx.close()
  }
})

test('with the clipboard denied, Copy file never says Copied', async ({ browser }) => {
  const { ctx, page } = await open(browser, { stubClipboard: PENDING_CLIPBOARD })
  try {
    await copyPill(page).click()
    await page.waitForFunction(() => window.__clip)
    await page.evaluate(() => window.__clip.reject(new DOMException('denied', 'NotAllowedError')))
    // Red if the rejection handler sets copied, or copyFile reports success without awaiting the write.
    await page.waitForTimeout(300)
    await expect(copyPill(page)).toHaveText('Copy file')
    await expect(page.locator(SECTION)).not.toContainText('Copied')
  } finally {
    await ctx.close()
  }
})

// ── card 2 ─────────────────────────────────────────────────────────────────────

test('card 2 lists the exports a theme offers, and the caption names the theme', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  try {
    // Red if exportRows or exportCopy stop following EXPORT_THEMES_LIVE, or the brand kit gets a row of its own.
    await expect(docRows(page)).toHaveCount(3)
    const rows = (await docRows(page).allInnerTexts()).map(squash)
    expect(rows[0]).toMatch(/^Brand guidelines .*Pro$/)
    expect(rows[1]).toMatch(/^HTML brand book .*with the brand kit inside.*Pro$/)
    expect(rows[2]).toMatch(/^UI kit .*Free in 2 themes$/)
    await expect(card(page, 1).locator('.hx-cap')).toHaveText('Kerbside, a sample brand, in the Presentation theme. Set in Archivo and IBM Plex Sans.')
    await expect(card(page, 1).locator('.hx-note')).toHaveText('The UI kit is free in two of the ten themes. Everything else is Pro.')
  } finally {
    await ctx.close()
  }
})

test('picking a card 2 row brings that file forward and sends the others back', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  try {
    // The alt text of every picture marked in front, whether it is the image or the book window around it.
    const front = () => card(page, 1).locator('[data-front="true"]').evaluateAll((els) =>
      els.map((el) => (el.matches('img') ? el : el.querySelector('img')).alt).sort())
    // Red if `front` stops following the picked row, or an art id no longer matches its row.
    await docRows(page).nth(2).click()
    await expect(docRows(page).nth(2)).toHaveAttribute('aria-pressed', 'true')
    expect(await front()).toEqual(['The product screen page of the Kerbside UI kit'])
    await docRows(page).nth(1).click()
    expect(await front()).toEqual(['The Kerbside HTML brand book open at its overview'])
    await docRows(page).nth(0).click()
    expect(await front()).toEqual(['Cover of the Kerbside brand guidelines', 'The signage page of the Kerbside brand guidelines, a bus shelter poster'])
  } finally {
    await ctx.close()
  }
})

// ── card 3 ─────────────────────────────────────────────────────────────────────

const PILL = { 1440: '3 of 3 projects on Free', 768: '3 of 3 projects on Free', 390: '3 of 3 on Free', 320: '3 of 3' }

for (const [width, text] of Object.entries(PILL)) {
  test(`card 3 pill reads "${text}" at ${width}`, async ({ browser }) => {
    const w = Number(width)
    const { ctx, page } = await open(browser, { width: w, height: w < 500 ? 844 : 900, touch: w < 500 })
    try {
      // Red if the pill count stops coming from FREE_SAVE_LIMITS, or the CSS shows both tails or neither at this width.
      const pill = card(page, 2).locator('.hx-count')
      await expect(pill).toBeVisible()
      expect(squash(await pill.evaluate((el) => el.innerText))).toBe(text)
    } finally {
      await ctx.close()
    }
  })
}

test('picking a project at 1440 selects its tile and nothing else', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  try {
    await expect(projectRows(page)).toHaveCount(3)
    const tiles = card(page, 2).locator('.hx-tile')
    const selected = () => tiles.evaluateAll((els) => els.map((el) => el.dataset.selected))
    expect(await selected()).toEqual(['true', 'false', 'false'])
    // Red if setProj stops reaching the tiles' data-selected, or the rows' aria-pressed.
    await projectRows(page).nth(2).click()
    await expect(projectRows(page).nth(2)).toHaveAttribute('aria-pressed', 'true')
    expect(await selected()).toEqual(['false', 'false', 'true'])
    await expect(card(page, 2).locator('.hx-tname').nth(2)).toHaveText('Shallow End, swim lessons')
  } finally {
    await ctx.close()
  }
})

for (const width of [390, 320]) {
  test(`at ${width} the picked project's tile slides fully onto the screen`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { width, height: 844, touch: true })
    try {
      await card(page, 2).scrollIntoViewIfNeeded()
      // Red if the strip stops following --proj (the third tile would stay off to the right).
      for (const i of [1, 2]) {
        await projectRows(page).nth(i).click()
        await expect.poll(() => card(page, 2).locator('.hx-tile').nth(i).evaluate((el) => {
          const r = el.getBoundingClientRect()
          return r.left >= 0 && r.right <= window.innerWidth
        }), { timeout: 3000 }).toBe(true)
      }
    } finally {
      await ctx.close()
    }
  })
}

// ── the still pile ─────────────────────────────────────────────────────────────

// What a card looks like now, read in one pass: its place, its size, and everything that would
// change it as it is covered. A card's own opacity stays 1 so no card shows through another.
const LOOKS = () => [...document.querySelectorAll('#exports .hx-card')].map((c) => {
  const s = getComputedStyle(c)
  const r = c.getBoundingClientRect()
  return {
    top: Math.round(r.top),
    width: Math.round(r.width),
    height: Math.round(r.height),
    position: s.position,
    transform: s.transform,
    opacity: s.opacity,
    filter: s.filter,
    shadow: s.boxShadow,
    after: getComputedStyle(c, '::after').content,
    animated: s.animationName,
    inert: c.inert,
  }
})
const STILL = { transform: 'none', opacity: '1', filter: 'none', shadow: 'none', after: 'none', animated: 'none' }

// Scroll so the third card is `extra` px past the moment the whole pile is docked. Aimed again on every read:
// a late layout shift between two reads would otherwise leave the page elsewhere.
const aimPile = (page, extra) => page.evaluate((x) => {
  const third = document.querySelector('#exports .hx-card[data-card="2"]')
  window.scrollTo(0, third.parentElement.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(third).top) || 0) + x)
}, extra)
const readAt = async (page, extra) => { await aimPile(page, extra); return page.evaluate(LOOKS) }

// Every look a card takes from above the section to below it, at 50px steps.
const sweep = (page, step = 50) => page.evaluate(async (by) => {
  const sec = document.querySelector('#exports')
  const from = sec.getBoundingClientRect().top + window.scrollY - 300
  const to = from + sec.offsetHeight + 300
  const seen = new Set()
  for (let y = from; y < to; y += by) {
    window.scrollTo(0, y)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    for (const c of document.querySelectorAll('#exports .hx-card')) {
      const s = getComputedStyle(c)
      const r = c.getBoundingClientRect()
      seen.add(JSON.stringify({ t: s.transform, o: s.opacity, f: s.filter, s: s.boxShadow, w: Math.round(r.width), h: Math.round(r.height) }))
    }
  }
  return [...seen]
}, step)




const DOCKS = {
  '1440x900': [84, 96, 108],
  '1366x768': [52, 64, 76],
  '1280x720': [28, 40, 52],
  '1024x768': [52, 64, 76],
}

for (const [size, docks] of Object.entries(DOCKS)) {
  test(`at ${size} the cards dock at ${docks.join(', ')} and the last card fits the screen`, async ({ browser }) => {
    const [width, height] = size.split('x').map(Number)
    const { ctx, page } = await open(browser, { width, height })
    try {
      // Red if --hx-base, the 12px step or the media query change (tops), or if the dock line stops following the
      // window height (card 3 would run past the bottom of a short screen).
      await expect.poll(async () => (await readAt(page, 120)).map((l) => l.top), { timeout: 10_000 }).toEqual(docks)
      const fit = await page.evaluate(() => {
        const last = document.querySelector('#exports .hx-card[data-card="2"]')
        const r = last.getBoundingClientRect()
        const buttons = [...last.querySelectorAll('button')].map((b) => b.getBoundingClientRect())
        return { top: r.top, bottom: r.bottom, inside: buttons.every((b) => b.top >= 0 && b.bottom <= window.innerHeight), height: window.innerHeight }
      })
      expect(fit.top).toBeGreaterThanOrEqual(0)
      expect(fit.bottom).toBeLessThanOrEqual(fit.height)
      expect(fit.inside).toBe(true)
    } finally {
      await ctx.close()
    }
  })
}

for (const [width, height] of [[1440, 900], [1024, 768]]) {
  test(`at ${width} no card scales, dims, filters or casts a shadow at any scroll position`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { width, height })
    try {
      // Red if a transform, opacity, filter, box-shadow, animation or dimming layer comes back on .hx-card, or a card
      // changes size as it is covered. Every position is read, so a single frame that differs makes a second look.
      const looks = (await sweep(page)).map((l) => JSON.parse(l))
      expect(looks).toEqual([{ t: 'none', o: '1', f: 'none', s: 'none', w: looks[0].w, h: 640 }])
      const pile = await readAt(page, 120)
      for (const l of pile) expect(l).toMatchObject({ ...STILL, height: 640 })
    } finally {
      await ctx.close()
    }
  })
}

test('at 1440 the top 12px of a covered card stays in view, holds no text, and the edges count the pile', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  try {
    // Red if the dock step changes from 12px, a card is lifted above the one before it, or text moves into a card's top 12px.
    await expect.poll(async () => (await readAt(page, 120)).map((l) => l.top), { timeout: 10_000 }).toEqual([84, 96, 108])
    const edges = await page.evaluate(() => {
      const cardAt = (x, y) => document.elementsFromPoint(x, y).find((el) => el.closest(".hx-card"))?.closest(".hx-card")?.dataset.card ?? null
      const cards = [...document.querySelectorAll('#exports .hx-card')]
      return cards.map((c, i) => {
        const r = c.getBoundingClientRect()
        const x = r.left + r.width / 2
        const text = []
        if (i < 2) {
          const walker = document.createTreeWalker(c, NodeFilter.SHOW_TEXT)
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            if (!n.textContent.trim()) continue
            const range = document.createRange()
            range.selectNodeContents(n)
            for (const q of range.getClientRects()) if (q.width && q.top < r.top + 12 && q.bottom > r.top) text.push(n.textContent.trim().slice(0, 12))
          }
        }
        return { top: r.top, seen: cardAt(x, r.top + 6), text }
      })
    })
    expect(edges.map((e) => e.seen)).toEqual(['0', '1', '2'])
    expect(edges[1].top - edges[0].top).toBe(12)
    expect(edges[2].top - edges[1].top).toBe(12)
    expect(edges.map((e) => e.text)).toEqual([[], [], []])
  } finally {
    await ctx.close()
  }
})

test('at 1440 the finished pile holds still for 240px of scroll, then closes up and leaves as one block', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  try {
    const tops = async (extra) => (await readAt(page, extra)).map((l) => l.top)
    // Red if .hx-tail drops under 240px, or the nests change so the cards no longer leave together.
    for (const extra of [2, 120, 238]) await expect.poll(() => tops(extra), { message: `${extra}px into the hold`, timeout: 10_000 }).toEqual([84, 96, 108])
    await expect.poll(async () => (await tops(280))[2] < 108, { message: 'card 3 never left after the hold' }).toBe(true)
    await expect.poll(async () => { const t = await tops(300); return t[0] === t[1] && t[1] === t[2] && t[0] < 84 }, { message: 'the pile did not close up into one block' }).toBe(true)
  } finally {
    await ctx.close()
  }
})

for (const [width, height, gap] of [[1440, 900, 48], [390, 844, 32]]) {
  test(`at ${width} the footnote sits ${gap}px or more below the last card`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { width, height, touch: width < 500 })
    try {
      // Red if .hx-foot loses its top margin, or a tail pushes the footnote against the card.
      await expect.poll(async () => {
        await page.evaluate(() => window.scrollTo(0, document.querySelector('#exports .hx-foot').getBoundingClientRect().top + window.scrollY - window.innerHeight + 80))
        return page.evaluate(() => Math.round(document.querySelector('#exports .hx-foot').getBoundingClientRect().top - document.querySelector('#exports .hx-card[data-card="2"]').getBoundingClientRect().bottom))
      }, { timeout: 10_000 }).toBeGreaterThanOrEqual(gap)
    } finally {
      await ctx.close()
    }
  })
}

test('a covered card is inert and a tab stop is never behind a card', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  try {
    // Red if the tracker observer stops marking covered cards (the inert flags would stay false), or marks a card early.
    await expect.poll(async () => (await readAt(page, 120)).map((l) => l.inert), { timeout: 10_000 }).toEqual([true, true, false])
    await expect.poll(async () => (await readAt(page, -300)).map((l) => l.inert), { timeout: 10_000 }).toEqual([true, false, false])
    await page.locator('#exports-h').focus()
    // The heading is above the pile, so focusing it scrolls up and the covered cards leave their inert state a frame later.
    await expect.poll(() => page.evaluate(() => document.querySelector('#exports .hx-card').inert)).toBe(false)
    const behind = () => page.evaluate(() => {
      const el = document.activeElement
      const card = el.closest?.('.hx-card')
      if (!card) return null
      const r = el.getBoundingClientRect()
      const top = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find((e) => e.closest('.hx-card'))
      return { inertCard: card.inert, hidden: !top || !el.contains(top), onScreen: r.top >= 0 && r.bottom <= window.innerHeight }
    })
    // Tab forward: every stop is in a card that is not inert and is not hit-tested as covered.
    const forward = []
    for (let n = 0; n < 14; n++) {
      await page.keyboard.press('Tab')
      await page.waitForTimeout(150)
      forward.push(await behind())
    }
    for (const stop of forward.filter(Boolean)) expect(stop).toEqual({ inertCard: false, hidden: false, onScreen: true })
    // Shift+Tab back: a docked, covered card is skipped, so no stop is ever inside an inert card. (While the last card is
    // still sliding in, the card before it is not yet inert and a stop can sit partly under it.)
    for (let n = 0; n < 14; n++) {
      await page.keyboard.press('Shift+Tab')
      await page.waitForTimeout(150)
      expect((await behind())?.inertCard ?? false).toBe(false)
    }
  } finally {
    await ctx.close()
  }
})

for (const [width, height, touch] of [[1023, 768, false], [768, 1024, false], [390, 844, true], [320, 640, true], [1440, 540, false]]) {
  test(`at ${width}x${height} the cards are a plain column: nothing sticks and nothing is inert`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { width, height, touch })
    try {
      // Red if the sticky rules leak outside the 1024x560 media query, or inert is set on a column.
      const first = await page.evaluate(LOOKS)
      for (const l of first) expect(l).toMatchObject({ ...STILL, position: 'static', inert: false })
      const moved = await page.evaluate(async () => {
        const cards = [...document.querySelectorAll('#exports .hx-card')]
        const tops = () => cards.map((c) => c.getBoundingClientRect().top)
        const start = cards[1].getBoundingClientRect().top + window.scrollY - 200
        window.scrollTo(0, start)
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        const a = tops()
        window.scrollTo(0, start + 120)
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        return tops().map((t, i) => Math.round(a[i] - t))
      })
      expect(moved).toEqual([120, 120, 120])
    } finally {
      await ctx.close()
    }
  })
}

for (const [label, width, height, touch, stacked] of [['1440', 1440, 900, false, true], ['390', 390, 844, true, false], ['320', 320, 640, true, false]]) {
  test(`at ${label} a visitor who asked for no motion gets the same still cards, by the OS and by the Settings`, async ({ browser }) => {
    for (const how of ['os', 'settings']) {
      const ctx = await browser.newContext({
        viewport: { width, height },
        reducedMotion: how === 'os' ? 'reduce' : 'no-preference',
        ...(touch ? { hasTouch: true, isMobile: true } : {}),
      })
      if (how === 'settings') {
        await ctx.addInitScript(() => localStorage.setItem('vs-appearance', JSON.stringify({ rounding: 'default', density: 'cozy', reducedMotion: true })))
      }
      const page = await ctx.newPage()
      try {
        await go(page, '/')
        await sectionsLoaded(page)
        // Red if the pile starts to need an animation or a script on the scroll (the cards would differ here).
        if (stacked) await expect.poll(async () => (await readAt(page, 120)).map((l) => l.top), { message: how, timeout: 10_000 }).toEqual([84, 96, 108])
        else await aimPile(page, 120)
        for (const look of await page.evaluate(LOOKS)) expect(look, `${how} at ${width}`).toMatchObject({ ...STILL, position: stacked ? 'sticky' : 'static' })
      } finally {
        await ctx.close()
      }
    }
  })
}

// ── phone ──────────────────────────────────────────────────────────────────────

for (const width of [390, 320]) {
  test(`at ${width} the section does not scroll sideways and every control is on the screen`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { width, height: 844, touch: true })
    try {
      // Walk the section so lazy pictures and the stuck cards are laid out.
      for (const i of [0, 1, 2]) await card(page, i).scrollIntoViewIfNeeded()
      // Red if any row, pill or tile in the section is wider than the screen.
      const wide = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth - window.innerWidth,
        section: document.querySelector('#exports').scrollWidth - document.querySelector('#exports').clientWidth,
        off: [...document.querySelectorAll('#exports button')]
          .filter((b) => b.offsetParent)
          .map((b) => b.getBoundingClientRect())
          .filter((r) => r.left < -0.5 || r.right > window.innerWidth + 0.5).length,
      }))
      expect(wide).toEqual({ page: expect.any(Number), section: 0, off: 0 })
      expect(wide.page).toBeLessThanOrEqual(0)
    } finally {
      await ctx.close()
    }
  })
}

// ── keyboard ───────────────────────────────────────────────────────────────────

test('Tab walks card 1, 2 and 3 in order, each stop shows a 2px focus ring, and Enter picks', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  try {
    await page.locator('#exports-h').focus()
    const stops = []
    for (let n = 0; n < 14; n++) {
      await page.keyboard.press('Tab')
      stops.push(await page.evaluate(() => {
        const el = document.activeElement
        const s = getComputedStyle(el)
        return {
          text: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 12),
          card: el.closest('.hx-card')?.dataset.card ?? null,
          ring: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`,
        }
      }))
      if (n === 1) {
        // The second stop is the Type scale piece; Enter picks it from the keyboard.
        await page.keyboard.press('Enter')
        await expect(fileName(page)).toHaveText('kerbside-type-scale.css')
      }
    }
    // Four pieces, three formats and Copy file are card 1; three rows each are cards 2 and 3.
    expect(stops.map((s) => s.card)).toEqual(['0', '0', '0', '0', '0', '0', '0', '0', '1', '1', '1', '2', '2', '2'])
    expect(stops.slice(0, 4).map((s) => s.text)).toEqual(['Palette CSS,', 'Type scale C', 'Compressed i', 'Icons SVG'])
    // Red if the focus-visible rule on .hx buttons is removed or recoloured.
    for (const stop of stops) expect(stop.ring).toBe('solid 2px rgb(239, 238, 234)')
  } finally {
    await ctx.close()
  }
})

// ── reduced motion ─────────────────────────────────────────────────────────────

for (const [reducedMotion, runs] of [['reduce', false], ['no-preference', true]]) {
  test(`card 2 file swap ${runs ? 'animates' : 'does not animate'} with motion ${reducedMotion}`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { reducedMotion })
    try {
      const objs = card(page, 1).locator('.hx-obj')
      // Red if the reduced-motion rule is dropped from home-exports.css (the swap would run, or only the site backstop would remain).
      const styles = await objs.evaluateAll((els) => els.map((el) => {
        const s = getComputedStyle(el)
        return { property: s.transitionProperty, duration: s.transitionDuration }
      }))
      await page.evaluate(() => {
        window.__swapRuns = 0
        document.querySelector('#exports .hx-card[data-card="1"]').addEventListener('transitionrun', (e) => {
          if (e.target.classList.contains('hx-obj')) window.__swapRuns += 1
        })
      })
      await docRows(page).nth(2).click()
      await expect(docRows(page).nth(2)).toHaveAttribute('aria-pressed', 'true')
      const swapRuns = () => page.evaluate(() => window.__swapRuns)
      if (runs) {
        // The same click does animate when motion is allowed, so the detector can see a swap.
        expect(styles.every((st) => st.property.includes('transform') && st.duration.split(',').some((v) => parseFloat(v) > 0.1))).toBe(true)
        await expect.poll(swapRuns, { message: 'no .hx-obj transition ran after the row was picked' }).toBeGreaterThan(0)
      } else {
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        const running = await swapRuns()
        // Property none, not merely a near-zero duration: the site-wide backstop alone leaves a 1e-5s transition.
        expect(styles.map((st) => st.property)).toEqual(Array(styles.length).fill('none'))
        expect(running).toBe(0)
      }
    } finally {
      await ctx.close()
    }
  })
}
