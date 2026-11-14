// /create/gradient as a signed-in Pro account, and with saved projects.
//
// What this file pins:
//   1. A Pro account at 1440 and at 390 (touch) loads the page with no console
//      error or uncaught exception, no horizontal scroll, and none of the Pro
//      marks a Free account sees (the Tints "Pro" tag, "Pro" beside Use and Base
//      colour, the locked Base colour button). Pressing a Use chip chooses it
//      and opens no upsell. A Free account at the same width does see the marks,
//      which is what gives the Pro check its meaning.
//   2. A Pro member saves a named gradient, reloads, and the project is still
//      there, in Save or share's "Overwrite existing" list. A saved project that
//      holds a palette is also offered in the Colour source menu (one saved from
//      this page holds none, so it is not).
//   3. Overwriting it updates the one project (same id, new stops, toast
//      "Updated: <name>") and never adds a second.
//   4. The Spec card's heading is "<type> gradient" until the gradient is saved,
//      then the saved project's name (it survives a reload).
//   5. The project cap: a Free account at 3 projects is refused with the way
//      forward, saves nothing and the Spec card keeps its default heading; a Pro
//      account with the same 3 saves a fourth.
//
// Every expected string and colour is written out by hand.
import { test, expect } from './base.js'
import { go, signIn, watch, overlaysSettled } from './helpers.js'

const ROUTE = '/create/gradient'
const HANDOFF = `${ROUTE}?gs=1F4B8E-0_3FA9A0-100&gt=linear&ga=135&gi=srgb`
const HANDOFF_AMBER = `${ROUTE}?gs=C1440E-0_F2C078-100&gt=linear&ga=90&gi=srgb`
const NAME = 'Harbour dusk'

const MENU_NAME = 'Save, share and export this gradient'
const saveButton = (page) => page.getByRole('button', { name: 'Save or share' })
const menuOf = (page) => page.getByRole('dialog', { name: MENU_NAME })
const toastOf = (page) => page.locator('.toast.show')
const panelOf = (page) => page.getByRole('complementary', { name: 'Gradient controls' })
const genOf = (page) => panelOf(page).locator('.grd-gen')
const specName = (page) => page.locator('.grd-spec-name')
const sourceMenu = (page) => page.getByRole('button', { name: 'Colour source' })
const storedProjects = (page) => page.evaluate(
  () => Object.values(JSON.parse(localStorage.getItem('vs-projects') || '{}')).flat(),
)

const QUIET = /\/api\/|fonts\.g|googleapis\.com|_vercel\/insights|ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_TUNNEL/

function trouble(page) {
  const seen = []
  page.on('pageerror', (err) => seen.push(`uncaught: ${err && err.message ? err.message : err}`))
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const url = (msg.location() || {}).url || ''
    if (QUIET.test(`${msg.text()} ${url}`)) return
    seen.push(`console: ${msg.text().slice(0, 200)} (${url})`)
  })
  return seen
}

async function open(page, url = HANDOFF) {
  await go(page, url)
  await expect(page.getByRole('heading', { level: 1, name: 'Gradient' })).toBeVisible()
  await expect(panelOf(page)).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
}

async function openMore(page) {
  const toggle = genOf(page).getByRole('button', { name: /^(More|Fewer) options$/ })
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
  await expect(genOf(page).locator('#grd-gen-more')).toBeVisible()
}

async function chooseSpecCard(page) {
  const group = page.getByRole('group', { name: 'Preview as' })
  const direct = group.getByRole('button', { name: 'Spec card', exact: true })
  if (await direct.count()) await direct.click()
  else {
    await group.getByRole('button', { name: /^More/ }).click()
    await page.getByRole('listbox', { name: 'More previews' }).getByRole('option', { name: 'Spec card' }).click()
  }
  await expect(specName(page)).toBeVisible()
}

async function saveAs(page, name) {
  await saveButton(page).click()
  await menuOf(page).getByLabel('Project name').fill(name)
  await menuOf(page).getByRole('button', { name: 'Save', exact: true }).click()
  await expect(toastOf(page)).toContainText('Project saved')
  await expect(menuOf(page)).toHaveCount(0)
}

async function reload(page) {
  await overlaysSettled(page, 'the Save or share menu')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Gradient' })).toBeVisible()
  await expect(panelOf(page)).toBeVisible()
}

const optionsOf = async (page) => {
  await sourceMenu(page).click()
  const list = page.locator('.menu-select-list[role="listbox"]')
  await list.waitFor({ state: 'visible' })
  const labels = await list.getByRole('option').allTextContents()
  await page.keyboard.press('Escape')
  return labels.map((t) => t.trim())
}

/* ── 1 · Pro sees no Pro marks ───────────────────────────────────────────── */

const SCREENS = [
  { w: 1440, h: 900, touch: false },
  { w: 390, h: 844, touch: true },
]

for (const screen of SCREENS) {
  test.describe(`a signed-in Pro account at ${screen.w}px${screen.touch ? ' (touch)' : ''}`, () => {
    test.use({
      viewport: { width: screen.w, height: screen.h },
      hasTouch: screen.touch,
      isMobile: screen.touch,
    })

    test('a Pro account sees no Pro mark, no upsell, no console error and no sideways scroll', async ({ page }) => {
      watch(page, `Pro designer opening the gradient tool at ${screen.w}px`)
      const errors = trouble(page)
      await signIn(page, { plan: 'pro' })
      await open(page)
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(screen.touch)

      await expect(page.getByRole('button', { name: 'Tints of stop 1', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: /Tints of stop \d+ \(Pro\)/ })).toHaveCount(0)
      await expect(page.locator('.grd-pro-tag')).toHaveCount(0)

      await openMore(page)
      await expect(genOf(page).locator('.grd-gen-pro')).toHaveCount(0)
      await expect(genOf(page).getByRole('button', { name: 'Base colour (Pro)' })).toHaveCount(0)
      await expect(genOf(page).getByRole('button', { name: 'Base colour', exact: true })).toBeVisible()
      await expect(genOf(page).getByRole('radiogroup', { name: 'Use', exact: true })).toBeVisible()

      const hero = genOf(page).getByRole('radiogroup', { name: 'Use', exact: true }).getByRole('radio', { name: 'Hero', exact: true })
      await expect(hero).not.toHaveAttribute('aria-disabled', 'true')
      await hero.click()
      await expect(hero, 'a Pro press chooses the chip').toHaveAttribute('aria-checked', 'true')
      await expect(page.getByRole('dialog'), 'a Pro press opens no upsell').toHaveCount(0)

      const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(sideways, 'the page scrolls sideways by this many px').toBe(0)
      expect(errors).toEqual([])
    })

    test('control: a Free account at the same width does see the Pro marks', async ({ page }) => {
      watch(page, `Free designer opening the gradient tool at ${screen.w}px`)
      await signIn(page, { plan: 'free' })
      await open(page)
      await expect(page.getByRole('button', { name: 'Tints of stop 1 (Pro)', exact: true })).toBeVisible()
      await openMore(page)
      await expect(genOf(page).locator('.grd-gen-pro')).toHaveCount(2)
      await expect(genOf(page).getByRole('button', { name: 'Base colour (Pro)' })).toHaveAttribute('aria-disabled', 'true')
    })
  })
}

/* ── 2 and 3 · Saved projects, across a reload ───────────────────────────── */

test.describe('saved gradient projects for a Pro member', () => {
  test('a saved project is still listed after a reload, in Save or share', async ({ page }) => {
    watch(page, 'Pro member saving a gradient then coming back')
    await signIn(page, { plan: 'pro' })
    await open(page)
    await saveAs(page, NAME)

    await reload(page)
    const saved = await storedProjects(page)
    expect(saved).toHaveLength(1)
    expect(saved[0].name).toBe(NAME)

    await saveButton(page).click()
    const rows = menuOf(page).locator('.plb-scrolllist .plb-menu-item')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toHaveText(NAME)
    await page.keyboard.press('Escape')
    await expect(menuOf(page)).toHaveCount(0)
  })

  test("a Pro member's saved project that holds a palette is offered in the Colour source menu", async ({ page }) => {
    watch(page, "Pro member reusing a saved project's colours")
    const withPalette = {
      id: 'proj-harbour', name: 'Harbour rebrand', createdAt: '2026-09-01T09:00:00.000Z', updatedAt: '2026-09-01T09:00:00.000Z',
      design: { palette: { base: '#0B1B3A', harmony: 'auto', extraColors: [], activeIdx: 0, colors: ['#0B1B3A', '#3D7BFF', '#CFEFE6'] } },
    }
    await signIn(page, { plan: 'pro', projects: [withPalette] })
    await open(page)
    expect(await optionsOf(page)).toEqual(['Current palette', 'Starter colours', 'Harbour rebrand'])
  })

  test('overwriting a saved project updates it and never adds a second', async ({ page }) => {
    watch(page, 'Pro member overwriting a saved gradient')
    await signIn(page, { plan: 'pro' })
    await open(page)
    await saveAs(page, NAME)
    const [before] = await storedProjects(page)
    expect(before.design.gradient.stops.map((s) => s.color)).toEqual(['#1F4B8E', '#3FA9A0'])

    await overlaysSettled(page, 'the Save or share menu')
    await open(page, HANDOFF_AMBER)
    await saveButton(page).click()
    await menuOf(page).locator('.plb-scrolllist .plb-menu-item', { hasText: NAME }).click()

    await expect(toastOf(page)).toContainText(`Updated: ${NAME}`)
    await expect(menuOf(page)).toHaveCount(0)
    const after = await storedProjects(page)
    expect(after, 'overwriting must not add a project').toHaveLength(1)
    expect(after[0].id).toBe(before.id)
    expect(after[0].name).toBe(NAME)
    expect(after[0].design.gradient.stops.map((s) => s.color)).toEqual(['#C1440E', '#F2C078'])
  })
})

/* ── 4 · The Spec card heading ───────────────────────────────────────────── */

test.describe('the Spec card heading', () => {
  test('the Spec card heading becomes the saved name, and stays after a reload', async ({ page }) => {
    watch(page, 'Pro member naming a gradient and viewing it as a spec card')
    await signIn(page, { plan: 'pro' })
    await open(page)
    await chooseSpecCard(page)
    await expect(specName(page), 'unsaved, the heading is the type').toHaveText('Linear gradient')

    await saveAs(page, NAME)
    await expect(specName(page)).toHaveText(NAME)

    await reload(page)
    await expect(specName(page), 'the heading is kept across a reload').toHaveText(NAME)
  })
})

/* ── 5 · The project cap ─────────────────────────────────────────────────── */

test.describe('the project cap', () => {
  test('a Free account at 3 projects is refused with the way forward and the Spec card keeps its default heading', async ({ page }) => {
    watch(page, 'Free member at the project cap')
    await signIn(page, { plan: 'free', projects: 3 })
    await open(page)
    await chooseSpecCard(page)
    await saveButton(page).click()
    await menuOf(page).getByLabel('Project name').fill('One too many')
    await menuOf(page).getByRole('button', { name: 'Save', exact: true }).click()

    const refusal = page.getByTestId('gradient-save-refusal')
    await expect(refusal).toContainText('Free plan saves up to 3 projects')
    await expect(refusal.getByRole('link', { name: 'See what Pro adds' })).toHaveAttribute('href', '/plans')
    await expect(toastOf(page)).toHaveCount(0)
    expect(await storedProjects(page)).toHaveLength(3)
    await expect(specName(page)).toHaveText('Linear gradient')
  })

  test('a Pro account with the same 3 projects saves a fourth', async ({ page }) => {
    watch(page, 'Pro member with three projects saving another')
    await signIn(page, { plan: 'pro', projects: 3 })
    await open(page)
    await saveAs(page, 'Fourth one')
    await expect(page.getByTestId('gradient-save-refusal')).toHaveCount(0)
    const saved = await storedProjects(page)
    expect(saved).toHaveLength(4)
    expect(saved.map((p) => p.name)).toContain('Fourth one')
  })
})
