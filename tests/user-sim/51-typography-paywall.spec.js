// Where the typography paywall sits, driven rather than read.
//
// Founder decision 2026-09-05, settling [typography-paywall-model]: browsing is
// free, saving is Pro. This file proves both halves against the production
// build, and the FREE half gets the longer treatment, because it is the half
// that fails silently.
//
// ── Why the browse assertions look like the prompt-library ones ─────────────
//
// 45-prompt-library-gate.spec.js exists because a gate counted POSITIONS in a
// FILTERED list: "free" meant the first twelve of whatever view you had built,
// and the search box, the sort control and the category chips each rebuilt the
// view, so all twenty locked prompts were reachable with no devtools at all.
//
// The typography tools must never acquire a gate of that shape, and the way to
// be sure is the same: drive the actual controls. The difference is the
// direction of the assertion. There, a locked item appearing in any view was
// the defect. Here, a locked item appearing in ANY view is the defect —
// browsing the catalogue is the free tier, and the catalogue is Google Fonts,
// which is public by construction. A placeholder card in the font gallery would
// mean someone had gated public data and broken the thing that sells the tools.
//
// ── The positive controls ──────────────────────────────────────────────────
//
// "No locked card found" is trivially true of a page that rendered nothing, and
// that is exactly how this suite would start lying. So every sweep is paired
// with a control that proves the view actually rebuilt: the card count changes
// when the search narrows, and the first family changes when the sort does. If
// the controls stop working the file fails rather than passing vacuously.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { FREE_SAVE_LIMITS } from '../../src/config/plans.js'

const GALLERY = '/create/font-gallery'
const PAIR = '/create/font-pair'
const SCALE = '/create/type-scale'
const FIXTURE = '/tests/user-sim/fixtures/type-save.html'

// Anything utils/lockedPreview.js and components/library/LockedTease.jsx can
// put on a page. None of it belongs on a typography surface.
const LOCKED = '.lockt-card, .lockt-cta, .lockt-row, .lockt-stripes, .lockt-lines'

// The gallery's toolbar renders its filters either as an inline row of buttons
// or behind a popover trigger, depending on the width it has. Drive whichever
// is there rather than pinning one and calling the other a failure.
async function chooseFilter(page, group, option) {
  const trigger = page.getByRole('button', { name: new RegExp(`^${group}`, 'i') }).first()
  const inline = page.getByRole('group', { name: new RegExp(group, 'i') })
  if (await inline.count()) {
    const btn = inline.getByRole('button', { name: option, exact: true })
    if (await btn.count()) { await btn.first().click(); return true }
  }
  if (await trigger.count()) {
    await trigger.click()
    const btn = page.getByRole('button', { name: option, exact: true })
    if (await btn.count()) { await btn.first().click(); await page.keyboard.press('Escape'); return true }
    await page.keyboard.press('Escape')
  }
  return false
}

// What a signed-out visitor can actually see of the gallery right now.
//
// `catalogueLoading` is reported for the reason `renderState` reports
// `crashed`: a gallery that has not got its catalogue yet looks IDENTICAL to a
// gallery whose filter broke, if all you count is rows. On 2026-09-06 this file
// failed with "the gallery rendered no rows at all / Expected: > 10 /
// Received: 0", in a run with no build-asset failure anywhere in it, on a PR
// that touched no font-related file, and it passed 8 of 8 in isolation. The
// route had arrived; the TOOL was still showing <FontCatalogLoading>, which the
// three typography tools render INSTEAD of their workbench.
//
// `go()` -> `ready()` now waits that out for every spec in the suite (the
// contract is in 47-lazy-route-readiness.spec.js), so this should never be true
// here. It is reported anyway, and named in the assertion below, because the
// count alone sent one investigation at the filter.
function galleryState(page) {
  return page.evaluate((lockedSel) => {
    const cards = [...document.querySelectorAll('.fg-card')]
    const names = [...document.querySelectorAll('.fg-card-name')]
      .map((el) => el.textContent.trim()).filter(Boolean)
    return {
      cards: cards.length,
      catalogueLoading: !!document.querySelector('.typ-loading > .fg-loader'),
      names,
      first: names[0] || null,
      locked: document.querySelectorAll(lockedSel).length,
      // A gate that withholds a family would have to say so somewhere.
      proMentions: (document.body.innerText.match(/\bPro\b/g) || []).length,
      upgradeControls: document.querySelectorAll('[class*="upgrade"], [data-testid*="wall"]').length,
    }
  }, LOCKED)
}

test.describe('Typography: browsing stays free under every view', () => {
  test('the gallery renders, and its controls actually rebuild the view', async ({ page }) => {
    // THE POSITIVE CONTROL, first. Everything below is worthless if the gallery
    // did not render or if its controls are inert.
    watch(page, 'a designer browsing the font gallery signed out')
    await go(page, GALLERY)

    const base = await galleryState(page)
    // NAMED, not counted. Zero rows has two completely different causes and
    // they want opposite next steps: a broken filter is a defect in this build,
    // and a catalogue still in flight is a measurement taken too early.
    expect(
      base.catalogueLoading,
      'the gallery was still loading its catalogue when this was measured, so the row count'
      + ' below is a reading of the skeleton and NOT evidence about the gallery. go() -> ready()'
      + ' is supposed to wait this out — see 47-lazy-route-readiness.spec.js.',
    ).toBe(false)
    expect(base.cards, 'the gallery rendered no rows at all, with its catalogue already in')
      .toBeGreaterThan(10)

    // The search must narrow. If it does not, the sweeps below prove nothing.
    await page.getByRole('searchbox', { name: /Search font families/i }).fill('serif')
    await page.waitForTimeout(400)
    const searched = await galleryState(page)
    expect(searched.cards, 'the search box did not change the result set').toBeLessThan(base.cards)
    expect(searched.cards, 'the search box emptied the gallery').toBeGreaterThan(0)

    await page.getByRole('searchbox', { name: /Search font families/i }).fill('')
    await page.waitForTimeout(400)
    const cleared = await galleryState(page)
    expect(cleared.cards, 'clearing the search did not restore the list').toBe(base.cards)
  })

  test('no search term produces a locked or placeholder card', async ({ page }) => {
    watch(page, 'a designer searching the font gallery signed out')
    await go(page, GALLERY)

    const search = page.getByRole('searchbox', { name: /Search font families/i })
    // Terms chosen to sweep the catalogue rather than to be pretty: a vowel
    // that hits most families, each generic category, and two real families.
    for (const term of ['', 'a', 'e', 'serif', 'sans', 'mono', 'Inter', 'Roboto', 'Playfair', 'zzzz']) {
      await search.fill(term)
      await page.waitForTimeout(300)
      const state = await galleryState(page)
      expect(state.locked, `a locked placeholder appeared for search "${term}"`).toBe(0)
      expect(state.upgradeControls, `an upgrade control appeared for search "${term}"`).toBe(0)
      // Every family the view shows must carry its real NAME. A gate that
      // withheld one would have to anonymise it, the way a locked prompt card
      // has to drop its title.
      for (const name of state.names) {
        expect(name.length, `a row rendered with no family name for search "${term}"`).toBeGreaterThan(0)
        expect(name, `a row was anonymised for search "${term}"`).not.toMatch(/^(locked|pro|upgrade)$/i)
      }
    }
  })

  test('no category or sort produces a locked card, and both rebuild the view', async ({ page }) => {
    watch(page, 'a designer filtering and sorting the font gallery signed out')
    await go(page, GALLERY)

    const seenFirst = new Set()
    let drove = 0

    for (const cat of ['Sans Serif', 'Serif', 'Display', 'Script', 'All']) {
      if (!(await chooseFilter(page, 'Category', cat))) continue
      drove += 1
      await page.waitForTimeout(300)
      const state = await galleryState(page)
      expect(state.locked, `a locked placeholder appeared in category "${cat}"`).toBe(0)
      if (state.first) seenFirst.add(`${cat}:${state.first}`)
    }

    for (const sort of ['Popular', 'A–Z', 'Most weights']) {
      if (!(await chooseFilter(page, 'Sort', sort))) continue
      drove += 1
      await page.waitForTimeout(300)
      const state = await galleryState(page)
      expect(state.locked, `a locked placeholder appeared under sort "${sort}"`).toBe(0)
      if (state.first) seenFirst.add(`${sort}:${state.first}`)
    }

    // The control that stops "no locked cards" from being vacuous: at least
    // some of those controls must have existed and been driven.
    expect(drove, 'no category or sort control could be driven at all').toBeGreaterThan(2)
    expect(seenFirst.size, 'every filter produced the identical view').toBeGreaterThan(1)
  })

  test('pairing and scale-building work signed out, exports included', async ({ page }) => {
    // The founder is selling the tools. A crippled free surface undermines the
    // thing that does the selling, so this asserts the tools still WORK, not
    // merely that they load.
    watch(page, 'a developer taking tokens out of the type tools signed out')

    await go(page, PAIR)
    const pairExport = await page.locator('#fpr-export').innerText()
    expect(pairExport.length, 'Font Pair produced no CSS signed out').toBeGreaterThan(80)
    expect(pairExport, 'the pairing export lost its font-family tokens').toContain('--font-heading')
    await expect(page.getByRole('button', { name: /Copy CSS/i })).toBeEnabled()
    await expect(page.getByRole('button', { name: /Copy font import/i })).toBeEnabled()
    expect(await page.locator(LOCKED).count(), 'Font Pair rendered a locked placeholder').toBe(0)

    await go(page, SCALE)
    // The export lives in the developer half of the audience tabs.
    const dev = page.locator('#tsc-tab-developer')
    if (await dev.count()) await dev.click()
    const scaleExport = await page.locator('#tsc-export').innerText()
    expect(scaleExport.length, 'Type Scale produced no tokens signed out').toBeGreaterThan(120)
    await expect(page.getByRole('button', { name: /^Copy (CSS|config|SCSS)$/i })).toBeEnabled()
    expect(await page.locator(LOCKED).count(), 'Type Scale rendered a locked placeholder').toBe(0)
  })
})

test.describe('Typography: keeping a type system is the gate', () => {
  for (const [name, route, label] of [
    ['Font Pair', PAIR, 'this pairing'],
    ['Type Scale', SCALE, 'this type scale'],
  ]) {
    test(`${name} offers a save, and signed out it asks for an account`, async ({ page }) => {
      // Saving is FREE and only needs somewhere to save to, exactly as in
      // PaletteBuilder and IconLibrary. A signed-out visitor must meet the
      // login prompt, never a paywall — the paywall belongs at the cap.
      watch(page, `a visitor trying to keep ${label} signed out`)
      await go(page, route)

      const trigger = page.getByRole('button', { name: 'Save to a project' })
      await expect(trigger, `${name} has no way to keep a type system`).toBeVisible()

      // Nothing saveable exists before the click.
      expect(await page.locator('.svt-input').count()).toBe(0)
      expect(await page.locator('.svt-save').count()).toBe(0)

      await trigger.click()
      await expect(page.getByRole('dialog')).toBeVisible()
      // The prompt is about signing in, not about upgrading.
      const dialog = await page.getByRole('dialog').first().innerText()
      expect(dialog.toLowerCase(), 'the signed-out save raised an upgrade pitch').not.toContain('upgrade')

      // And the save form is still not on the page: the gate is not something
      // the click opened underneath the prompt.
      expect(await page.locator('.svt-input').count(),
        'a save field rendered for a signed-out visitor').toBe(0)
      expect(await page.locator('.svt-save').count(),
        'a save button rendered for a signed-out visitor').toBe(0)
    })
  }
})

test.describe('Typography: the save gate at every quota state', () => {
  // The suite has no signed-in path, so the states a free account actually
  // meets are unreachable from the real routes. The fixture mounts the real
  // view component with real quotas through the real stylesheet.
  const LIMIT = FREE_SAVE_LIMITS.projects

  test('under the cap the save works; at the cap there is nothing to reveal', async ({ page }) => {
    watch(page, 'a free user meeting the project cap')
    await go(page, FIXTURE)

    const read = (id) => page.evaluate((caseId) => {
      const s = document.querySelector(`#case-${caseId}`)
      if (!s) return null
      return {
        inputs: s.querySelectorAll('input').length,
        saves: s.querySelectorAll('.svt-save').length,
        wall: !!s.querySelector('[data-testid="type-save-wall"]'),
        allowance: s.querySelector('[data-testid="type-save-allowance"]')?.innerText.trim() || null,
        overwrites: s.querySelectorAll('.svt-item').length,
        upgrade: !!s.querySelector('.svt-wall-btn'),
      }
    }, id)

    const clear = await read('clear')
    expect(clear, 'the fixture did not render').not.toBeNull()
    expect(clear.inputs).toBe(1)
    expect(clear.saves).toBe(1)
    expect(clear.wall).toBe(false)
    // P-003: a foot in the door is not a meter. No countdown on project one.
    expect(clear.allowance, 'the allowance nags from the first project').toBeNull()

    const approaching = await read('approaching')
    expect(approaching.inputs).toBe(1)
    expect(approaching.saves).toBe(1)
    expect(approaching.wall).toBe(false)
    expect(approaching.allowance, 'the last slot is not announced').toMatch(/1 more project/)

    const full = await read('full')
    expect(full.wall, 'the cap does not announce itself').toBe(true)
    expect(full.inputs, 'a name field survives at the cap').toBe(0)
    expect(full.saves, 'a save button survives at the cap').toBe(0)
    expect(full.upgrade, 'the wall offers no way to upgrade').toBe(true)
    // Savee's rule: the paid step is blocked, the work is not.
    expect(full.overwrites, 'the overwrite list was taken away at the cap').toBe(LIMIT)
  })

  test('no save control anywhere is merely hidden', async ({ page }) => {
    // The brand-palette leak was CSS over real values, and the lesson is that a
    // control removed by a stylesheet is a control one toggle from returning.
    // Across all three panels there must be exactly as many save controls as
    // the two under-cap states need, and none of them hidden.
    watch(page, 'checking the cap is absence rather than concealment')
    await go(page, FIXTURE)

    const sweep = await page.evaluate(() => {
      const all = [...document.querySelectorAll('.svt-save, .svt-input')]
      return {
        total: all.length,
        hidden: all.filter((el) => {
          const cs = getComputedStyle(el)
          return cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0'
        }).length,
        walls: document.querySelectorAll('[data-testid="type-save-wall"]').length,
      }
    })

    expect(sweep.walls, 'the at-cap panel is missing').toBe(1)
    // Two panels are under the cap and each contributes one input and one save
    // button. The third contributes none — which is the whole claim.
    expect(sweep.total, 'the at-cap panel contributed a save control').toBe(4)
    expect(sweep.hidden, 'a save control is present but hidden by CSS').toBe(0)
  })
})
