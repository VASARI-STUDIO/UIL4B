// Font Pair, layout A "Specimen and panel", at 1440, 768 and 390.
//   6  Auto (the one-press body suggestion) sits with Browse on the Body
//      family label line, at its right; it is never inside the weight menu.
//   7  At 768 the panel (family cards, then the preview text) comes before the
//      specimen, in the DOM and on screen. At 390 there is no panel: the specimen
//      comes first, then two family rows, and each opens a sheet with that card.
//   8  At 1440 no family card text is cut (scrollWidth equals clientWidth).
//   9  The weight control is one menu of weights (no pill row) at every width.
//  10  The preview field is #fpr-text-stage in the stage head from 1024px,
//      #fpr-text in the panel on a tablet, #fpr-text-more in More on a phone.
//
// MUTATIONS (each should fail the spec named):
//   - move Auto into .fpr-wmenu or before the label          -> 6
//   - render the panel under the specimen at 768                   -> 7
//   - render the panel instead of the family rows at 390           -> 7
//   - give .fpr-fam-name `white-space: nowrap; overflow: hidden`   -> long name test
//   - render a .tl-pills weight row again                          -> 9
//   - show the dock's Save label again on a phone                  -> dock fit (two pills shrink under 44px)
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const WIDTHS = [1440, 768, 390]

// A phone has no panel: a family card exists only inside its sheet, opened from
// the dock pill (the same sheet the family row opens). Wider screens show both in the page.
async function withCard(page, width, index, fn) {
  if (width >= 768) return fn(page.locator('.fpr-fam').nth(index), page)
  await page.locator('.fpr-dock .fpr-pill').nth(index).click()
  const sheet = page.locator('.fpr-sheet')
  await expect(sheet).toBeVisible()
  try {
    return await fn(sheet.locator('.fpr-fam'), page)
  } finally {
    await page.keyboard.press('Escape')
    await expect(page.locator('.fpr-sheet')).toHaveCount(0)
  }
}

for (const width of WIDTHS) {
  test.describe(`Font Pair layout at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      watch(page, `a designer pairing fonts at ${width}px`)
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
      await go(page, '/create/font-pair')
      if (width < 768) {
        await expect(page.locator('.fpr-frow')).toHaveCount(2)
        await expect(page.locator('.fpr-fam'), 'a family card is on the page, not in a sheet').toHaveCount(0)
      } else {
        await expect(page.locator('.fpr-fam')).toHaveCount(2)
      }
    })

    test('Auto is not in the weight menu, and sits at the right of the body family label line', async ({ page }) => {
      const read = await withCard(page, width, 1, (card) => card.evaluate((el) => {
        const wand = el.querySelector('.fpr-wand')
        const head = el.querySelector('.fpr-fam-head')
        const acts = wand?.closest('.fpr-fam-acts')
        const browse = el.querySelector('.fpr-browse')
        return {
          wandCount: el.querySelectorAll('.fpr-wand').length,
          inWeights: !!wand?.closest('.fpr-wmenu, .fpr-weights, .tl-pills, .fpr-fam-row'),
          wordInMenu: [...el.querySelectorAll('.fpr-wmenu, .tl-pills, .fpr-weights')].some((g) => /\bAuto\b/.test(g.textContent || '')),
          inBodyCard: /Body family/.test(el.textContent || ''),
          onHead: !!head && !!acts && acts.parentElement === head,
          labelFirst: !!head && head.firstElementChild?.classList.contains('fpr-label') && /Body family/.test(head.firstElementChild.textContent || ''),
          actsLast: !!head && head.lastElementChild === acts,
          wandBeforeBrowse: !!acts && acts.firstElementChild === wand && acts.lastElementChild === browse,
          text: (wand?.textContent || '').trim(),
          label: wand?.getAttribute('aria-label'),
        }
      }))
      expect(read.wandCount, 'exactly one Auto').toBe(1)
      expect(read.inWeights, 'Auto is inside the weight menu or the name row').toBe(false)
      expect(read.wordInMenu, 'the weight menu carries Auto').toBe(false)
      expect(read.inBodyCard, 'Auto is not on the body family').toBe(true)
      expect(read.onHead, 'Auto is not on the label line').toBe(true)
      expect(read.labelFirst, 'the Body family label is not first on its line').toBe(true)
      expect(read.actsLast, 'the actions are not last on the label line').toBe(true)
      expect(read.wandBeforeBrowse, 'Auto does not sit directly before Browse').toBe(true)
      expect(read.text).toMatch(/Auto$/)
      expect(read.label).toMatch(/^Auto: (use the top suggested body face, .+|.+, the top suggested body face, is in use)$/)
    })

    test('the weight control is one menu of weights, never a pill row', async ({ page }) => {
      expect(await page.locator('.fpr-weights .tl-pill').count(), 'a pill row of weights is back').toBe(0)
      await withCard(page, width, 0, async (card) => {
        const trigger = card.getByRole('button', { name: 'Heading weight: 800' })
        await expect(trigger).toBeVisible()
        await trigger.click()
        const options = page.locator('[role="listbox"] [role="option"]')
        await expect(options.first()).toBeVisible()
        const texts = (await options.allInnerTexts()).map((t) => t.trim())
        expect(texts.length).toBeGreaterThan(1)
        for (const t of texts) expect(t, `"${t}" is not a weight`).toMatch(/^\d{3}$/)
        await expect(page.locator('[role="option"][aria-selected="true"]')).toHaveText('800')
        await page.locator('[role="option"][data-value="700"]').click()
        await expect(card.getByRole('button', { name: 'Heading weight: 700' })).toBeVisible()
      })
      // The pick reaches the specimen, not just the menu.
      await expect.poll(() => page.locator('.fpr-street-h').evaluate((el) => getComputedStyle(el).fontWeight)).toBe('700')
    })

    if (width === 390) {
      test('on a phone the specimen comes before the family rows, in the DOM and on screen, and there is no panel', async ({ page }) => {
        const order = await page.evaluate(() => {
          const rows = document.querySelector('.fpr-fampair')
          const specimen = document.querySelector('.fpr-specimen')
          return {
            domFirst: !!(specimen.compareDocumentPosition(rows) & Node.DOCUMENT_POSITION_FOLLOWING),
            specimenTop: specimen.getBoundingClientRect().top,
            rowsTop: rows.getBoundingClientRect().top,
            panels: document.querySelectorAll('.fpr-config, .fpr-panel').length,
            names: [...document.querySelectorAll('.fpr-frow-n')].map((e) => e.textContent),
          }
        })
        expect(order.panels, 'the panel is on a phone').toBe(0)
        expect(order.domFirst, 'the specimen is not first in the DOM').toBe(true)
        expect(order.specimenTop, 'the specimen starts below the first screen').toBeLessThan(844)
        expect(order.specimenTop).toBeLessThan(order.rowsTop)
        expect(order.names).toEqual(['Archivo', 'IBM Plex Sans'])
      })

      test('the preview field is in More and nowhere on the page', async ({ page }) => {
        expect(await page.locator('#fpr-text, #fpr-text-stage').count()).toBe(0)
        await page.locator('[data-tool-toolbar]').getByRole('button', { name: /More/ }).click()
        await expect(page.locator('.tl-sheet-layer #fpr-text-more')).toBeVisible()
      })
    }

    if (width === 768) {
      test('the family cards come before the specimen, in the DOM and on screen', async ({ page }) => {
        const order = await page.evaluate(() => {
          const panel = document.querySelector('.fpr-config')
          const specimen = document.querySelector('.fpr-specimen')
          const text = document.querySelector('#fpr-text')
          return {
            domFirst: !!(panel.compareDocumentPosition(specimen) & Node.DOCUMENT_POSITION_FOLLOWING),
            famTop: document.querySelector('.fpr-fam').getBoundingClientRect().top,
            textTop: text.getBoundingClientRect().top,
            specimenTop: specimen.getBoundingClientRect().top,
            stageField: document.querySelectorAll('#fpr-text-stage').length,
          }
        })
        expect(order.domFirst, 'the specimen is first in the DOM').toBe(true)
        expect(order.stageField, 'the desktop field is on a tablet').toBe(0)
        expect(order.famTop).toBeLessThan(order.textTop)
        expect(order.textTop, 'preview text sits above the specimen').toBeLessThan(order.specimenTop)
      })
    }

    if (width === 1440) {
      test('the preview field is in the stage head and the panel is to the right of the specimen', async ({ page }) => {
        const read = await page.evaluate(() => {
          const field = document.querySelector('#fpr-text-stage')
          const specimen = document.querySelector('.fpr-specimen').getBoundingClientRect()
          const panel = document.querySelector('.fpr-panel').getBoundingClientRect()
          return {
            inHead: !!field?.closest('.fpr-stage-head'),
            tabletField: document.querySelectorAll('#fpr-text').length,
            panelLeft: panel.left,
            specimenRight: specimen.right,
          }
        })
        expect(read.inHead, 'the field is not in the stage head').toBe(true)
        expect(read.tabletField, 'the tablet field is also on the page').toBe(0)
        expect(read.panelLeft, 'the panel is not beside the specimen').toBeGreaterThanOrEqual(read.specimenRight)
      })
    }

    test('a very long family name wraps inside its card and is never clipped', async ({ page }) => {
      // The default pair is short enough to fit on one line, so on its own it
      // cannot catch a clipped name (seen: `white-space: nowrap; overflow:
      // hidden` on .fpr-fam-name left the default-pair checks green). The
      // longest real names are seeded into the catalogue the app already reads
      // and chosen through Browse, on the body card too, where Auto and
      // Browse leave the least room.
      const LONG = 'Noto Sans Inscriptional Parthian'
      await page.addInitScript((long) => {
        const mk = (family, category, i) => ({ family, category, variants: [400, 700, 800], subsets: ['latin'], popularity: i })
        try {
          localStorage.setItem('vs-gf-catalog', JSON.stringify({
            t: Date.now(),
            fonts: [mk('Archivo', 'sans-serif', 0), mk('IBM Plex Sans', 'sans-serif', 1), mk('Playfair Display', 'serif', 2), mk('Inter', 'sans-serif', 3), mk(long, 'sans-serif', 4)],
          }))
        } catch { /* private mode */ }
      }, LONG)
      await go(page, '/create/font-pair')

      const pick = (slot) => withCard(page, width, slot === 'heading' ? 0 : 1, async (card) => {
        await card.getByRole('button', { name: `Browse ${slot} family` }).click()
        const dialog = page.locator('.fbd-dialog')
        await expect(dialog).toBeVisible()
        await dialog.getByLabel('Search font families').fill('Inscriptional')
        await dialog.locator('.fbd-card', { hasText: LONG }).first().locator('.fbd-tile').click()
        await expect(page.locator('.fbd-dialog')).toHaveCount(0)
      })
      await pick('heading')
      await pick('body')

      const read = []
      for (const i of [0, 1]) {
        read.push(await withCard(page, width, i, (card) => card.evaluate((el) => {
          const name = el.querySelector('.fpr-fam-name')
          const meta = el.querySelector('.fpr-fam-meta')
          const box = el.getBoundingClientRect()
          const n = name.getBoundingClientRect()
          const acts = [...el.querySelectorAll('.fpr-fam-acts button')].map((b) => b.getBoundingClientRect())
          return {
            text: name.textContent,
            nameOver: name.scrollWidth - name.clientWidth,
            metaOver: meta.scrollWidth - meta.clientWidth,
            insideCard: n.left >= box.left - 1 && n.right <= box.right + 1,
            // The name may sit above the buttons on a wrapped row, but never under them.
            overlapsAction: acts.some((a) => n.left < a.right && n.right > a.left && n.top < a.bottom && n.bottom > a.top),
          }
        })))
      }
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

// ── The docked bar, Save when signed out, and the family cards ──────────────

// The dock is the one control strip a phone always has in reach.
//   768:   the note and Save                      (one button)
//   <768:  Heading pill, Body pill, Save (the bookmark alone), Copy CSS
//   <360:  no room for Save beside the two pills, so it lives in More (three buttons)
// Two pills can only show a family name if Save gives up its label; at 390 each
// pill must be wider than the bare 44px a finger needs. Copy CSS is its label and a
// 32px disc (131.5px at 14px type), so at 390 the Heading pill is the board's 74.5px
// share of what is left, and the floor sits just under that.
const DOCK_FIT = [
  { width: 320, height: 640, buttons: 3, pillMin: 74 },
  { width: 360, height: 780, buttons: 4, pillMin: 70 },
  { width: 390, height: 844, buttons: 4, pillMin: 74 },
  { width: 768, height: 1024, buttons: 1, pillMin: 0 },
]

test.describe('Font Pair dock · every button is whole and a finger can hit it', () => {
  for (const { width, height, buttons, pillMin } of DOCK_FIT) {
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
            // A button taken out of the row (display: none) has no box and is not counted.
            boxes: [...document.querySelectorAll('.fpr-dock button, .fpr-dock a')].map((el) => {
              const r = el.getBoundingClientRect()
              return {
                name: el.getAttribute('aria-label') || (el.textContent || '').trim(),
                pill: el.classList.contains('fpr-pill'),
                left: Math.round(r.left * 10) / 10,
                right: Math.round(r.right * 10) / 10,
                top: Math.round(r.top * 10) / 10,
                bottom: Math.round(r.bottom * 10) / 10,
                w: Math.round(r.width * 10) / 10,
                h: Math.round(r.height * 10) / 10,
              }
            }).filter((b) => b.w > 0 && b.h > 0),
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
          if (b.pill) expect(b.w, `the pill "${b.name}" is ${b.w}px, too narrow to show a family name`).toBeGreaterThanOrEqual(pillMin)
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

  test('at 320 Save is not lost: it is in More', async ({ page }) => {
    watch(page, 'someone on the narrowest phone looking for Save')
    await page.setViewportSize({ width: 320, height: 640 })
    await go(page, '/create/font-pair')
    await expect(page.locator('.fpr-dock').getByRole('button', { name: 'Save to a project' })).toBeHidden()
    await page.locator('[data-tool-toolbar]').getByRole('button', { name: /More/ }).click()
    await expect(page.locator('.tl-sheet-layer').getByRole('button', { name: 'Save to a project' })).toBeVisible()
  })
})

test.describe('Font Pair · Save to a project, signed out', () => {
  for (const width of [1440, 390]) {
    test(`at ${width}px the press opens the sign-in prompt and nothing else`, async ({ page }) => {
      watch(page, `a signed-out visitor pressing Save to a project at ${width}px`)
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
      await go(page, '/create/font-pair')

      // From 768 the dock states where the pair is kept, before and after the press.
      const note = page.getByText(/Kept in this browser/i)
      const notes = width >= 768 ? 1 : 0
      await expect(note).toHaveCount(notes)

      const save = page.locator('.fpr-dock').getByRole('button', { name: 'Save to a project' })
      await expect(save).toBeVisible()
      await save.click()

      await expect(page.getByRole('dialog', { name: /Create your free account/i }), 'no sign-in prompt appeared').toBeVisible()
      // Two frames later: a menu or a toast raised by the same press (before
      // the prompt resolved) would be in the tree by now.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

      await expect(page.locator('.svt-menu'), 'the save menu opened behind the sign-in prompt').toHaveCount(0)
      await expect(page.locator('.toast.show'), 'a toast showed with the sign-in prompt').toHaveCount(0)
      await expect(note, 'the press added a second "kept" line').toHaveCount(notes)
      await expect(save, 'the trigger claims a menu is open').toHaveAttribute('aria-expanded', 'false')
    })
  }
})

test.describe('Font Pair · the two family cards line up', () => {
  test('at 768 the two family names start at the same height', async ({ page }) => {
    watch(page, 'a designer on a tablet comparing the two family cards')
    await page.setViewportSize({ width: 768, height: 1024 })
    await go(page, '/create/font-pair')
    await expect(page.locator('.fpr-fam')).toHaveCount(2)
    const tops = await page.locator('.fpr-fam-name').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top))
    expect(tops, 'expected a name on each of the two family cards').toHaveLength(2)
    expect(Math.abs(tops[0] - tops[1]), `the names sit at y=${tops[0]} and y=${tops[1]}`).toBeLessThanOrEqual(2)
  })

  test('at 390 both sheets stack the same way: name, then the buttons and the weight in one row', async ({ page }) => {
    watch(page, 'a designer on a phone comparing the two family sheets')
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/create/font-pair')
    const rows = []
    for (const i of [0, 1]) {
      rows.push(await withCard(page, 390, i, (card) => card.evaluate((el) => {
        const box = el.getBoundingClientRect()
        const name = el.querySelector('.fpr-fam-name').getBoundingClientRect()
        const acts = el.querySelector('.fpr-fam-acts').getBoundingClientRect()
        const weight = el.querySelector('.fpr-wmenu').getBoundingClientRect()
        const browse = el.querySelector('.fpr-browse').getBoundingClientRect()
        return {
          nameLeft: name.left - box.left,
          actsBelowName: acts.top >= name.bottom - 1,
          gapUnderName: acts.top - name.bottom,
          actsLeft: acts.left - box.left,
          weightBesideActs: Math.abs((weight.top + weight.height / 2) - (acts.top + acts.height / 2)) <= 4,
          weightRightOfBrowse: weight.left >= browse.right,
        }
      })))
    }
    expect(rows, 'expected a card in each of the two sheets').toHaveLength(2)
    for (const r of rows) {
      expect(r.actsBelowName, 'the buttons sit beside the name, not under it').toBe(true)
      expect(r.weightBesideActs, 'the weight menu is not on the buttons row').toBe(true)
      expect(r.weightRightOfBrowse, 'the weight menu is not after Browse').toBe(true)
    }
    expect(Math.abs(rows[0].nameLeft - rows[1].nameLeft), 'the names start at different offsets').toBeLessThanOrEqual(2)
    expect(Math.abs(rows[0].actsLeft - rows[1].actsLeft), 'the buttons start at different offsets').toBeLessThanOrEqual(2)
    expect(Math.abs(rows[0].gapUnderName - rows[1].gapUnderName), 'the gap under the name differs between the sheets').toBeLessThanOrEqual(2)
  })
})

// The score figure ("N match") was dropped: a number the person cannot act on.
// Nothing on the page, in its text or in the labels read aloud, may carry the
// word "match" next to a figure, or the word at all as a score. The Auto
// button is named for what it does, so no label carries the word either.
// On a phone the suggestions live in the body sheet, so that is read too.
for (const width of [1440, 390]) {
  test(`no "match" figure renders anywhere on the page at ${width}px`, async ({ page }) => {
    watch(page, `a designer reading the suggestions at ${width}px`)
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
    await go(page, '/create/font-pair')
    if (width < 768) await page.locator('.fpr-frow').nth(1).click()
    await expect(page.locator('.fpr-card').first()).toBeAttached()
    const hits = await page.evaluate(() => {
      const out = []
      const roots = [document.querySelector('.fpr-page') || document.body, document.querySelector('.fpr-sheet')].filter(Boolean)
      const outsideButton = (v) => v
      const scored = (v) => /\d\s*%?\s*(best )?match/i.test(v)
      for (const root of roots) {
        // textContent also reads the closed handoff disclosure.
        const text = root.textContent || ''
        for (const m of text.matchAll(/.{0,30}match.{0,30}/gi)) {
          if (/match/i.test(outsideButton(m[0])) || scored(m[0])) out.push(`text: ${m[0]}`)
        }
        for (const el of root.querySelectorAll('*')) {
          for (const attr of ['aria-label', 'title', 'aria-valuetext', 'alt']) {
            const v = el.getAttribute(attr)
            if (v && (/match/i.test(outsideButton(v)) || scored(v))) out.push(`${attr}: ${v}`)
          }
        }
      }
      return out
    })
    expect(hits, 'the page still talks about a match score').toEqual([])
  })
}
