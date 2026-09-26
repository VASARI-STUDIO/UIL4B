// THE TOOL TOOLBAR NEVER WRAPS, AND NOTHING ON IT IS LOST.
//
// Toolbars never wrap, on any width, desktop included. When the actions do not fit, ToolToolbar (src/components/tool/ToolLayout.jsx)
// moves them into its overflow — a popover from 768px, a bottom sheet below.
//
// For every tool on the shared layout, from 320 to 1920:
//   1. the toolbar is ONE row — every direct child sits on the same line;
//   2. nothing on it runs past the viewport;
//   3. every action is reachable: either on the row, or listed by name in the
//      overflow once it is opened.
//
// MUTATION: set `flex-wrap: wrap` on `.tl .tl-toolbar` in tool-layout.css and
// remove the `hidden` filter in ToolToolbar — the narrow widths report two
// rows. Or delete the overflow button — the narrow widths report actions that
// cannot be reached.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

// An action's accessible name starts with its label; a disabled one may add a
// reason after it ("From palette — add 2+ colours …").
const startsWith = (s) => new RegExp('^' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

const WIDTHS = [320, 360, 390, 480, 640, 768, 900, 1024, 1280, 1440, 1920]

// Each tool: its route, and the names of every toolbar action it must offer.
// An action is its name, or { row, menu } when the row's button and the
// overflow's row are named differently. `selects` are comboboxes that move
// the same way, and `sliders` likewise; `links` are actions drawn as a link on the row (a button once
// they are in the overflow); `menuOnly` actions live in the overflow at every
// width; and `overflow` is what the tool calls its overflow (default "More").
const TOOLS = [
  {
    route: '/create/palette',
    title: 'Palette Generator',
    primary: /^Save current/,
    overflow: 'Tools',
    actions: [
      { row: 'Pull colours from an image', menu: 'From image' },
      { row: 'Suggest a palette', menu: 'Suggest' },
      { row: 'Pick a colour from the screen', menu: 'Pick from the screen' },
      'Undo',
      'Redo',
      'Randomise',
    ],
    selects: ['Colour system', 'Colour vision check'],
    menuOnly: ['Explore palettes', 'Preview on a UI', 'Open in Gradient', 'History', 'Reset palette'],
  },
  { route: '/create/gradient', actions: ['Random', 'From palette', 'Reset', 'Submit for review'], primary: /^Copy /, title: 'Gradient' },
  { route: '/create/contrast', actions: [], primary: /^Swap/, title: 'Contrast Checker' },
  { route: '/create/tint', actions: ['Import from palette'], primary: /^Copy /, title: 'Tint' },
  // Signed out, so "Add to project" (canSaveProjects) is not offered here.
  { route: '/create/semantic-color', actions: [], primary: /^Copy /, title: 'Semantic Colour' },
  // Studio tools. The converter's and the Brand Starter's run actions live
  // with their inputs (the action bar, the brief), so their toolbars have no
  // primary; /seo's three tools are tabs under the toolbar, so its row is the
  // back button and the name.
  { route: '/create/file-converter', title: 'File Converter', actions: ['Open a 3D model in the 3D viewer'] },
  { route: '/create/alt-text', title: 'Alt Text Generator', actions: ['Add images'], primary: /^Generate/ },
  { route: '/create/auto-builder', title: 'Brand Starter', actions: [] },
  { route: '/create/3d-viewer', title: '3D Viewer', actions: ['Open a file'] },
  { route: '/seo', title: 'Meta & SERP Inspector', actions: [], minChildren: 2 },
  {
    route: '/create/font-pair',
    actions: [{ row: 'Shuffle', menu: 'Shuffle the heading' }, 'Build a scale from this pair', 'Copy font import'],
    links: ['Browse the Font Gallery'],
    primary: /^Copy CSS/,
    title: 'Font Pair',
  },
  {
    route: '/create/type-scale',
    actions: ['Reset scale', 'Find a pairing for these families', 'Copy font import'],
    primary: /^Copy CSS/,
    title: 'Type Scale',
  },
  {
    route: '/create/font-gallery',
    actions: ['All', 'Serif', 'Display'],
    selects: ['Sort families'],
    sliders: ['Specimen size'],
    links: ['Build a font pair'],
    overflow: 'Filters',
    title: 'Font Gallery',
  },
  { route: '/create/aspect-ratio', actions: ['Swap width and height'], primary: /^Copy size/, title: 'Aspect & Resolution' },
]

async function readRow(page) {
  return page.locator('[data-tool-toolbar]').evaluate((bar) => {
    const kids = [...bar.children].filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && getComputedStyle(el).position !== 'absolute'
    })
    const tops = kids.map((el) => Math.round(el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2))
    const right = Math.max(...kids.map((el) => el.getBoundingClientRect().right))
    return {
      children: kids.length,
      centres: [...new Set(tops)],
      spread: Math.max(...tops) - Math.min(...tops),
      right: Math.round(right),
      vw: window.innerWidth,
      height: Math.round(bar.getBoundingClientRect().height),
    }
  })
}

for (const tool of TOOLS) {
  test.describe(`${tool.route} · the toolbar is one row at every width`, () => {
    for (const width of WIDTHS) {
      test(`${width}px`, async ({ page }) => {
        watch(page, `someone using ${tool.title} at ${width}px`)
        await page.setViewportSize({ width, height: 900 })
        await go(page, tool.route)
        await expect(page.getByRole('heading', { level: 1, name: tool.title })).toBeAttached()
        const bar = page.locator('[data-tool-toolbar]')
        await expect(bar).toBeVisible()

        const row = await readRow(page)
        // POSITIVE CONTROL: the row really has its parts on it.
        expect(row.children, 'the toolbar rendered its controls').toBeGreaterThanOrEqual(tool.minChildren || 3)
        expect(row.spread, `${width}px: toolbar children sit on ${row.centres.length} lines`).toBeLessThanOrEqual(2)
        expect(row.right, `${width}px: the toolbar runs ${row.right - row.vw}px past the screen`).toBeLessThanOrEqual(row.vw)
        expect(row.height, `${width}px: the toolbar is ${row.height}px tall — a second row`).toBeLessThan(72)

        // From 360 the tool's name is never cut short: actions leave first.
        if (width >= 360) {
          const name = await bar.locator('.tl-title:not(.sr-only)').evaluateAll((els) => els.map((el) => ({ text: el.textContent.trim(), cut: el.scrollWidth - el.clientWidth })))
          for (const t of name) expect(t.cut, `${width}px: "${t.text}" is truncated`).toBeLessThanOrEqual(0)
        }

        // The primary, where the tool has one, is always on the row.
        if (tool.primary) await expect(bar.getByRole('button', { name: tool.primary })).toBeVisible()

        // Every action: on the row, or in the overflow.
        await expect(bar, `${width}px: the toolbar is still measuring`).not.toHaveClass(/is-measuring/)
        const overflowName = tool.overflow || 'More'
        const rowName = (a) => (typeof a === 'string' ? a : a.row)
        const menuName = (a) => (typeof a === 'string' ? a : a.menu)
        const missing = []
        for (const action of tool.actions) {
          // A row action that navigates is a link; its overflow row is a button.
          const named = { name: startsWith(rowName(action)) }
          const shown = await bar.getByRole('button', named).or(bar.getByRole('link', named)).first().isVisible().catch(() => false)
          if (!shown) missing.push(menuName(action))
        }
        for (const name of tool.links || []) {
          const shown = await bar.getByRole('link', { name: startsWith(name) }).first().isVisible().catch(() => false)
          if (!shown) missing.push(name)
        }
        const missingSelects = []
        for (const name of tool.selects || []) {
          const shown = await bar.getByRole('combobox', { name }).first().isVisible().catch(() => false)
          if (!shown) missingSelects.push(name)
        }
        const missingSliders = []
        for (const name of tool.sliders || []) {
          const shown = await bar.getByRole('slider', { name }).first().isVisible().catch(() => false)
          if (!shown) missingSliders.push(name)
        }
        const inOverflow = [...missing, ...(tool.menuOnly || [])]
        // An overflow with nothing in it is a defect too: it means the row is
        // stuck in its measuring pass (seen once on /create/tint).
        if (!inOverflow.length && !missingSelects.length && !missingSliders.length) {
          await expect(bar.getByRole('button', { name: overflowName, exact: true }), `${width}px: a ${overflowName} button with nothing in it`).toHaveCount(0)
        }
        if (inOverflow.length || missingSelects.length || missingSliders.length) {
          const more = bar.getByRole('button', { name: overflowName, exact: true })
          await expect(more, `${width}px: ${[...inOverflow, ...missingSelects, ...missingSliders].join(', ')} are off the row and there is no ${overflowName}`).toBeVisible()
          await more.click()
          const panel = page.getByRole('dialog', { name: overflowName })
          await expect(panel).toBeVisible()
          for (const name of inOverflow) {
            await expect(panel.getByRole('button', { name: startsWith(name) }).first(), `${width}px: "${name}" is not in the overflow`).toBeVisible()
          }
          for (const name of missingSelects) {
            await expect(panel.getByRole('combobox', { name }), `${width}px: the "${name}" select is not in the overflow`).toBeVisible()
          }
          for (const name of missingSliders) {
            await expect(panel.getByRole('slider', { name }), `${width}px: the "${name}" slider is not in the overflow`).toBeVisible()
          }
          // The overflow is dismissable, and gives focus back.
          await page.keyboard.press('Escape')
          await expect(panel).toBeHidden()
          await expect(more).toBeFocused()
        }
      })
    }
  })
}

test('/create/gradient · an action run from the phone overflow still does its job', async ({ page }) => {
  watch(page, 'a designer randomising a gradient from the bottom sheet')
  await page.setViewportSize({ width: 390, height: 844 })
  await go(page, '/create/gradient')
  const code = page.locator('.grd-code-text code')
  const before = await code.textContent()
  await page.getByRole('button', { name: 'More', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'More' })
  await expect(sheet).toBeVisible()
  // A bottom sheet on a phone: it meets the bottom of the screen.
  const box = await sheet.boundingBox()
  expect(Math.round(box.y + box.height)).toBeGreaterThanOrEqual(843)
  await sheet.getByRole('button', { name: 'Random', exact: true }).click()
  await expect(sheet).toBeHidden()
  await expect.poll(async () => code.textContent()).not.toBe(before)
})

test('/create/palette · Reset run from the phone Tools sheet still resets', async ({ page }) => {
  watch(page, 'a designer resetting a palette from the bottom sheet')
  await page.setViewportSize({ width: 390, height: 844 })
  await go(page, '/create/palette')
  const hexes = page.locator('.plb-col .plb-hex')
  await expect(hexes).toHaveCount(5)
  const before = (await hexes.allTextContents()).join()
  await page.getByRole('button', { name: 'Tools', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Tools' })
  await expect(sheet).toBeVisible()
  const box = await sheet.boundingBox()
  expect(Math.round(box.y + box.height)).toBeGreaterThanOrEqual(843)
  await sheet.getByRole('button', { name: 'Reset palette', exact: true }).click()
  await expect(sheet).toBeHidden()
  await expect.poll(async () => (await hexes.allTextContents()).join()).not.toBe(before)
})
