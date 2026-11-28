// THE PREMIUM TEMPLATES, FIRST IN THE GALLERY.
//
// The ten premium templates (21 up) lead every template list in the Export popup, in id order, for every account. The gallery is the
// grid behind "Change template" in the template line. There is no "Premium templates" row under the preview any more (Board A has
// one template line and one link). Names and counts are written out here, not read from src/.
//
// MUTATIONS (each break must fail the group named after it):
//   - premiumThemesFor drops the id sort or keeps 25 and 27     -> "the gallery lists the premium ten first"
//   - ExportTemplates sorts free-first for a free account       -> "the gallery lists the premium ten first" (free account, and while the plan loads)
//   - the premium row comes back under the preview              -> "the preview carries no Premium templates row"
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { GALLERY, chooseFormat, exportPanel, primaryButton, openTemplates, readTemplates } from './export-rows.js'

const ROUTE = '/projects/harbour/export'
const PREMIUM = ['Keynote', 'Stub', 'Front Page', 'Standards Plate', 'Notebook', 'Print Shop', 'Drawing Sheet', 'Fluted', 'Contact', 'Dieline']
const FILES = [
  { id: 'guidelines', cat: 'Guidelines', total: 22, wayOut: 'Use the free Guidelines (Label)' },
  { id: 'kit', cat: 'UI kit', total: 20, wayOut: 'Use the free UI kit (Standards)' },
]

function savedProject() {
  const design = structuredClone(DEFAULT_DESIGN)
  design.palette.colors = ['#1F4B8E', '#2E7BB8', '#3FA9A0']
  design.fonts.heading.family = 'Manrope'
  design.fonts.body.family = 'Manrope'
  const now = new Date().toISOString()
  return { id: 'harbour', name: 'Harbour', design, createdAt: now, updatedAt: now }
}

async function open(page, { plan = 'free', file = 'guidelines', size, hold = false } = {}) {
  if (size) await page.setViewportSize(size)
  const uid = `test-uid-prem-${plan}`
  await signIn(page, { plan, uid, projects: [savedProject()], ...(hold ? { slowReads: [{ path: `users/${uid}`, hold: true }] } : {}) })
  await go(page, ROUTE)
  const panel = exportPanel(page)
  await expect(panel).toBeVisible()
  await panel.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
  await chooseFormat(panel, file)
  await page.mouse.move(0, 0)
  return panel
}

const names = (loc) => loc.locator('.xd-tpl-n').allTextContents()

test.describe('the gallery lists the premium ten first', () => {
  for (const f of FILES) for (const plan of ['free', 'pro']) {
    test(`${f.cat}, ${plan} account: ten premium in id order, then the free ones, then the classics`, async ({ page }) => {
      watch(page, `a ${plan} account reading the ${f.cat} templates`)
      const panel = await open(page, { plan, file: f.id })
      const read = await readTemplates(panel)
      expect(read.names.slice(0, 10), 'premium, in id order').toEqual(PREMIUM)
      expect(read.names, 'every template once').toHaveLength(f.total)
      expect(new Set(read.names).size, 'no template twice').toBe(f.total)
      if (f.id === 'guidelines') expect(read.names.slice(10, 12), 'Label and Swiss Field follow, they are free').toEqual(['Label', 'Swiss Field'])
      else expect(read.names[10], 'Standards follows, the kit is free in it').toBe('Standards')
      expect(read.names.indexOf('Presentation'), 'the classics come after').toBeGreaterThan(10)
    })
  }

  test('the order does not change when the plan answers', async ({ page }) => {
    watch(page, 'a free account opening the gallery while the plan is still being read')
    const panel = await open(page, { plan: 'free', file: 'guidelines', hold: true })
    const before = await names(await openTemplates(panel))
    expect(before.slice(0, 10)).toEqual(PREMIUM)
    await page.evaluate(() => window.__UIL4B_TEST_HOLD__.release())
    await expect(primaryButton(panel)).toBeEnabled()
    expect(await names(panel.locator(GALLERY)), 'the same list once the plan is known').toEqual(before)
  })
})

test.describe('the preview carries no Premium templates row', () => {
  for (const f of FILES) {
    test(`${f.cat}: one template line with a Change template link, and no row of cards under the preview`, async ({ page }) => {
      watch(page, `a free account reading the ${f.cat} preview`)
      const panel = await open(page, { plan: 'free', file: f.id })
      await expect(panel.locator('.xd-tline')).toBeVisible()
      await expect(panel.getByRole('button', { name: 'Change template' })).toHaveCount(1)
      await expect(panel.locator('.xd-prem')).toHaveCount(0)
      await expect(panel.getByRole('heading', { name: 'Premium templates' })).toHaveCount(0)
    })
  }
})
