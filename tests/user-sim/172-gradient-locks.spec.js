// /create/gradient, gradient generation v2 G2 part 2: the locks in the UI
// (handover/specs/gradient-generation-v2-2026-10-28.md 4.1, 4.3).
//
// Every expected sentence and size is hand-checked from the spec, not read back
// from the code. The seeded gradient is a three-stop Linear at 160 degrees with
// stops at 0, 55 and 100, so a roll that keeps a position or an angle is told from
// one that happens to land on it by running ten presses.
//
// MUTATIONS (each turns the tests named red):
//   a lock button drops aria-pressed                          -> "each lock button toggles aria-pressed"
//   keepLabel loses its "is kept" branch                      -> "each lock button toggles aria-pressed"
//   the colour lock ignored by rebuildStops                   -> "Random keeps a locked colour"
//   the position lock ignored by rebuildStops                 -> "Random keeps a locked position"
//   lockedRollOptions drops locks.type                        -> "Random keeps a locked type"
//   lockedRollOptions drops locks.angle                       -> "Random keeps a locked angle"
//   ShuffleBody ignores lockedType (no note, no aria-disabled) -> "a type lock overrules the Type filter ..."
//   the FilterGroup onClick ignores lockedNote                -> "a type lock overrules the Type filter ..."
//   ShuffleBody ignores lockedStops                           -> "a stop lock overrules the Stops filter ..."
//   the Keep the angle button put back in ShuffleBody          -> "Shuffle settings no longer holds Keep the angle"
//   the EVERY_COLOUR_LOCKED toast dropped from randomise      -> "when every colour is locked ..."
//   LockMark returns null                                     -> "a locked stop wears a mark on the rail and the ramp"
//   the persist effect writes {color, position} only          -> "the stop locks are kept in the shared design", "... comes back from another tool ..."
//   RANDOM_DRAWS_SPACE set true (or the guard removed)        -> "the angle lock names the angle it keeps, and the interpolation lock is not offered"
//   keepLabel for the angle loses its value                   -> "the angle lock names the angle it keeps ..."
//   .grd .grd-iconbtn { width: 44px } removed from coarse     -> "the lock buttons are 44px on a finger"
//   a lock row given its own height (a new row)               -> "toggling every lock does not change the page height"  (also the 768 case)
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const ROUTE = '/create/gradient'
const PALETTE = ['#2F6BFF', '#E0784E', '#3FAFA0', '#0B0C0E', '#F7F7F4']
const SEED = {
  type: 'Linear', angle: 160, space: 'oklch', source: 'own',
  stops: [{ color: '#0A0F2C', position: 0 }, { color: '#27348B', position: 55 }, { color: '#6E6BFF', position: 100 }],
}

const seed = (page) => page.addInitScript((d) => {
  localStorage.setItem('vs-current-design', JSON.stringify({
    palette: { base: d.palette[0], harmony: 'auto', extraColors: [], activeIdx: 0, colors: d.palette },
    gradient: d.gradient,
  }))
}, { palette: PALETTE, gradient: SEED })

const panelOf = (page) => page.getByRole('complementary', { name: 'Gradient controls' })
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
async function open(page) {
  await seed(page)
  await go(page, ROUTE)
  await expect(panelOf(page)).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await settle(page)
}

/** The lock buttons by what they keep. The Selected stop ones are the second match of the stop-row ones for the active stop. */
const stopList = (page) => page.getByRole('group', { name: 'Stop list' })
const selectedSection = (page) => panelOf(page).getByRole('group', { name: 'Selected stop' })
const geometry = (page) => panelOf(page).getByRole('group', { name: 'Geometry' })
// The angle's label carries its value ("Keep the angle (160°) when you press Random"), so each name takes an optional "(N°)".
const lockIn = (scope, thing) => scope.getByRole('button', { name: new RegExp(`(^Keep ${thing}(?: \\(\\d+°\\))? when you press Random$)|(^${thing[0].toUpperCase()}${thing.slice(1)}(?: \\(\\d+°\\))? (is|are) kept\\. Press to let Random change (it|them)\\.$)`) })
const random = (page) => page.locator('[data-tool-toolbar]').getByRole('button', { name: /^Random$/ })
const typeOf = (page) => page.evaluate(() => document.querySelector('.grd-canvas').getAttribute('aria-label').replace(' gradient preview', ''))
const hexOfStop = (page, n) => page.getByRole('button', { name: new RegExp(`^Select stop ${n}, #`) }).getAttribute('aria-label').then((s) => /#[0-9A-F]{6}/i.exec(s)[0].toUpperCase())
const posOfStop = (page, n) => page.getByRole('button', { name: new RegExp(`^Gradient stop ${n} at `) }).getAttribute('aria-label').then((s) => Number(/at (\d+)%/.exec(s)[1]))
const settingsDialog = async (page) => {
  await page.locator('[data-tool-toolbar]').getByRole('button', { name: /^Shuffle settings(, narrowed)?$/ }).click()
  const d = page.getByRole('dialog', { name: 'Shuffle settings' })
  await expect(d).toBeVisible()
  return d
}

/** The four lock buttons in Selected stop and Geometry, as [scope, what they keep]. The interpolation lock is hidden until G3. */
const LOCK_PLACES = (page) => [
  [selectedSection(page), "stop 1's colour"], [selectedSection(page), "stop 1's position"],
  [geometry(page), 'the type'], [geometry(page), 'the angle'],
]
/** Locking each one in turn moves neither the page, the panel nor Available colours. */
async function expectLocksKeepHeight(page) {
  const shape = () => page.evaluate(() => ({
    page: document.documentElement.scrollHeight,
    panel: document.querySelector('.tl-panel').getBoundingClientRect().height,
    avail: document.querySelector('.grd-avail').getBoundingClientRect().height,
  }))
  const first = await shape()
  for (const [scope, thing] of LOCK_PLACES(page)) {
    await lockIn(scope, thing).click()
    await settle(page)
    expect(await shape(), `after locking ${thing}`).toEqual(first)
  }
}

test.describe('the locks at 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('each lock button toggles aria-pressed and says what it keeps', async ({ page }) => {
    watch(page, 'someone locking each part of a gradient')
    await open(page)
    const places = [
      ['stop 1\'s colour', selectedSection(page)],
      ['stop 1\'s position', selectedSection(page)],
      ['stop 1\'s colour', stopList(page)],
      ['the type', geometry(page)],
      ['the angle', geometry(page)],
    ]
    for (const [thing, scope] of places) {
      const btn = lockIn(scope, thing)
      await expect(btn, `${thing} lock`).toHaveAttribute('aria-pressed', /^(true|false)$/)
      const was = await btn.getAttribute('aria-pressed')
      await btn.click()
      await expect(btn, `${thing} flips`).toHaveAttribute('aria-pressed', was === 'true' ? 'false' : 'true')
      await expect(btn).toHaveAttribute('title', (await btn.getAttribute('aria-label')))
      await btn.click()
      await expect(btn, `${thing} flips back`).toHaveAttribute('aria-pressed', was)
    }
    // The exact wording, off and on (spec 4.1).
    const type = geometry(page).getByRole('button', { name: 'Keep the type when you press Random' })
    await type.click()
    await expect(geometry(page).getByRole('button', { name: 'The type is kept. Press to let Random change it.' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('a lock never blocks a hand edit', async ({ page }) => {
    await open(page)
    await lockIn(geometry(page), 'the angle').click()
    await lockIn(selectedSection(page), "stop 1's colour").click()
    const field = page.getByRole('spinbutton', { name: 'Gradient angle in degrees' })
    await field.fill('33')
    await field.press('Enter')
    await expect(field).toHaveValue('33')
    const hex = page.getByRole('textbox', { name: 'Stop 1 hex' })
    await hex.fill('#123456')
    await hex.press('Enter')
    await expect(hexOfStop(page, 1)).resolves.toBe('#123456')
  })

  test('Random keeps a locked colour across ten presses', async ({ page }) => {
    await open(page)
    const before = await hexOfStop(page, 2)
    await lockIn(stopList(page), "stop 2's colour").click()
    for (let i = 0; i < 10; i++) {
      await random(page).click()
      expect(await hexOfStop(page, 2), `Random ${i + 1}`).toBe(before)
    }
  })

  test('Random keeps a locked position across ten presses', async ({ page }) => {
    await open(page)
    // Stop 2 is at 55; the Position lock is on the Selected stop section, so make stop 2 the active one first.
    await page.getByRole('button', { name: /^Select stop 2, #/ }).click()
    await lockIn(selectedSection(page), "stop 2's position").click()
    for (let i = 0; i < 10; i++) {
      await random(page).click()
      expect(await posOfStop(page, 2), `Random ${i + 1}`).toBe(55)
    }
  })

  test('Random keeps a locked type across ten presses', async ({ page }) => {
    await open(page)
    await geometry(page).getByRole('button', { name: 'Radial', exact: true }).click()
    await lockIn(geometry(page), 'the type').click()
    for (let i = 0; i < 10; i++) {
      await random(page).click()
      expect(await typeOf(page), `Random ${i + 1}`).toBe('Radial')
    }
  })

  test('Random keeps a locked angle across ten presses', async ({ page }) => {
    await open(page)
    await geometry(page).getByRole('button', { name: 'Linear', exact: true }).click()
    const field = page.getByRole('spinbutton', { name: 'Gradient angle in degrees' })
    await field.fill('77')
    await field.press('Enter')
    await lockIn(geometry(page), 'the angle').click()
    // Type is free, so a roll can land on Radial (no angle field); the angle underneath is read after a Linear press.
    for (let i = 0; i < 10; i++) {
      await random(page).click()
      await geometry(page).getByRole('button', { name: 'Linear', exact: true }).click()
      await expect(field, `Random ${i + 1}`).toHaveValue('77')
    }
  })

  test('a type lock overrules the Type filter and says so; unlocking restores it', async ({ page }) => {
    await open(page)
    // The Type filter is set to Conic first, then the type is locked to Radial.
    let dialog = await settingsDialog(page)
    await dialog.getByRole('group', { name: 'Type' }).getByRole('button', { name: 'Conic', exact: true }).click()
    await page.keyboard.press('Escape')
    await geometry(page).getByRole('button', { name: 'Radial', exact: true }).click()
    await lockIn(geometry(page), 'the type').click()

    dialog = await settingsDialog(page)
    const row = dialog.getByRole('group', { name: 'Type' })
    await expect(row).toHaveAttribute('aria-disabled', 'true')
    await expect(dialog.getByText('Type is locked to Radial. Unlock it in Geometry to use this.')).toBeVisible()
    // Pills stay visible, and a press on one changes nothing.
    await expect(row.getByRole('button', { name: 'Conic', exact: true })).toBeVisible()
    // Playwright reads aria-disabled on the group as not enabled, so force the press a mouse would make.
    await row.getByRole('button', { name: 'Linear', exact: true }).click({ force: true })
    await expect(row.getByRole('button', { name: 'Conic', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(row.getByRole('button', { name: 'Linear', exact: true })).toHaveAttribute('aria-pressed', 'false')
    await page.keyboard.press('Escape')

    await lockIn(geometry(page), 'the type').click()
    dialog = await settingsDialog(page)
    await expect(dialog.getByRole('group', { name: 'Type' })).not.toHaveAttribute('aria-disabled', 'true')
    await expect(dialog.getByRole('group', { name: 'Type' }).getByRole('button', { name: 'Conic', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(dialog.getByText(/Type is locked to/)).toHaveCount(0)
  })

  test('a stop lock overrules the Stops filter and says so; Shuffle settings no longer holds Keep the angle', async ({ page }) => {
    await open(page)
    await lockIn(stopList(page), "stop 1's colour").click()
    const dialog = await settingsDialog(page)
    await expect(dialog.getByRole('group', { name: 'Stops' })).toHaveAttribute('aria-disabled', 'true')
    await expect(dialog.getByText('Locked stops keep the count at 3.')).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Keep the angle/ })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await lockIn(stopList(page), "stop 1's colour").click()
    const again = await settingsDialog(page)
    await expect(again.getByRole('group', { name: 'Stops' })).not.toHaveAttribute('aria-disabled', 'true')
  })

  test('when every colour is locked, Random says only the shape changed', async ({ page }) => {
    await open(page)
    for (const n of [1, 2, 3]) await lockIn(stopList(page), `stop ${n}'s colour`).click()
    await random(page).click()
    await expect(page.locator('.toast.show')).toContainText('Every colour is locked, so only the shape changed.')
  })

  test('a locked stop wears a mark on the rail and the ramp: a lock for colour, a pin for position', async ({ page }) => {
    await open(page)
    await expect(page.locator('.grd-lockmark')).toHaveCount(0)
    await lockIn(stopList(page), "stop 1's colour").click()
    await expect(page.locator('.grd-handle .grd-lockmark-lock')).toHaveCount(1)
    await expect(page.locator('.grd-ramp-dot .grd-lockmark-lock')).toHaveCount(1)
    await expect(page.locator('.grd-lockmark-pin')).toHaveCount(0)
    await lockIn(selectedSection(page), "stop 1's position").click()
    await expect(page.locator('.grd-handle .grd-lockmark-pin svg')).toHaveCount(1)
    await expect(page.locator('.grd-ramp-dot .grd-lockmark-pin svg')).toHaveCount(1)
    // Both marks are 12px, so they read at a glance.
    const sizes = await page.locator('.grd-handle .grd-lockmark svg').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)))
    expect(sizes).toEqual([12, 12])
  })

  test('the angle lock names the angle it keeps, and the interpolation lock is not offered', async ({ page }) => {
    await open(page)
    await expect(geometry(page).getByRole('button', { name: 'Keep the angle (160°) when you press Random' })).toBeVisible()
    await lockIn(geometry(page), 'the angle').click()
    await expect(geometry(page).getByRole('button', { name: 'The angle (160°) is kept. Press to let Random change it.' })).toHaveAttribute('aria-pressed', 'true')
    // Random does not draw the interpolation space until G3, so there is no lock to press.
    await expect(geometry(page).getByRole('button', { name: /interpolation/i })).toHaveCount(0)
    await expect(geometry(page).getByRole('group', { name: 'Interpolation' }).getByRole('button')).toHaveCount(2)
  })

  test('the stop locks are kept in the shared design, so they survive a trip to another tool', async ({ page }) => {
    await open(page)
    await lockIn(stopList(page), "stop 1's colour").click()
    await page.getByRole('button', { name: /^Select stop 2, #/ }).click()
    await lockIn(selectedSection(page), "stop 2's position").click()
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('vs-current-design') || '{}').gradient?.stops?.map((s) => [!!s.lockColour, !!s.lockPosition]))
    await expect.poll(saved).toEqual([[true, false], [false, true], [false, false]])
  })

  test('a design that comes back from another tool with locks shows them on', async ({ page }) => {
    await page.addInitScript((d) => {
      localStorage.setItem('vs-current-design', JSON.stringify({
        palette: { base: d.palette[0], harmony: 'auto', extraColors: [], activeIdx: 0, colors: d.palette },
        gradient: { ...d.gradient, stops: d.gradient.stops.map((s, i) => ({ ...s, lockColour: i === 0, lockPosition: i === 1 })) },
      }))
    }, { palette: PALETTE, gradient: SEED })
    await go(page, ROUTE)
    await expect(panelOf(page)).toBeVisible()
    await expect(lockIn(stopList(page), "stop 1's colour")).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.grd-handle .grd-lockmark-lock')).toHaveCount(1)
    await expect(page.locator('.grd-handle .grd-lockmark-pin')).toHaveCount(1)
  })

  test('toggling every lock does not change the page height', async ({ page }) => {
    await open(page)
    await expectLocksKeepHeight(page)
  })
})

test.describe('the locks at 768', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('every lock is there, and toggling them does not change the page height', async ({ page }) => {
    await open(page)
    for (const [scope, thing] of LOCK_PLACES(page)) await expect(lockIn(scope, thing), `${thing} lock`).toBeVisible()
    await expectLocksKeepHeight(page)
  })

  test('Random keeps a locked colour and a locked type across five presses', async ({ page }) => {
    await open(page)
    const before = await hexOfStop(page, 2)
    await lockIn(stopList(page), "stop 2's colour").click()
    await geometry(page).getByRole('button', { name: 'Radial', exact: true }).click()
    await lockIn(geometry(page), 'the type').click()
    for (let i = 0; i < 5; i++) {
      await random(page).click()
      expect(await hexOfStop(page, 2), `Random ${i + 1} colour`).toBe(before)
      expect(await typeOf(page), `Random ${i + 1} type`).toBe('Radial')
    }
  })
})

test.describe('the locks on a finger (390, touch)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the lock buttons are 44px on a finger', async ({ page }) => {
    await open(page)
    // Viewport-only reads: an element or full-page screenshot in a touch context turns pointer: coarse off.
    const boxes = await page.locator('.grd-lock').evaluateAll((els) => els.map((e) => {
      const r = e.getBoundingClientRect()
      return { name: e.getAttribute('aria-label'), w: Math.round(r.width), h: Math.round(r.height) }
    }))
    expect(boxes.length, '3 stop rows + the selected stop colour and position + type + angle; no interpolation lock yet').toBe(7)
    for (const b of boxes) {
      expect(b.w, `${b.name} width`).toBeGreaterThanOrEqual(44)
      expect(b.h, `${b.name} height`).toBeGreaterThanOrEqual(44)
    }
  })
})
