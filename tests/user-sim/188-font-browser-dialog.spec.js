// The font browser dialog that Font Pair and Type Scale both open through
// "Browse" (src/components/FontBrowseDialog.jsx; fonts build spec, slice S6,
// criteria K3 and K8, and criteria 15 to 17).
//
// Test seam: the two tools' own pages. Every check reads computed styles and
// geometry in a real browser, after opening the dialog the way a person does.
//
// HOW EACH TEST CAN FAIL
//   K3 About always visible     Fails if the About (i) button goes back into a
//                               hover-revealed layer (opacity 0 or visibility
//                               hidden on it or an ancestor, which the fine
//                               pointer run catches because Chromium reports
//                               hover: hover there), if any tile lacks one, if
//                               it is under 44px on a coarse pointer, or if it
//                               sits closer than 8px to the tile above it.
//   K8 one-line category row    Fails if the chips wrap (a second row of tops),
//                               if the row or the dialog gains a horizontal
//                               scrollbar of its own, if a chip is under 44px or
//                               under 8px from its neighbour on touch, or if a
//                               chip cannot be reached and switched on. A menu
//                               instead of a row passes the same reach checks
//                               on its options.
//   same categories as Gallery  Fails if the dialog's labels stop starting with
//                               the Font Gallery's labels in the same order, or
//                               if it offers anything beyond them other than
//                               Mono (the one extra, kept because a picker keeps
//                               monospace families and the gallery does not).
//   opens from both tools       Fails if either tool stops opening this dialog,
//                               if a tile's About button no longer opens the
//                               family's details, or if Escape stops handing
//                               focus back to the trigger.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const TOOLS = [
  { name: 'Type Scale', route: '/create/type-scale' },
  { name: 'Font Pair', route: '/create/font-pair' },
]

// Under 768 Type Scale keeps its family pickers in a settings sheet that is
// closed on arrival, so a phone opens that first.
async function openBrowser(page, tool, width) {
  await go(page, tool.route)
  if (tool.name === 'Type Scale' && width < 768) {
    await page.getByRole('button', { name: 'Families, preview text and fine tuning' }).click()
  }
  const trigger = page.locator('.typ-picker-trigger').first()
  await trigger.click()
  const dialog = page.locator('.fbd-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.fbd-card').first()).toBeVisible()
  return { dialog, trigger }
}

const isCoarse = (page) => page.evaluate(() => matchMedia('(pointer: coarse)').matches)

// Every tile's About button, judged from computed style and geometry.
async function aboutProblems(dialog, coarse) {
  return dialog.evaluate((root, coarse) => {
    const out = []
    const cards = [...root.querySelectorAll('.fbd-card')]
    if (cards.length < 12) out.push(`only ${cards.length} tiles rendered`)
    for (const card of cards) {
      const name = card.querySelector('.lbry-card-name')?.textContent || '(unnamed tile)'
      const btn = card.querySelector('.fbd-info')
      if (!btn) { out.push(`${name}: no About button`); continue }
      // The button and everything it sits in, up to the dialog: any one of them
      // hidden or faded is a button that needs a hover to appear.
      for (let n = btn; n && n !== root; n = n.parentElement) {
        const cs = getComputedStyle(n)
        if (cs.display === 'none') out.push(`${name}: ${n.className} is display:none`)
        if (cs.visibility !== 'visible') out.push(`${name}: ${n.className} is visibility:${cs.visibility}`)
        if (parseFloat(cs.opacity) < 1) out.push(`${name}: ${n.className} is at opacity ${cs.opacity}`)
        if (cs.pointerEvents === 'none') out.push(`${name}: ${n.className} has pointer-events:none`)
      }
      const r = btn.getBoundingClientRect()
      const tile = card.querySelector('.fbd-tile').getBoundingClientRect()
      if (!r.width || !r.height) out.push(`${name}: About has no size`)
      if (coarse && (r.width < 43.5 || r.height < 43.5)) {
        out.push(`${name}: About is ${Math.round(r.width)}x${Math.round(r.height)}, under 44px`)
      }
      const gap = r.top - tile.bottom
      if (gap < 8) out.push(`${name}: About is ${Math.round(gap)}px from the tile above it`)
    }
    return out
  }, coarse)
}

// The category control, whichever form it takes at this width.
async function categoryControl(dialog) {
  const tray = dialog.locator('.lbry-filters').first()
  const trigger = dialog.locator('.lbry-filtertrig').first()
  if (await tray.count()) return { kind: 'row', tray }
  await expect(trigger).toBeVisible()
  return { kind: 'menu', trigger }
}

// Reads the row's geometry and says what is wrong with it.
async function rowProblems(dialog, coarse) {
  return dialog.evaluate((root, coarse) => {
    const out = []
    const tray = root.querySelector('.lbry-filters')
    const pills = [...tray.querySelectorAll('.lbry-filter')]
    const rects = pills.map(p => p.getBoundingClientRect())
    const tops = new Set(rects.map(r => Math.round(r.top)))
    if (getComputedStyle(tray).flexWrap !== 'nowrap') out.push(`flex-wrap is ${getComputedStyle(tray).flexWrap}`)
    if (tops.size > 1) out.push(`chips sit on ${tops.size} lines`)
    if (tray.getBoundingClientRect().height > rects[0].height * 1.6) out.push('the row is taller than one chip')
    // Overflow must stay inside the row's own scroller: the toolbar and the
    // dialog may not grow a horizontal scroll of their own.
    const toolbar = root.querySelector('.lbry-toolbar')
    if (toolbar.scrollWidth > toolbar.clientWidth + 1) out.push('the toolbar scrolls sideways')
    if (root.scrollWidth > root.clientWidth + 1) out.push('the dialog scrolls sideways')
    const scroller = tray.closest('.lbry-toolbar-quick')
    if (scroller) {
      const ox = getComputedStyle(scroller).overflowX
      if (ox !== 'auto' && ox !== 'scroll') out.push(`the phone row is overflow-x:${ox}`)
    } else if (tray.scrollWidth > tray.clientWidth + 1) {
      out.push('the row overflows with no scroller around it')
    }
    if (coarse) {
      rects.forEach((r, i) => {
        if (r.height < 43.5 || r.width < 43.5) out.push(`${pills[i].textContent}: ${Math.round(r.width)}x${Math.round(r.height)}, under 44px`)
        if (i > 0 && r.left - rects[i - 1].right < 7.5) out.push(`${pills[i].textContent}: under 8px from the chip before it`)
      })
    }
    return out
  }, coarse)
}

// Each option can be brought into view and switched on, then the row is put back.
async function reachEveryCategory(dialog, control) {
  if (control.kind === 'row') {
    const pills = control.tray.locator('.lbry-filter')
    const n = await pills.count()
    expect(n).toBeGreaterThanOrEqual(6)
    for (let i = 0; i < n; i += 1) {
      const pill = pills.nth(i)
      await pill.click()
      await expect(pill).toHaveAttribute('aria-pressed', 'true')
      // After the click the chip is inside the scroller's visible box.
      const inside = await pill.evaluate((el) => {
        const box = (el.closest('.lbry-toolbar-quick') || el.parentElement).getBoundingClientRect()
        const r = el.getBoundingClientRect()
        return r.left >= box.left - 1 && r.right <= box.right + 1
      })
      expect(inside, `"${await pill.textContent()}" is cut off by its row after being chosen`).toBe(true)
    }
    await pills.first().click()
    return
  }
  const labelsSeen = []
  const count = await (async () => {
    await control.trigger.click()
    return dialog.locator('.lbry-filtermenu .lbry-filter').count()
  })()
  expect(count).toBeGreaterThanOrEqual(6)
  // Closed by its trigger: these checks are about reaching options; Escape has
  // its own test below.
  await control.trigger.click()
  await expect(dialog.locator('.lbry-filtermenu')).toHaveCount(0)
  for (let i = 0; i < count; i += 1) {
    if (!(await dialog.locator('.lbry-filtermenu').count())) await control.trigger.click()
    const option = dialog.locator('.lbry-filtermenu .lbry-filter').nth(i)
    await expect(option).toBeInViewport()
    labelsSeen.push((await option.textContent()).trim())
    await option.click()
    await expect(control.trigger).toContainText(labelsSeen[i])
  }
}

async function menuProblems(dialog, control, coarse) {
  await control.trigger.click()
  const problems = await dialog.evaluate((root, coarse) => {
    const out = []
    const options = [...root.querySelectorAll('.lbry-filtermenu .lbry-filter')]
    const rects = options.map(o => o.getBoundingClientRect())
    rects.forEach((r, i) => {
      if (coarse && r.height < 43.5) out.push(`${options[i].textContent}: ${Math.round(r.height)}px tall, under 44px`)
      if (coarse && i > 0 && r.top - rects[i - 1].bottom < 7.5) out.push(`${options[i].textContent}: under 8px from the option above`)
      if (r.bottom > innerHeight + 1 || r.right > innerWidth + 1) out.push(`${options[i].textContent}: off the screen`)
    })
    return out
  }, coarse)
  await control.trigger.click()
  await expect(dialog.locator('.lbry-filtermenu')).toHaveCount(0)
  return problems
}

const PHONE_AND_TABLET = [[390, 844], [768, 1024]]

for (const [width, height] of PHONE_AND_TABLET) {
  test.describe(`font browser on a coarse pointer at ${width}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true })

    for (const tool of TOOLS) {
      test(`${tool.name}: every tile shows About without hover, and the category control stays in one line`, async ({ page }) => {
        watch(page, 'designer on a phone or tablet browsing families')
        const { dialog } = await openBrowser(page, tool, width)
        expect(await isCoarse(page), 'this run has to be a coarse pointer').toBe(true)

        expect(await aboutProblems(dialog, true)).toEqual([])

        const control = await categoryControl(dialog)
        if (control.kind === 'row') expect(await rowProblems(dialog, true)).toEqual([])
        else expect(await menuProblems(dialog, control, true)).toEqual([])
        // At 390 the spec's answer is the scrolling row, not a menu.
        if (width === 390) expect(control.kind).toBe('row')

        await reachEveryCategory(dialog, control)
      })
    }
  })
}

// The Category menu sits inside the modal dialog. Escape closes the menu
// alone and returns focus to its trigger; the dialog stays open.
test.describe('font browser category menu at 768', () => {
  test.use({ viewport: { width: 768, height: 1024 } })
  test('Escape closes only the open Category menu, not the dialog', async ({ page }) => {
    watch(page, 'designer closing the category menu from the keyboard')
    const { dialog } = await openBrowser(page, TOOLS[1], 768)
    const trigger = dialog.locator('.lbry-filtertrig')
    await trigger.click()
    await expect(dialog.locator('.lbry-filtermenu')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(dialog.locator('.lbry-filtermenu')).toHaveCount(0)
    await expect(page.locator('.fbd-dialog')).toHaveCount(1, { timeout: 2000 })
    await expect(trigger).toBeFocused()
  })
})

// The chip row is restated from library.css under the dialog's root, and has
// no border of its own around the chips.
test.describe('font browser chip row has no box of its own', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('the category chips sit on the toolbar with no border around the row', async ({ page }) => {
    watch(page, 'designer looking at the category chips')
    const { dialog } = await openBrowser(page, TOOLS[1], 1440)
    const border = await dialog.locator('.lbry-filters').first().evaluate((el) => getComputedStyle(el).borderTopWidth)
    expect(border).toBe('0px')
  })
})

// Chromium reports hover: hover for a mouse, which is the case that used to hide
// About until a tile was hovered, so the K3 check has to run on a fine pointer too.
test.describe('font browser on a fine pointer at 390', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  for (const tool of TOOLS) {
    test(`${tool.name}: About is visible with no hover, and the row is one line`, async ({ page }) => {
      watch(page, 'designer with a narrow desktop window')
      const { dialog } = await openBrowser(page, tool, 390)
      expect(await isCoarse(page)).toBe(false)
      expect(await page.evaluate(() => matchMedia('(hover: hover)').matches), 'needs a hover-capable pointer').toBe(true)

      expect(await aboutProblems(dialog, false)).toEqual([])
      const control = await categoryControl(dialog)
      if (control.kind === 'row') expect(await rowProblems(dialog, false)).toEqual([])
      await reachEveryCategory(dialog, control)
    })
  }
})

test.describe('font browser at 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the dialog offers the Font Gallery\'s categories, plus Mono', async ({ page }) => {
    watch(page, 'designer comparing the gallery and the picker')
    await go(page, '/create/font-gallery')
    const galleryRow = page.getByRole('group', { name: 'Filter by category' }).first()
    await expect(galleryRow).toBeVisible()
    const gallery = (await galleryRow.getByRole('button').allTextContents()).map(s => s.trim())
    expect(gallery.length, 'the gallery lists its categories').toBeGreaterThanOrEqual(5)
    expect(gallery[0]).toBe('All')

    const { dialog } = await openBrowser(page, TOOLS[0], 1440)
    const control = await categoryControl(dialog)
    let picker
    if (control.kind === 'row') {
      picker = (await control.tray.locator('.lbry-filter').allTextContents()).map(s => s.trim())
    } else {
      await control.trigger.click()
      picker = (await dialog.locator('.lbry-filtermenu .lbry-filter').allTextContents()).map(s => s.trim())
    }
    expect(picker.slice(0, gallery.length), 'same labels, same order as the gallery').toEqual(gallery)
    expect(picker.slice(gallery.length), 'the one extra is Mono').toEqual(['Mono'])
  })

  for (const tool of TOOLS) {
    test(`${tool.name} opens the dialog, About opens the family details, Escape hands focus back`, async ({ page }) => {
      watch(page, 'designer opening the font browser')
      const { dialog, trigger } = await openBrowser(page, tool, 1440)
      await expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(await aboutProblems(dialog, false)).toEqual([])

      const first = dialog.locator('.fbd-card').first()
      const family = (await first.locator('.lbry-card-name').textContent()).trim()
      await first.locator('.fbd-info').click()
      await expect(dialog.getByRole('tab', { name: 'About' })).toBeVisible()
      await expect(dialog.locator('.fbd-detail-name')).toHaveText(family)
      await dialog.getByRole('button', { name: /All families/ }).click()
      await expect(dialog.locator('.fbd-card').first()).toBeVisible()

      await page.keyboard.press('Escape')
      await expect(page.locator('.fbd-dialog')).toHaveCount(0)
      await expect(trigger).toBeFocused()
    })
  }
})
