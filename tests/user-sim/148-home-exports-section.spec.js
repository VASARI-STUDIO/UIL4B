// THE HOMEPAGE EXPORTS SECTION (#exports), AS A VISITOR MEETS IT.
//
// Three pinned cards (.hx-card): card 1 picks a piece (palette, type scale,
// images, icons) and a format and copies the file; card 2 brings one of the
// export files forward; card 3 picks one of three sample projects. The export
// themes switch ships off, so card 2 shows the three exports the app makes today.
//
// Every test names, in a comment, the source change that turns it red.
import { test, expect } from './base.js'
import { go, homeSectionsLoaded, watch } from './helpers.js'

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
  await homeSectionsLoaded(page)
  // Rest card 1 at its dock line, as a visitor scrolling down meets it, so cards 2 and 3 are not yet over its controls.
  await page.evaluate(() => {
    const first = document.querySelector('#exports .hx-card[data-card="0"]')
    window.scrollTo(0, first.parentElement.getBoundingClientRect().top + window.scrollY - (window.innerWidth >= 1024 ? 84 : 72))
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

test('card 2 lists the three exports the app makes today, and the caption names no theme', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  try {
    // Red if exportRows or exportCopy stop following EXPORT_THEMES_LIVE (the themes rows would show).
    await expect(docRows(page)).toHaveCount(3)
    const rows = (await docRows(page).allInnerTexts()).map(squash)
    expect(rows[0]).toMatch(/^Brand guidelines .*Pro$/)
    expect(rows[1]).toMatch(/^Design system book .*Pro$/)
    expect(rows[2]).toMatch(/^UI kit .*Free$/)
    await expect(card(page, 1).locator('.hx-cap')).toHaveText('Kerbside, a sample brand. Set in Archivo and IBM Plex Sans.')
    await expect(card(page, 1)).not.toContainText(/theme/i)
    await expect(card(page, 1).locator('.hx-note')).toHaveText('The UI kit is free. The brand guidelines and design system book are Pro.')
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

// ── docking at 1440 ────────────────────────────────────────────────────────────

// What a card looks like now: its sticky top, its scale (the x scale of the transform matrix), the
// opacity of its dimming layer, and the cast of its shadow. A card's own opacity stays 1 so no card shows through another.
const LOOKS = () => [...document.querySelectorAll('#exports .hx-card')].map((c) => {
  const s = getComputedStyle(c)
  const m = s.transform === 'none' ? 1 : Number(s.transform.match(/matrix\(([^,]+),/)[1])
  return {
    top: Math.round(c.getBoundingClientRect().top),
    scale: Math.round(m * 1000) / 1000,
    dim: Number(getComputedStyle(c, '::after').opacity),
    shadow: s.boxShadow !== 'none',
    opacity: s.opacity,
    filter: s.filter,
    animated: getComputedStyle(c).animationName,
  }
})
const dockAll = (page, extra = 30) => page.evaluate((x) => {
  const third = document.querySelector('#exports .hx-card[data-card="2"]')
  window.scrollTo(0, third.parentElement.getBoundingClientRect().top + window.scrollY - (window.innerWidth >= 1024 ? 148 : 72) + x)
}, extra)

test('at 1440 the cards dock at 84, 116 and 148, and a covered card scales to .96 and dims while the last stays whole', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  try {
    // Scroll until the third card is past its dock line, so all three are stuck.
    await dockAll(page)
    // Red if STACK_TOPS, the --stack-top tokens or dockTop change.
    await expect.poll(async () => (await page.evaluate(LOOKS)).map((l) => l.top)).toEqual([84, 116, 148])
    // Red if the view timelines, the trackers' sizes (--hx-trav, --hx-dock) or the scale stop reaching a covered card.
    await expect.poll(async () => (await page.evaluate(LOOKS)).map((l) => l.scale), { timeout: 5000 }).toEqual([0.96, 0.96, 1])
    const looks = await page.evaluate(LOOKS)
    expect(looks.map((l) => l.dim)).toEqual([0.45, 0.45, 0])
    // Red if a card loses its elevation, or gains a fade or filter (it would show through the one over it).
    for (const look of looks) expect(look).toMatchObject({ shadow: true, opacity: '1', filter: 'none' })
  } finally {
    await ctx.close()
  }
})

test('the cover follows the scroll: a quarter, half and three quarters of the way over, the card is that far scaled and dimmed', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  try {
    for (const f of [0.25, 0.5, 0.75]) {
      // Card 2's top, this fraction of the way from card 1's bottom edge to its own dock line (116).
      await page.evaluate((frac) => {
        const [a, b] = [...document.querySelectorAll('#exports .hx-card')]
        const bottom = a.getBoundingClientRect().bottom
        window.scrollTo(0, window.scrollY + b.getBoundingClientRect().top - (bottom + (116 - bottom) * frac))
      }, f)
      // Red if the exit range is changed to a step, a different length, or the scale stops following the position.
      // Linear: scale 1 - .04 f, dim .45 f. The tolerance covers the card's own shrinking bottom edge.
      await expect.poll(async () => {
        const first = (await page.evaluate(LOOKS))[0]
        return Math.abs(first.scale - (1 - 0.04 * f)) < 0.004 && Math.abs(first.dim - 0.45 * f) < 0.04
      }, { timeout: 5000, message: `card 1 at ${f} of the way over` }).toBe(true)
    }
  } finally {
    await ctx.close()
  }
})

for (const [label, width, height, touch] of [['1440', 1440, 900, false], ['390', 390, 844, true], ['320', 320, 640, true]]) {
  test(`at ${label} a visitor who asked for no motion gets the plain stack, by the OS and by the Settings`, async ({ browser }) => {
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
        await homeSectionsLoaded(page)
        await dockAll(page)
        await page.waitForTimeout(300)
        // Red if the reduced-motion guards for .hx-card are dropped (the covered cards would be scaled and dimmed).
        const looks = await page.evaluate(LOOKS)
        for (const look of looks) expect(look, `${how} at ${width}`).toMatchObject({ scale: 1, dim: 0, animated: 'none', shadow: true })
      } finally {
        await ctx.close()
      }
    }
  })
}

for (const [width, height] of [[768, 1024], [390, 844], [320, 640]]) {
  test(`at ${width} a covered card scales and dims too`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { width, height, touch: width < 500 })
    try {
      // Carry the last card to its own dock line: on a short phone the cards are taller than the screen, so
      // its travel over the one before is long and a fixed push past the section's start does not finish it.
      await page.evaluate(() => {
        const last = document.querySelector('#exports .hx-card[data-card="2"]')
        window.scrollTo(0, window.scrollY + last.getBoundingClientRect().top - parseFloat(getComputedStyle(last).top) + 40)
      })
      // Red if the narrow layout loses the trackers' sizes (cards dock together here, so the whole height is the travel).
      await expect.poll(async () => (await page.evaluate(LOOKS)).map((l) => l.scale), { timeout: 5000 }).toEqual([0.96, 0.96, 1])
    } finally {
      await ctx.close()
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
      await docRows(page).nth(2).click()
      const running = await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(
        [...document.querySelectorAll('#exports .hx-card[data-card="1"] .hx-obj')]
          .reduce((n, el) => n + el.getAnimations().length, 0)))))
      if (runs) {
        // The same click does animate when motion is allowed, so the detector can see a swap.
        expect(styles.every((st) => st.property.includes('transform') && st.duration.split(',').some((v) => parseFloat(v) > 0.1))).toBe(true)
        expect(running).toBeGreaterThan(0)
      } else {
        // Property none, not merely a near-zero duration: the site-wide backstop alone leaves a 1e-5s transition.
        expect(styles.map((st) => st.property)).toEqual(Array(styles.length).fill('none'))
        expect(running).toBe(0)
      }
    } finally {
      await ctx.close()
    }
  })
}
