// THE TYPE AND RATIO TOOLS ARE ON THE SHARED TOOL LAYOUT, AND A PHONE OPENS ON
// THE OUTPUT.
//
// For each tool, at 390, 768 and 1440 in both themes:
//   1. the tool's name is the h1, inside the sticky tool toolbar;
//   2. the toolbar is one row and stays inside the viewport;
//   3. the tool's OUTPUT is on the first screen (its top edge is above the
//      fold), which is the point of putting the output first on a phone;
//   4. the page does not scroll sideways.
// Every toolbar action being reachable is 100-tool-toolbar-one-row's job; the
// tools are listed there too.
//
// POSITIVE CONTROLS: the theme under test is asserted on <html>, and the
// output locator must resolve to a visible element, so an empty page cannot
// pass the fold check vacuously.
//
// MUTATION: move the output after the panel in the JSX (or give the panel
// `order: -1` below 900px) and the 390 cases fail on the fold check; drop
// ToolLayout for a plain <div> and every case fails on the toolbar.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const TOOLS = [
  {
    route: '/create/aspect-ratio',
    title: 'Aspect & Resolution',
    output: '.arc-page .rc-vis-box',
  },
  {
    route: '/create/font-pair',
    title: 'Font Pair',
    output: '.fpr-page .fpr-specimen',
  },
  {
    route: '/create/type-scale',
    title: 'Type Scale',
    output: '.tsc-page .tsc-row',
  },
  {
    route: '/create/font-gallery',
    title: 'Font Gallery',
    output: '.fg-page .fg-card',
  },
]

const WIDTHS = [390, 768, 1440]
const THEMES = ['dark', 'light']

async function open(browser, { width, theme }) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 900 },
    colorScheme: theme,
  })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  return { ctx, page: await ctx.newPage() }
}

for (const tool of TOOLS) {
  test.describe(`${tool.route} · on the tool layout, output first`, () => {
    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        test(`${width}px ${theme}`, async ({ browser }) => {
          const { ctx, page } = await open(browser, { width, theme })
          try {
            watch(page, `someone opening ${tool.title} at ${width}px in ${theme}`)
            await go(page, tool.route)
            await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

            const bar = page.locator('[data-tool-toolbar]')
            await expect(bar).toBeVisible()
            await expect(bar.getByRole('heading', { level: 1, name: tool.title })).toBeAttached()
            await expect(bar).not.toHaveClass(/is-measuring/)

            const row = await bar.evaluate((el) => {
              const kids = [...el.children].filter((k) => {
                const r = k.getBoundingClientRect()
                return r.width > 0 && r.height > 0 && getComputedStyle(k).position !== 'absolute'
              })
              const mids = kids.map((k) => { const r = k.getBoundingClientRect(); return r.top + r.height / 2 })
              return {
                spread: Math.max(...mids) - Math.min(...mids),
                right: Math.max(...kids.map((k) => k.getBoundingClientRect().right)),
                height: el.getBoundingClientRect().height,
                vw: window.innerWidth,
              }
            })
            expect(row.spread, 'the toolbar wrapped onto a second line').toBeLessThanOrEqual(2)
            expect(row.height, 'the toolbar is taller than one row').toBeLessThan(72)
            expect(row.right, 'the toolbar runs past the screen').toBeLessThanOrEqual(row.vw)

            const out = page.locator(tool.output).first()
            await expect(out, 'the output did not render').toBeVisible()
            const top = await out.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
            const fold = await page.evaluate(() => window.innerHeight)
            expect(top, `the output starts at y=${Math.round(top)}, below the ${fold}px fold`).toBeLessThan(fold - 60)

            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
            expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(1)
          } finally {
            await ctx.close()
          }
        })
      }
    }
  })
}

// iOS zooms the page when a focused field is under 16px. On a touch phone every
// number field must be at least 16px, and 44px tall.
test('/create/aspect-ratio · the number fields do not zoom a touch phone', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  try {
    watch(page, 'someone typing a size on a phone')
    await go(page, '/create/aspect-ratio')
    // The default mode shows the ratio pair, the known side and the two density
    // fields; "Width × height" swaps in the two size fields. Read both modes.
    const read = () => page.locator('.arc-page input[type="number"]').evaluateAll((els) => els
      .filter((el) => el.getBoundingClientRect().width > 0)
      .map((el) => ({ label: el.getAttribute('aria-label'), fs: parseFloat(getComputedStyle(el).fontSize), h: el.getBoundingClientRect().height })))
    const first = await read()
    await page.getByRole('button', { name: 'Width × height', exact: true }).click()
    const second = await read()
    const fields = [...first, ...second]
    const labels = new Set(fields.map((f) => f.label))
    expect(labels.size, `only ${labels.size} distinct number fields were found`).toBeGreaterThanOrEqual(6)
    for (const f of fields) {
      expect(f.fs, `${f.label} is ${f.fs}px on a touch phone`).toBeGreaterThanOrEqual(16)
      expect(f.h, `${f.label} is ${f.h}px tall on a touch phone`).toBeGreaterThanOrEqual(44)
    }
  } finally {
    await ctx.close()
  }
})

test('/create/aspect-ratio · Swap run from the phone sheet swaps the ratio', async ({ page }) => {
  watch(page, 'someone flipping a size to portrait on a phone')
  // At 390 every action fits on the row; the narrowest phone sends Swap to the sheet.
  await page.setViewportSize({ width: 320, height: 640 })
  await go(page, '/create/aspect-ratio')
  const w = page.getByRole('spinbutton', { name: 'Ratio width' })
  const h = page.getByRole('spinbutton', { name: 'Ratio height' })
  await expect(w).toHaveValue('1920')
  await expect(h).toHaveValue('1080')
  await page.getByRole('button', { name: 'More', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'More' })
  await sheet.getByRole('button', { name: 'Swap width and height' }).click()
  await expect(sheet).toBeHidden()
  await expect(w).toHaveValue('1080')
  await expect(h).toHaveValue('1920')
  await expect(page.locator('.arc-page .rc-vis-tag')).toHaveText('Portrait')
})

test('/create/font-gallery · a category chosen in the phone sheet filters the list', async ({ page }) => {
  watch(page, 'someone narrowing the gallery to serifs on a phone')
  await page.setViewportSize({ width: 390, height: 844 })
  await go(page, '/create/font-gallery')
  await expect(page.locator('.fg-card').first()).toBeVisible()
  const count = page.locator('.fg-count')
  await expect(count).not.toContainText(' in ')
  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  const serif = sheet.getByRole('button', { name: 'Serif', exact: true })
  await serif.click()
  await expect(serif).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(count).toContainText('in Serif')
  await expect(page.locator('.fg-card').first()).toBeVisible()
})
