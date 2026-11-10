// THE EMOJI LIBRARY'S DETAIL DIALOG: ONE EMOJI, EVERY WAY OF WRITING IT DOWN, A COPY BUTTON BESIDE EACH.
//
// A cell click (or Enter) opens a dialog for that emoji. It shows the glyph large, its name, its
// Unicode code points, its chat shortcode, its HTML entity and the Unicode version it arrived in,
// with a 44px Copy button on every line. An emoji that takes a skin tone gets a tone picker that
// starts from the page's tone; a car does not. Escape closes the dialog and focus goes back to the
// cell. On a phone the dialog is a bottom sheet. There is no download: the glyph is the visitor's
// system font, so there is no image of ours to hand out.
//
// Run at 1440 and at 390 (a touch phone), in the light and the dark theme. The expected values are
// written out below, not read from src, so a wrong table fails here rather than agreeing with itself.
//
// HOW TO SEE EACH FAIL (src/ unless named; mutate one, run this file, restore):
//   components/library/EmojiGrid.jsx cell onClick calls a clipboard write again instead of onOpen
//                                                                      -> every test here: no dialog opens
//   EmojiDetailDialog.jsx formatCodePoints(shown) -> formatCodePoints(emoji)
//                                                                      -> "the tone picker changes the code points"
//   EmojiDetailDialog.jsx hasTone = true (drop the TONE_EMOJI test)    -> "no tone picker for a car"
//   EmojiDetailDialog.jsx useState(hasTone ? pageTone : '') -> useState('')
//                                                                      -> "starts from the page's tone"
//   EmojiDetailDialog.jsx drops the useModalDialog call                -> "Escape closes ... focus returns"
//   EmojiDetailDialog.jsx the shortcode row copies short.version       -> "each Copy button ..."
//   styles/pages/icon-emoji-library.css .emd-row flex-wrap:nowrap -> wrap (or .emd-copy min-height:44px removed)
//                                                                      -> "the layout" (a button drops under its text, or is 40px)
//   styles/pages/icon-emoji-library.css the 641px .emd-panel width rule loses its media query
//                                                                      -> the phone "layout": the sheet stops being full width
//   styles/pages/icon-emoji-library.css .iel-page .emd-body display:flex -> grid  -> the desktop "layout": the body is not a single flex column
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PERSONA = 'someone looking up how to write an emoji'
const ROUTE = '/create/emoji'
const SEARCH = 'input[type="search"]'
const CELL = '.emoji-cell'
const DIALOG = '.emd-panel'
const SHOTS = '.claude/scratch/emoji1'

const VIEWS = [
  { name: 'desktop', width: 1440, height: 900, ctx: { viewport: { width: 1440, height: 900 } } },
  { name: 'phone', width: 390, height: 844, phone: true, ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
]

const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText())
const cellFor = (page, glyph) => page.locator(`${CELL}[title^="Details for ${glyph}"]`)
const dialogOf = (page) => page.locator(DIALOG)
const valueOf = (dialog, label) => dialog.locator('.emd-row').filter({ hasText: label }).locator('.emd-value')

/** Let the dialog's entrance animation finish, so a measurement or a screenshot sees it at rest. */
const settled = (page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.timeline instanceof DocumentTimeline).map((a) => a.finished.catch(() => {}))))

/** Search for `query` when given, click the cell for `glyph`, and wait for the dialog. */
async function openEmoji(page, glyph, query) {
  if (query) {
    const field = page.locator(SEARCH)
    await field.click()          // the index loads on focus
    await field.fill(query)
  }
  const cell = cellFor(page, glyph)
  await expect(cell).toHaveCount(1, { timeout: 15_000 })
  await cell.click()
  const dialog = dialogOf(page)
  await expect(dialog, `the cell for ${glyph} opens the dialog`).toBeVisible()
  return { cell, dialog }
}

for (const view of VIEWS) {
  for (const scheme of ['light', 'dark']) {
    test.describe(`${view.name} ${view.width} · ${scheme}`, () => {
      test.use({ colorScheme: scheme, ...view.ctx })

      test.beforeEach(async ({ page }) => {
        watch(page, PERSONA)
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
        await go(page, ROUTE)
        await expect(page.locator(SEARCH)).toBeVisible()
        await expect(page.locator(CELL).first()).toBeVisible()
        await expect(page.locator('html'), 'the theme under test is the one applied').toHaveAttribute('data-theme', scheme)
      })

      test('a click opens the dialog with its name, code points, shortcode, entity and version', async ({ page }) => {
        const { dialog } = await openEmoji(page, '😀')
        await expect(page.getByRole('dialog', { name: 'Grinning face' }), 'the dialog is named by its title').toBeVisible()
        await expect(dialog.locator('.emd-glyph')).toHaveText('😀')
        await expect(valueOf(dialog, 'Code points')).toHaveText('U+1F600')
        await expect(valueOf(dialog, 'Shortcode')).toHaveText(':grinning:')
        await expect(valueOf(dialog, 'HTML entity')).toHaveText('&#x1F600;')
        await expect(valueOf(dialog, 'Unicode version')).toHaveText('Unicode 6.1')
        await settled(page)
        await page.screenshot({ path: `${SHOTS}/dialog-${view.width}-${scheme}.png` })
      })

      test('each Copy button puts its own text on the clipboard and says so', async ({ page }) => {
        const { dialog } = await openEmoji(page, '😀')
        await expect(valueOf(dialog, 'Shortcode'), 'the tables are loaded before copying').toHaveText(':grinning:')
        const cases = [
          ['Copy emoji', 'Copied emoji', '😀'],
          ['Copy code points', 'Copied code points', 'U+1F600'],
          ['Copy shortcode', 'Copied shortcode', ':grinning:'],
          ['Copy HTML entity', 'Copied HTML entity', '&#x1F600;'],
          ['Copy Unicode version', 'Copied Unicode version', '6.1'],
        ]
        for (const [idle, done, text] of cases) {
          await dialog.getByRole('button', { name: idle, exact: true }).click()
          await expect(dialog.getByRole('button', { name: done, exact: true }), `${idle} confirms`).toBeVisible()
          await expect.poll(() => clipboard(page), `${idle} copied the wrong text`).toBe(text)
        }
        // The confirmation is brief: the label goes back to Copy.
        await expect(dialog.getByRole('button', { name: 'Copy Unicode version', exact: true })).toBeVisible({ timeout: 5_000 })
        expect(await dialog.getByRole('button', { name: /download/i }).count(), 'the dialog offers no download').toBe(0)
      })

      test('the tone picker appears for a hand, changes every code, and is absent for a car', async ({ page }) => {
        const { dialog } = await openEmoji(page, '👋', 'waving hand')
        const picker = dialog.getByRole('group', { name: 'Skin tone' })
        await expect(picker, 'a hand takes a tone').toBeVisible()
        await expect(picker.getByRole('button')).toHaveCount(6)
        await expect(valueOf(dialog, 'Code points')).toHaveText('U+1F44B')

        await picker.getByRole('button', { name: 'Medium skin tone' }).click()
        await expect(picker.getByRole('button', { name: 'Medium skin tone' })).toHaveAttribute('aria-pressed', 'true')
        await expect(dialog.locator('.emd-glyph')).toHaveText('👋🏽')
        await expect(valueOf(dialog, 'Code points')).toHaveText('U+1F44B U+1F3FD')
        await expect(valueOf(dialog, 'HTML entity')).toHaveText('&#x1F44B;&#x1F3FD;')
        await dialog.getByRole('button', { name: 'Copy emoji', exact: true }).click()
        await expect.poll(() => clipboard(page)).toBe('👋🏽')
        await settled(page)
        await page.screenshot({ path: `${SHOTS}/dialog-toned-${view.width}-${scheme}.png` })

        await picker.getByRole('button', { name: 'Default skin tone' }).click()
        await expect(valueOf(dialog, 'Code points')).toHaveText('U+1F44B')

        await page.keyboard.press('Escape')
        await expect(dialog).toBeHidden()

        await openEmoji(page, '🚗', 'automobile')
        await expect(dialogOf(page).locator('.emd-glyph')).toHaveText('🚗')
        await expect(dialogOf(page).getByRole('group', { name: 'Skin tone' }), 'a car takes no tone').toHaveCount(0)
        await expect(valueOf(dialogOf(page), 'Code points')).toHaveText('U+1F697')
      })

      test("the dialog starts from the page's skin tone", async ({ page }) => {
        await page.locator('.emoji-tone-btn').click()
        await page.locator('.emoji-skin-btn').nth(3).click()          // Skin tone 3: medium
        const { dialog } = await openEmoji(page, '👋', 'waving hand')
        await expect(dialog.getByRole('button', { name: 'Medium skin tone' })).toHaveAttribute('aria-pressed', 'true')
        await expect(valueOf(dialog, 'Code points')).toHaveText('U+1F44B U+1F3FD')
        await expect(dialog.locator('.emd-glyph')).toHaveText('👋🏽')
      })

      test('Escape closes the dialog and focus returns to the cell', async ({ page }) => {
        const { cell, dialog } = await openEmoji(page, '😀')
        await expect.poll(() => dialog.evaluate((el) => el.contains(document.activeElement)), 'focus moves into the dialog').toBe(true)
        await page.keyboard.press('Escape')
        await expect(dialog).toBeHidden()
        await expect(cell, 'focus is back on the cell that opened it').toBeFocused()
      })

      test('Close, and a press on the scrim, also close it', async ({ page }) => {
        const { cell, dialog } = await openEmoji(page, '😀')
        await dialog.getByRole('button', { name: 'Close emoji details' }).click()
        await expect(dialog).toBeHidden()
        await expect(cell).toBeFocused()

        await cell.click()
        await expect(dialog).toBeVisible()
        await page.mouse.click(2, 2)
        await expect(dialog).toBeHidden()
      })

      test(view.phone ? 'the layout is a bottom sheet with 44px targets' : 'the layout is a centred dialog', async ({ page }) => {
        const { dialog } = await openEmoji(page, '👋', 'waving hand')
        await expect(valueOf(dialog, 'Shortcode')).toHaveText(':wave:')
        await settled(page)
        const m = await dialog.evaluate((el) => {
          const box = (n) => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, w: r.width, h: r.height } }
          const cs = getComputedStyle(el)
          const body = el.querySelector('.emd-body')
          return {
            panel: box(el),
            vw: innerWidth,
            vh: innerHeight,
            radius: { top: cs.borderTopLeftRadius, bottom: cs.borderBottomLeftRadius },
            bodyDisplay: getComputedStyle(body).display,
            bodyOverflow: body.scrollWidth - body.clientWidth,
            buttons: [...el.querySelectorAll('button')].map((b) => ({ label: b.getAttribute('aria-label') || b.textContent, ...box(b) })),
            rows: [...el.querySelectorAll('.emd-row')].map((row) => {
              const text = box(row.querySelector('.emd-text'))
              const btn = box(row.querySelector('button'))
              const r = box(row)
              return { label: row.querySelector('.emd-label').textContent, row: r, text, btn, bg: getComputedStyle(row).backgroundColor, radius: getComputedStyle(row).borderTopLeftRadius }
            }),
            labelFont: getComputedStyle(el.querySelector('.emd-label')).fontFamily,
            valueFont: getComputedStyle(el.querySelector('.emd-value')).fontFamily,
          }
        })

        // The panel is inside the screen and the body does not scroll sideways.
        expect(m.panel.x, 'panel starts inside the screen').toBeGreaterThanOrEqual(-0.5)
        expect(m.panel.right, 'panel ends inside the screen').toBeLessThanOrEqual(m.vw + 0.5)
        expect(m.bodyOverflow, 'the body scrolls sideways').toBeLessThanOrEqual(1)
        // One flex column.
        expect(m.bodyDisplay).toBe('flex')

        if (view.phone) {
          expect(m.panel.w, 'the sheet is the full width').toBeGreaterThanOrEqual(m.vw - 1)
          expect(Math.abs(m.panel.bottom - m.vh), 'the sheet sits on the bottom edge').toBeLessThanOrEqual(1)
          expect(m.radius.top, 'the sheet has rounded top corners').not.toBe('0px')
          expect(m.radius.bottom, 'and square bottom corners').toBe('0px')
          for (const b of m.buttons) {
            expect(b.h, `"${b.label}" is at least 44px tall`).toBeGreaterThanOrEqual(43.5)
            expect(b.w, `"${b.label}" is at least 44px wide`).toBeGreaterThanOrEqual(43.5)
          }
        } else {
          expect(m.panel.w, 'the dialog is a narrow panel').toBeLessThanOrEqual(441)
          expect(Math.abs((m.panel.x + m.panel.right) / 2 - m.vw / 2), 'centred').toBeLessThanOrEqual(2)
          expect(m.panel.bottom, 'it floats clear of the bottom edge').toBeLessThan(m.vh - 8)
          expect(m.radius.bottom, 'with all four corners rounded').not.toBe('0px')
          for (const b of m.buttons.filter((x) => /^Copy|^Copied/.test(x.label))) {
            expect(b.h, `"${b.label}" is 44px tall`).toBeGreaterThanOrEqual(43.5)
          }
        }

        // Each row is one line of [text][button]: the button never drops under its text, stays inside
        // the row, and the row is not a card (no ground, no corner).
        expect(m.rows).toHaveLength(4)
        for (const r of m.rows) {
          expect(r.btn.x, `${r.label}: the button sits right of its text`).toBeGreaterThanOrEqual(r.text.right - 0.5)
          expect(r.btn.y, `${r.label}: the button is inside the row`).toBeGreaterThanOrEqual(r.row.y - 0.5)
          expect(r.btn.bottom, `${r.label}: the button is inside the row`).toBeLessThanOrEqual(r.row.bottom + 0.5)
          expect(r.btn.right, `${r.label}: the button is inside the panel`).toBeLessThanOrEqual(m.panel.right + 0.5)
          expect(r.bg, `${r.label}: a row has no ground of its own`).toBe('rgba(0, 0, 0, 0)')
          expect(r.radius, `${r.label}: a row has no corner`).toBe('0px')
        }
        // Labels are the UI sans; the literal values are mono.
        expect(m.labelFont).not.toMatch(/mono/i)
        expect(m.valueFont).toMatch(/mono/i)

        await page.screenshot({ path: `${SHOTS}/layout-${view.width}-${scheme}.png` })
      })
    })
  }
}
