// SMALL MOTIONS THAT CONFIRM A CHANGE: THEY ARE DECLARED, THEY RUN ON
// TRANSFORM, AND REDUCED MOTION TURNS THEM OFF.
//
// 1. A success toast's icon tile scales in (animation `toast-pop`) while the
//    check-mark draws.
// 2. Underline tab rows (the homepage bench's Mode, Output format, Category and
//    Copy-as rows, and the other rows that share `SlideTabs`) draw one bar that
//    slides to the selected tab. The bar is the row's ::after, moved with a
//    transform; the tab itself stops drawing its own underline.
//
// Each case reads the stylesheet's computed result, then makes the thing happen
// (a real copy press, a real tab press) and watches the browser run it. A case
// that read computed style alone would pass on a rule that never fires.
//
// Mutation: delete the `.toast-success.show .toast-ico` animation rule in
// global.css, or the `.slide-ul[data-slide="ready"]::after` transition; the
// matching cases go red.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

async function open(browser, { reducedMotion = 'no-preference' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  const page = await ctx.newPage()
  watch(page, 'a visitor using the tools')
  return { ctx, page }
}

// ── 1. The toast tick pop ───────────────────────────────────────────────────

// A real success toast: copying the width on the aspect ratio page.
async function successTile(page) {
  await go(page, '/create/aspect-ratio')
  await page.locator('.rc-dim').first().click()
  const tile = page.locator('.toast.toast-success.show .toast-ico')
  await expect(tile, 'copying a size did not raise a success toast').toBeVisible()
  return tile
}

test('the success toast tile pops in on transform', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  const tile = await successTile(page)
  const run = await tile.evaluate((el) => {
    const cs = getComputedStyle(el)
    const anim = el.getAnimations().find((a) => a.animationName === 'toast-pop')
    const props = anim
      ? [...new Set(anim.effect.getKeyframes().flatMap((k) => Object.keys(k)))]
        .filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k))
      : []
    return { name: cs.animationName, duration: parseFloat(cs.animationDuration), running: Boolean(anim), props }
  })
  expect(run.name, 'the tile declares no animation').toBe('toast-pop')
  expect(run.duration, 'the pop has no duration').toBeGreaterThan(0)
  expect(run.running, 'the browser is not running the pop').toBe(true)
  expect(run.props, 'the pop animates more than transform').toEqual(['transform'])
  await ctx.close()
})

test('the success toast tile does not move under reduced motion', async ({ browser }) => {
  const { ctx, page } = await open(browser, { reducedMotion: 'reduce' })
  const tile = await successTile(page)
  const run = await tile.evaluate((el) => ({
    name: getComputedStyle(el).animationName,
    running: el.getAnimations().length,
  }))
  expect(run.name, 'the tile still declares an animation').toBe('none')
  expect(run.running, 'the tile still runs an animation').toBe(0)
  // POSITIVE CONTROL: the same tile does declare the pop once motion is allowed,
  // so the "none" above is reduced motion at work and not a missing rule.
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  expect(await tile.evaluate((el) => getComputedStyle(el).animationName), 'the pop is not declared at all').toBe('toast-pop')
  await ctx.close()
})

// ── 2. The sliding tab underline ────────────────────────────────────────────

// The homepage bench at 1440 shows every window. Returns the tab rows that are
// drawn (a hidden pane has nothing to measure) once each has placed its bar.
async function drawnRows(page) {
  await go(page, '/')
  await page.locator('.sp-modes').scrollIntoViewIfNeeded()
  await expect.poll(
    () => page.locator('.sp-modes').getAttribute('data-slide'),
    { message: 'the Mode row never placed its underline' },
  ).toBe('ready')
  return page.locator('.sp-utabs:visible')
}

const barOf = (row) => row.evaluate((el) => {
  const cs = getComputedStyle(el, '::after')
  return {
    content: cs.content,
    props: cs.transitionProperty,
    duration: parseFloat(cs.transitionDuration),
    transform: cs.transform,
  }
})

test('every drawn underline tab row slides its bar on transform', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  const rows = await drawnRows(page)
  // POSITIVE CONTROL: the bench has several rows, not just one.
  expect(await rows.count(), 'the bench shows too few underline tab rows').toBeGreaterThanOrEqual(3)
  for (const row of await rows.all()) {
    await expect(row).toHaveAttribute('data-slide', 'ready')
    const bar = await barOf(row)
    const name = await row.getAttribute('aria-label')
    expect(bar.content, `the "${name}" row draws no bar`).not.toBe('none')
    expect(bar.content, `the "${name}" row draws no bar`).not.toBe('normal')
    expect(bar.props, `the "${name}" bar does not transition transform`).toBe('transform')
    expect(bar.duration, `the "${name}" bar has no duration`).toBeGreaterThan(0)
    expect(bar.transform, `the "${name}" bar is not placed`).not.toBe('none')
  }
  await ctx.close()
})

test('pressing another tab runs the bar\'s transform transition', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  await drawnRows(page)
  const row = page.locator('.sp-modes')
  await row.evaluate((el) => {
    window.__ran = []
    // Only the row's own (pseudo-element) transitions; the tabs' colour fades bubble up here too.
    el.addEventListener('transitionrun', (e) => { if (e.target === el) window.__ran.push([e.propertyName, e.pseudoElement]) })
  })
  const before = (await barOf(row)).transform
  await row.getByRole('tab', { selected: false }).first().click()
  await expect.poll(() => page.evaluate(() => window.__ran), { message: 'the bar did not transition' })
    .toContainEqual(['transform', '::after'])
  await expect.poll(async () => (await barOf(row)).transform, { message: 'the bar did not move' }).not.toBe(before)
  // Only the bar moved: nothing the transition ran on was a layout property.
  const ran = await page.evaluate(() => window.__ran.map(([p]) => p))
  expect(ran.filter((p) => p !== 'transform'), 'the bar moved a property other than transform').toEqual([])
  await ctx.close()
})

test('the underline bar does not move under reduced motion', async ({ browser }) => {
  const { ctx, page } = await open(browser, { reducedMotion: 'reduce' })
  const rows = await drawnRows(page)
  for (const row of await rows.all()) {
    const bar = await barOf(row)
    const name = await row.getAttribute('aria-label')
    expect(bar.props === 'none' || bar.duration === 0, `the "${name}" bar still transitions (${bar.props} ${bar.duration}s)`).toBe(true)
  }
  const row = page.locator('.sp-modes')
  await row.evaluate((el) => {
    window.__ran = []
    el.addEventListener('transitionrun', (e) => { if (e.target === el) window.__ran.push(e.propertyName) })
  })
  const before = (await barOf(row)).transform
  await row.getByRole('tab', { selected: false }).first().click()
  // The bar still lands on the chosen tab, with no transition on the way.
  await expect.poll(async () => (await barOf(row)).transform, { message: 'the bar did not move' }).not.toBe(before)
  expect(await page.evaluate(() => window.__ran), 'a transition ran under reduced motion').toEqual([])
  // POSITIVE CONTROL: with motion allowed the same bar transitions transform, so
  // the result above is reduced motion at work and not a missing rule.
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const allowed = await barOf(row)
  expect(allowed.props, 'the bar declares no transform transition at all').toBe('transform')
  expect(allowed.duration, 'the bar declares no duration').toBeGreaterThan(0)
  await ctx.close()
})
