// /learn/help as a router: "What are you here to do?" lists the jobs, each job
// opens its own answer. From 960px the answer sits in a sticky stage beside the
// list; below that it opens under its own row, one at a time.
//
// Every figure is computed here from the registries, not read back from the
// module the page imports, so a page that stopped deriving it goes red.
import { test, expect } from './base.js'
import { expectRendered, go, signIn, watch } from './helpers.js'
import { HELP_JOBS } from '../../src/data/helpStart.js'
import { AI_LIMITS, FREE_SAVE_LIMITS } from '../../src/config/plans.js'
import { EXPORT_FORMATS } from '../../src/config/exportFormats.js'
import { DEFAULT_DESIGN, tintConfigFor } from '../../src/data/designDefaults.js'
import { generateTintScale, T_LABELS } from '../../src/utils/colors.js'

const VISITOR_JOBS = HELP_JOBS.filter((j) => !j.adminOnly)
const FREE_FORMATS = EXPORT_FORMATS.filter((f) => f.live && !f.pro)
const SIZES = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
]

const row = (page, job) => page.locator('.hlr-job', { hasText: job.label })
const panelOf = (page, job) => page.locator('.hlr-ans', { has: page.getByRole('heading', { level: 2, name: job.heading }) })
const openPanels = (page) => page.locator('.hlr-ans:not([hidden])')

/** Press a row only if its answer is not already showing (a second press closes it on a phone). */
async function openJob(page, job) {
  const button = row(page, job)
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
}

test.describe('Help router: every job opens its answer', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a visitor deciding what to do first') })

  for (const size of SIZES) {
    test(`${size.name}: one job is open on load, and each row opens only its own answer`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height })
      await go(page, '/learn/help')
      await expectRendered(page, '/learn/help')

      // The question and the rows are on the page, in the order the data gives.
      await expect(page.getByText('What are you here to do?')).toBeVisible()
      await expect(page.locator('.hlr-job')).toHaveText(VISITOR_JOBS.map((j) => j.label))

      // First job open on load, nothing else.
      await expect(row(page, VISITOR_JOBS[0])).toHaveAttribute('aria-expanded', 'true')
      await expect(openPanels(page)).toHaveCount(1)

      for (const job of VISITOR_JOBS) {
        await openJob(page, job)
        await expect(openPanels(page), `${job.label} left another answer open`).toHaveCount(1)
        const panel = panelOf(page, job)
        await expect(panel).toBeVisible()
        await expect(panel).not.toHaveAttribute('hidden', '')
        // The row's aria-controls names the panel it opens.
        const controls = await row(page, job).getAttribute('aria-controls')
        expect(await panel.getAttribute('id')).toBe(controls)
        // The answer ends on the job's own destination.
        await expect(panel.locator(`a.hlr-btn[href="${job.to}"]`)).toHaveText(job.cta)
      }
    })
  }

  test('desktop: the answer sits in a sticky stage beside the list', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/learn/help')
    await expectRendered(page, '/learn/help')
    const stage = page.locator('.hlr-stage')
    await expect(stage).toBeVisible()
    expect(await stage.evaluate((el) => getComputedStyle(el).position)).toBe('sticky')
    const [list, st] = await Promise.all([
      page.locator('.hlr-jobs').boundingBox(),
      stage.boundingBox(),
    ])
    expect(st.x, 'the stage should be to the right of the list').toBeGreaterThan(list.x + list.width - 1)
    // Every panel is inside the stage, none under a row.
    await expect(page.locator('.hlr-jobs .hlr-ans')).toHaveCount(0)
  })

  test('phone: the answer opens under its own row and a second press closes it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/learn/help')
    await expectRendered(page, '/learn/help')
    await expect(page.locator('.hlr-stage')).toHaveCount(0)

    const job = VISITOR_JOBS[1]
    await row(page, job).click()
    const li = page.locator('.hlr-jobs > li', { has: row(page, job) })
    await expect(li.locator('.hlr-ans:not([hidden])')).toHaveCount(1)
    await expect(openPanels(page)).toHaveCount(1)

    await row(page, job).click()
    await expect(row(page, job)).toHaveAttribute('aria-expanded', 'false')
    await expect(openPanels(page)).toHaveCount(0)
  })
})

test.describe('Help router: hashes', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a visitor following an old link') })

  for (const size of [SIZES[0], SIZES[2]]) {
    test(`${size.name}: #contact opens "Report something broken" and lands on it`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height })
      await go(page, '/learn/help#contact')
      await expectRendered(page, '/learn/help')
      const report = HELP_JOBS.find((j) => j.id === 'report')
      await expect(row(page, report)).toHaveAttribute('aria-expanded', 'true')
      const contact = page.locator('#contact')
      await expect(contact).toHaveCount(1)
      await expect(contact).toBeVisible()
      await expect(contact).toContainText(report.heading)
      await expect(contact.locator('a[href="mailto:support@uil4b.com?subject=Content%20report"]')).toHaveCount(1)
      await expect(contact.locator('a.hlr-btn')).toHaveAttribute('href', '/feedback')
      // The page has scrolled to it rather than staying at the top.
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    })
  }

  test('#faq and #about are on the page once each', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/learn/help#faq')
    await expectRendered(page, '/learn/help')
    await expect(page.locator('#faq')).toHaveCount(1)
    await expect(page.locator('#faq')).toContainText('What are you here to do?')
    await expect(page.locator('#about')).toHaveCount(1)
    // A hash that is not a job leaves the default job open.
    await expect(row(page, VISITOR_JOBS[0])).toHaveAttribute('aria-expanded', 'true')
  })
})

test.describe('Help router: today\'s content is still here', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a visitor reading the help page') })

  test('account, allowances, "Leaves as" and the tool count', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/learn/help')
    await expectRendered(page, '/learn/help')
    await expect(page.locator('.hlp-hero .hlp-lede')).toHaveCount(1)
    await expect(page.locator('.hlp-hint')).toContainText('tools open now')

    // Colour: the built, ungated formats, under "Leaves as".
    const colour = HELP_JOBS.find((j) => j.id === 'colour')
    await openJob(page, colour)
    await expect(page.locator('.hlr-leaves h3')).toHaveText('Leaves as')
    const files = await page.locator('.hlr-leaves li').allInnerTexts()
    expect(files.map((s) => s.trim())).toEqual(FREE_FORMATS.map((f) => f.name))
    await expect(page.locator('.hlp-start-opens').first()).toHaveText('Opens with a generated palette')

    // Save: where work lives, and "Do I need an account?" with the free-plan limits.
    const save = HELP_JOBS.find((j) => j.id === 'save')
    await openJob(page, save)
    const savePanel = panelOf(page, save)
    await expect(savePanel).toContainText('In this browser, until you sign in.')
    await expect(savePanel.getByRole('heading', { level: 3, name: 'Do I need an account?' })).toBeVisible()
    await expect(savePanel).toContainText(`${FREE_SAVE_LIMITS.projects} projects and ${FREE_SAVE_LIMITS.customIcons} custom icons`)
    await expect(savePanel.locator('a.hlr-btn')).toHaveAttribute('href', '/privacy')

    // Money: the allowance bars and "Why are the AI allowances small?".
    const cost = HELP_JOBS.find((j) => j.id === 'cost')
    await openJob(page, cost)
    const costPanel = panelOf(page, cost)
    await expect(costPanel.getByRole('heading', { level: 3, name: 'Why are the AI allowances small?' })).toBeVisible()
    await expect(costPanel.locator('.hlr-allow output')).toHaveText([
      `${AI_LIMITS.free.daily} a day`, `${AI_LIMITS.pro.daily} a day`,
    ])
    await expect(costPanel).toContainText(`Free gets ${AI_LIMITS.free.daily} a day, Pro gets ${AI_LIMITS.pro.daily}`)
    await expect(costPanel.locator('a.hlr-btn')).toHaveAttribute('href', '/plans')
    // Bar widths are drawn to scale against Pro.
    const widths = await costPanel.locator('.hlr-bar i').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width / el.parentElement.getBoundingClientRect().width))
    expect(widths[0]).toBeCloseTo(AI_LIMITS.free.daily / AI_LIMITS.pro.daily, 1)
    expect(widths[1]).toBeCloseTo(1, 1)
  })

  test('the tint strip is eleven stops generated from the base colour', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/learn/help')
    await expectRendered(page, '/learn/help')
    const stops = page.locator('.hlr-stop')
    await expect(stops).toHaveCount(11)
    await expect(stops).toHaveCount(T_LABELS.length)
    await expect(page.locator('.hlr-stop-n')).toHaveText(T_LABELS)

    // A new base colour regenerates every stop through the same function.
    await page.locator('.hlr-seed-hex').fill('#FF3366')
    const ramp = generateTintScale({ ...tintConfigFor(DEFAULT_DESIGN), hex: '#ff3366' })
    const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})` }
    await expect.poll(() => page.locator('.hlr-stop-sw').evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor)))
      .toEqual(ramp.map(rgb))

    // Picking a stop reads its contrast.
    await stops.nth(10).click()
    await expect(page.locator('.hlr-read')).toContainText(`${T_LABELS[10]} ${ramp[10].toUpperCase()}`)
    await expect(page.locator('.hlr-read')).toContainText(/\d+\.\d\d:1/)
    // A half-typed hex is flagged and does not repaint the strip.
    await page.locator('.hlr-seed-hex').fill('#FF33')
    await expect(page.locator('.hlr-seed-hex')).toHaveAttribute('aria-invalid', 'true')
  })
})

test.describe('Help router: the admin-only job', () => {
  test('a normal visitor never sees "what isn\'t built yet"', async ({ page }) => {
    watch(page, 'a first-time visitor')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/learn/help')
    await expectRendered(page, '/learn/help')
    await expect(page.locator('.hlr-job', { hasText: 'built yet' })).toHaveCount(0)
    await expect(page.locator('.hlr')).not.toContainText(/Soon badge/i)
    await expect(page.locator('.hlp-hint')).not.toContainText('still being built')
  })

  test('an admin sees the job, with the counts', async ({ page }) => {
    watch(page, 'admin reading the help page')
    await signIn(page, { admin: true })
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/learn/help')
    await expectRendered(page, '/learn/help')
    const soon = HELP_JOBS.find((j) => j.id === 'soon')
    await expect(row(page, soon)).toHaveCount(1)
    await openJob(page, soon)
    await expect(panelOf(page, soon)).toContainText('Soon badge')
    await expect(page.locator('.hlr-count i.is-soon').first()).toBeVisible()
  })
})

test.describe('Help router: touch targets and overflow', () => {
  test.beforeEach(async ({ page }) => { watch(page, 'a visitor on a phone') })

  test('phone: rows, buttons, ratio picker and colour stops are at least 44px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await go(page, '/learn/help')
    await expectRendered(page, '/learn/help')

    const tooSmall = async (selector) => page.locator(selector).evaluateAll((els) => els
      .filter((el) => el.getBoundingClientRect().width > 0)
      .map((el) => { const r = el.getBoundingClientRect(); return { text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) } })
      .filter((r) => r.w < 44 || r.h < 44))

    expect(await tooSmall('.hlr-job'), 'a row is under 44px').toEqual([])
    // Colour is open: its two inputs and eleven stops.
    expect(await tooSmall('.hlr-seed-pick, .hlr-seed-hex, .hlr-stop'), 'a colour control is under 44px').toEqual([])
    expect(await tooSmall('.hlr-ans:not([hidden]) a.hlr-btn'), 'the answer button is under 44px').toEqual([])
    // The hex field is 16px so iOS does not zoom into it.
    expect(await page.locator('.hlr-seed-hex').evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px')

    await openJob(page, VISITOR_JOBS.find((j) => j.id === 'type'))
    expect(await tooSmall('.hlr-seg button'), 'a ratio button is under 44px').toEqual([])
    await openJob(page, VISITOR_JOBS.find((j) => j.id === 'icons'))
    expect(await page.locator('.hlr-search input').evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px')
    expect(await tooSmall('.hlr-ans:not([hidden]) a.hlr-btn')).toEqual([])
  })

  for (const size of SIZES) {
    test(`${size.name}: no job pushes the page sideways`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height })
      await go(page, '/learn/help')
      await expectRendered(page, '/learn/help')
      for (const job of VISITOR_JOBS) {
        await openJob(page, job)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `${job.label} at ${size.width}px pushes the page sideways`).toBeLessThanOrEqual(1)
        // Nothing inside the open answer sticks out of it.
        const stuckOut = await openPanels(page).evaluate((panel) => {
          const box = panel.getBoundingClientRect()
          return [...panel.querySelectorAll('*')].filter((el) => {
            const r = el.getBoundingClientRect()
            return r.width > 0 && !el.closest('.hlr-vh') && (r.right > box.right + 1 || r.left < box.left - 1)
          }).map((el) => el.className || el.tagName)
        })
        expect(stuckOut, `${job.label} at ${size.width}px has content outside its answer`).toEqual([])
      }
    })
  }
})
