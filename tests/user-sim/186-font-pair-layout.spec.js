// Font Pair, layout A "Specimen and panel": acceptance criteria 6, 7 and 8 of
// the fonts build spec, at 1440, 768 and 390.
//   6  Best match (the one-press body suggestion) is never inside a weight-pill
//      group or the buttons row; it sits on the Body family label line, at its
//      right.
//   7  At 390 and 768 the family rows come before the specimen, in the DOM and
//      on screen.
//   8  At 1440 no family card text is cut (scrollWidth equals clientWidth).
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const WIDTHS = [1440, 768, 390]

for (const width of WIDTHS) {
  test.describe(`Font Pair layout at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      watch(page, `a designer pairing fonts at ${width}px`)
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
      await go(page, '/create/font-pair')
      await expect(page.locator('.fpr-fam')).toHaveCount(2)
    })

    test('Best match is not in a weight row, and sits at the right of the body family label line', async ({ page }) => {
      const read = await page.evaluate(() => {
        const wand = document.querySelector('.fpr-wand')
        const body = [...document.querySelectorAll('.fpr-fam')].find((el) => el.querySelector('.fpr-wand'))
        const head = wand?.closest('.fpr-fam-head')
        return {
          wandCount: document.querySelectorAll('.fpr-wand').length,
          inWeights: !!wand?.closest('.fpr-weights, .tl-pills, .fpr-fam-acts, .fpr-fam-row'),
          wordInAnyPills: [...document.querySelectorAll('.tl-pills, .fpr-weights, .fpr-fam-acts')].some((g) => /\b(Auto|Best match)\b/.test(g.textContent || '')),
          inBodyCard: !!body && /Body family/.test(body.textContent || ''),
          onHead: !!head,
          labelFirst: !!head && head.firstElementChild?.classList.contains('fpr-label') && /Body family/.test(head.firstElementChild.textContent || ''),
          wandLast: !!head && head.lastElementChild === wand,
          wandRightOfLabel: !!head && wand.getBoundingClientRect().left >= head.firstElementChild.getBoundingClientRect().right - 1,
          text: (wand?.textContent || '').trim(),
          label: wand?.getAttribute('aria-label'),
        }
      })
      expect(read.wandCount, 'exactly one Best match').toBe(1)
      expect(read.inWeights, 'Best match is inside a weight group or the buttons row').toBe(false)
      expect(read.wordInAnyPills, 'a pill group or the buttons row carries Auto or Best match').toBe(false)
      expect(read.inBodyCard, 'Best match is not on the body family').toBe(true)
      expect(read.onHead, 'Best match is not on the label line').toBe(true)
      expect(read.labelFirst, 'the Body family label is not first on its line').toBe(true)
      expect(read.wandLast, 'Best match is not last on the label line').toBe(true)
      expect(read.wandRightOfLabel, 'Best match is not to the right of the label').toBe(true)
      expect(read.text).toBe('Best match')
      expect(read.label).toMatch(/^Use the best match for .+: .+$/)
    })

    test('the weight row holds weights only', async ({ page }) => {
      const texts = await page.evaluate(() => (
        [...document.querySelectorAll('.fpr-weights .tl-pill')].map((b) => (b.textContent || '').trim())
      ))
      if (width < 768) {
        // A phone shows each weight as a menu pill, not a pill row.
        expect(texts).toEqual([])
        await expect(page.getByRole('button', { name: /Heading weight/ })).toBeVisible()
      } else {
        expect(texts.length).toBeGreaterThan(1)
        for (const t of texts) expect(t, `"${t}" is not a weight`).toMatch(/^\d{3}$/)
      }
    })

    if (width < 1024) {
      test('the family rows come before the specimen, in the DOM and on screen', async ({ page }) => {
        const order = await page.evaluate(() => {
          const panel = document.querySelector('.fpr-config')
          const specimen = document.querySelector('.fpr-specimen')
          const text = document.querySelector('#fpr-text')
          return {
            domFirst: !!(panel.compareDocumentPosition(specimen) & Node.DOCUMENT_POSITION_FOLLOWING),
            famTop: document.querySelector('.fpr-fam').getBoundingClientRect().top,
            textTop: text.getBoundingClientRect().top,
            specimenTop: specimen.getBoundingClientRect().top,
          }
        })
        expect(order.domFirst, 'the specimen is first in the DOM').toBe(true)
        expect(order.famTop).toBeLessThan(order.textTop)
        expect(order.textTop, 'preview text sits above the specimen').toBeLessThan(order.specimenTop)
      })
    }

    test('a very long family name wraps inside its card and is never clipped', async ({ page }) => {
      // The default pair is short enough to fit on one line, so on its own it
      // cannot catch a clipped name (seen: `white-space: nowrap; overflow:
      // hidden` on .fpr-fam-name left the default-pair checks green). The
      // longest real names are seeded into the catalogue the app already reads
      // and chosen through Browse, on the body card too, where Auto and Browse
      // leave the least room.
      const LONG = 'Noto Sans Inscriptional Parthian'
      await page.addInitScript((long) => {
        const mk = (family, category, i) => ({ family, category, variants: [400, 700], subsets: ['latin'], popularity: i })
        try {
          localStorage.setItem('vs-gf-catalog', JSON.stringify({
            t: Date.now(),
            fonts: [mk('Playfair Display', 'serif', 0), mk('Inter', 'sans-serif', 1), mk('Roboto', 'sans-serif', 2), mk(long, 'sans-serif', 3)],
          }))
        } catch { /* private mode */ }
      }, LONG)
      await go(page, '/create/font-pair')
      await expect(page.locator('.fpr-fam')).toHaveCount(2)

      for (const slot of ['heading', 'body']) {
        await page.getByRole('button', { name: `Browse ${slot} family` }).click()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        await dialog.getByLabel('Search font families').fill('Inscriptional')
        await dialog.locator('.fbd-card', { hasText: LONG }).first().locator('.fbd-tile').click()
        await expect(page.getByRole('dialog')).toHaveCount(0)
      }

      const read = await page.evaluate(() => [...document.querySelectorAll('.fpr-fam')].map((card) => {
        const name = card.querySelector('.fpr-fam-name')
        const meta = card.querySelector('.fpr-fam-meta')
        const box = card.getBoundingClientRect()
        const n = name.getBoundingClientRect()
        const acts = [...card.querySelectorAll('.fpr-fam-acts button')].map((b) => b.getBoundingClientRect())
        return {
          text: name.textContent,
          nameOver: name.scrollWidth - name.clientWidth,
          metaOver: meta.scrollWidth - meta.clientWidth,
          insideCard: n.left >= box.left - 1 && n.right <= box.right + 1,
          // The name may sit above the buttons on a wrapped row, but never under them.
          overlapsAction: acts.some((a) => n.left < a.right && n.right > a.left && n.top < a.bottom && n.bottom > a.top),
        }
      }))
      expect(read.map((r) => r.text), 'the long family was not chosen on both cards').toEqual([LONG, LONG])
      for (const r of read) {
        expect(r.nameOver, 'the family name is clipped').toBeLessThanOrEqual(0)
        expect(r.metaOver, 'the category line is clipped').toBeLessThanOrEqual(0)
        expect(r.insideCard, 'the family name runs outside its card').toBe(true)
        expect(r.overlapsAction, 'the family name sits under Auto or Browse').toBe(false)
      }
    })

    if (width === 1440) {
      test('no family card text is cut', async ({ page }) => {
        const cut = await page.evaluate(() => (
          [...document.querySelectorAll('.fpr-fam-name, .fpr-fam-meta')]
            .map((el) => ({ text: el.textContent, over: el.scrollWidth - el.clientWidth }))
            .filter((x) => x.over > 0)
        ))
        expect(cut, 'family name or meta is cut').toEqual([])
      })
    }
  })
}

// ── The docked bar, Save when signed out, and the family rows (S5 fix round) ──

// The dock is the one control strip a phone always has in reach. At 320 the
// three actions share 296px, so a few pixels of padding are the difference
// between all three whole and Copy CSS pushed off the edge.
//   768:   Shuffle, Save                    (two buttons)
//   <768:  Save, Shuffle (icon), Copy CSS   (three buttons)
const DOCK_FIT = [
  { width: 320, height: 640, buttons: 3 },
  { width: 360, height: 780, buttons: 3 },
  { width: 390, height: 844, buttons: 3 },
  { width: 768, height: 1024, buttons: 2 },
]

test.describe('Font Pair dock · every button is whole and a finger can hit it', () => {
  for (const { width, height, buttons } of DOCK_FIT) {
    test(`at ${width}px all ${buttons} dock buttons sit inside the viewport and are 44px on a coarse pointer`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true })
      const page = await ctx.newPage()
      try {
        watch(page, `someone on a ${width}px touch screen reaching for Save`)
        await go(page, '/create/font-pair')
        await expect(page.locator('.fpr-dock')).toBeVisible()
        expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'the context is not a coarse pointer').toBe(true)

        const read = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth
          const vh = window.innerHeight
          const dock = document.querySelector('.fpr-dock')
          const dr = dock.getBoundingClientRect()
          const ds = getComputedStyle(dock)
          return {
            vw,
            vh,
            // The dock's own padding is the gutter the buttons must stay inside.
            gutterLeft: dr.left + parseFloat(ds.paddingLeft),
            gutterRight: dr.right - parseFloat(ds.paddingRight),
            boxes: [...document.querySelectorAll('.fpr-dock button, .fpr-dock a')].map((el) => {
              const r = el.getBoundingClientRect()
              return {
                name: el.getAttribute('aria-label') || (el.textContent || '').trim(),
                left: Math.round(r.left * 10) / 10,
                right: Math.round(r.right * 10) / 10,
                top: Math.round(r.top * 10) / 10,
                bottom: Math.round(r.bottom * 10) / 10,
                w: Math.round(r.width * 10) / 10,
                h: Math.round(r.height * 10) / 10,
              }
            }),
          }
        })

        expect(read.boxes.map((b) => b.name), `the dock holds the wrong buttons at ${width}px`).toHaveLength(buttons)
        for (const b of read.boxes) {
          expect(b.left, `"${b.name}" starts left of the screen at ${width}px`).toBeGreaterThanOrEqual(0)
          expect(b.right, `"${b.name}" runs ${Math.round(b.right - read.vw)}px past the right edge at ${width}px`).toBeLessThanOrEqual(read.vw)
          expect(b.left, `"${b.name}" crosses the left gutter of the dock at ${width}px`).toBeGreaterThanOrEqual(read.gutterLeft - 0.5)
          expect(b.right, `"${b.name}" crosses the right gutter of the dock by ${Math.round((b.right - read.gutterRight) * 10) / 10}px at ${width}px`).toBeLessThanOrEqual(read.gutterRight + 0.5)
          expect(b.top, `"${b.name}" is above the screen at ${width}px`).toBeGreaterThanOrEqual(0)
          expect(b.bottom, `"${b.name}" is below the screen at ${width}px`).toBeLessThanOrEqual(read.vh)
          expect(b.h, `"${b.name}" is ${b.h}px tall on a coarse pointer`).toBeGreaterThanOrEqual(44)
          expect(b.w, `"${b.name}" is ${b.w}px wide on a coarse pointer`).toBeGreaterThanOrEqual(44)
        }
        // Whole is not enough if two of them sit on top of each other.
        const sorted = [...read.boxes].sort((a, b) => a.left - b.left)
        for (let i = 1; i < sorted.length; i += 1) {
          const sameRow = sorted[i].top < sorted[i - 1].bottom && sorted[i].bottom > sorted[i - 1].top
          if (sameRow) expect(sorted[i].left, `"${sorted[i].name}" overlaps "${sorted[i - 1].name}"`).toBeGreaterThanOrEqual(sorted[i - 1].right)
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(1)
      } finally {
        await ctx.close()
      }
    })
  }
})

test.describe('Font Pair · Save to a project, signed out', () => {
  for (const width of [1440, 390]) {
    test(`at ${width}px the press opens the sign-in prompt and nothing else`, async ({ page }) => {
      watch(page, `a signed-out visitor pressing Save to a project at ${width}px`)
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
      await go(page, '/create/font-pair')

      const save = page.locator('.fpr-dock').getByRole('button', { name: 'Save to a project' })
      await expect(save).toBeVisible()
      await save.click()

      await expect(page.getByRole('dialog', { name: /Create your free account/i }), 'no sign-in prompt appeared').toBeVisible()
      // Two frames later: a menu or a toast raised by the same press (before
      // the prompt resolved) would be in the tree by now.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

      await expect(page.locator('.svt-menu'), 'the save menu opened behind the sign-in prompt').toHaveCount(0)
      await expect(page.locator('.toast.show'), 'a toast showed with the sign-in prompt').toHaveCount(0)
      await expect(page.getByText(/Kept in this browser/i)).toHaveCount(0)
      await expect(save, 'the trigger claims a menu is open').toHaveAttribute('aria-expanded', 'false')
    })
  }
})

test.describe('Font Pair · the two family rows line up', () => {
  test('at 768 the two family names start at the same height', async ({ page }) => {
    watch(page, 'a designer on a tablet comparing the two family cards')
    await page.setViewportSize({ width: 768, height: 1024 })
    await go(page, '/create/font-pair')
    await expect(page.locator('.fpr-fam')).toHaveCount(2)
    const tops = await page.locator('.fpr-fam-name').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top))
    expect(tops, 'expected a name on each of the two family cards').toHaveLength(2)
    expect(Math.abs(tops[0] - tops[1]), `the names sit at y=${tops[0]} and y=${tops[1]}`).toBeLessThanOrEqual(2)
  })

  test('at 390 both rows stack the same way: name, then the buttons at the same offset', async ({ page }) => {
    watch(page, 'a designer on a phone comparing the two family cards')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/font-pair')
    await expect(page.locator('.fpr-fam')).toHaveCount(2)
    const rows = await page.locator('.fpr-fam-row').evaluateAll((els) => els.map((row) => {
      const rowBox = row.getBoundingClientRect()
      const name = row.querySelector('.fpr-fam-name').getBoundingClientRect()
      const first = row.querySelector('.fpr-fam-acts button').getBoundingClientRect()
      return {
        nameLeft: name.left - rowBox.left,
        buttonsBelowName: first.top >= name.bottom - 1,
        gapUnderName: first.top - name.bottom,
        buttonsLeft: first.left - rowBox.left,
      }
    }))
    expect(rows, 'expected a row on each of the two family cards').toHaveLength(2)
    for (const r of rows) expect(r.buttonsBelowName, 'the buttons sit beside the name, not under it').toBe(true)
    expect(Math.abs(rows[0].nameLeft - rows[1].nameLeft), 'the names start at different offsets').toBeLessThanOrEqual(2)
    expect(Math.abs(rows[0].buttonsLeft - rows[1].buttonsLeft), 'the buttons start at different offsets').toBeLessThanOrEqual(2)
    expect(Math.abs(rows[0].gapUnderName - rows[1].gapUnderName), 'the gap under the name differs between the rows').toBeLessThanOrEqual(2)
  })
})

// The score figure ("N match") was dropped: a number the person cannot act on.
// Nothing on the page, in its text or in the labels read aloud, may carry the
// word "match" next to a figure, or the word at all as a score. The Best match
// button is the one place the word belongs, so that phrase alone is set aside.
for (const width of [1440, 390]) {
  test(`no "match" figure renders anywhere on the page at ${width}px`, async ({ page }) => {
    watch(page, `a designer reading the suggestions at ${width}px`)
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
    await go(page, '/create/font-pair')
    await expect(page.locator('.fpr-card').first()).toBeAttached()
    const hits = await page.evaluate(() => {
      const out = []
      const root = document.querySelector('.fpr-page') || document.body
      // textContent also reads the closed "Why this pairs" and handoff disclosures.
      const text = root.textContent || ''
      const outsideButton = (v) => v.replace(/best match/gi, '')
      const scored = (v) => /\d\s*%?\s*(best )?match/i.test(v)
      for (const m of text.matchAll(/.{0,30}match.{0,30}/gi)) {
        if (/match/i.test(outsideButton(m[0])) || scored(m[0])) out.push(`text: ${m[0]}`)
      }
      for (const el of root.querySelectorAll('*')) {
        for (const attr of ['aria-label', 'title', 'aria-valuetext', 'alt']) {
          const v = el.getAttribute(attr)
          if (v && (/match/i.test(outsideButton(v)) || scored(v))) out.push(`${attr}: ${v}`)
        }
      }
      return out
    })
    expect(hits, 'the page still talks about a match score').toEqual([])
  })
}
