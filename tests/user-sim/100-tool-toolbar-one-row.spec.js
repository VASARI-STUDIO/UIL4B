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
// reason after it ("Shuffle from palette — add 2+ colours …").
const startsWith = (s) => new RegExp('^' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

const WIDTHS = [320, 360, 390, 480, 640, 768, 900, 1024, 1280, 1440, 1920]

// Each tool: its route, and the names of every toolbar action it must offer.
// An action is its name, or { row, menu } when the row's button and the
// overflow's row are named differently. `selects` are listbox triggers that move
// the same way, and `sliders` likewise; `links` are actions drawn as a link on the row (a button once
// they are in the overflow); `menuOnly` actions live in the overflow at every
// width; and `overflow` is what the tool calls its overflow (default "More"; a function
// of the width when the name changes with it). A tool with a `sheet` swaps the overflow
// for a sheet below `sheet.below`: the controls that are off the row are looked for in
// the sheet, opened from its `open` button.
const TOOLS = [
  {
    route: '/create/palette',
    title: 'Palette Generator',
    primary: /^Save or share/,
    overflow: 'Extra tools',
    actions: [
      { row: 'Pull colours from an image', menu: 'From image' },
      { row: 'Suggest variations', menu: 'Suggest' },
      // Lower-priority buttons (icon-only below 768px): on the row where there is room, else in Extra tools.
      'Explore palettes and brands',
      'Preview',
      'Undo',
      'Redo',
      'Randomise',
    ],
    selects: ['Colour system', 'Colour vision check'],
    menuOnly: ['Open in Gradient', 'History', 'Reset palette'],
  },
  { route: '/create/gradient', actions: ['Random', 'Shuffle from palette', 'Reset'], primary: /^Save or share/, title: 'Gradient' },
  { route: '/create/contrast', actions: [], primary: /^Copy/, title: 'Contrast Checker' },
  { route: '/create/tint', actions: [], primary: /^Copy or save/, title: 'Tint' },
  // Signed out, so "Add to project" (canSaveProjects) is not offered here.
  { route: '/create/semantic-color', actions: [], primary: /^Copy /, title: 'Semantic Colour' },
  // Studio tools. The converter's and the Brand Starter's run actions live
  // with their inputs (the action bar, the brief), so their toolbars have no
  // primary; /seo's three tools are tabs under the toolbar, so its row is the
  // back button and the name.
  { route: '/create/file-converter', title: 'File Converter', actions: ['Open the 3D Model Converter'] },
  { route: '/create/alt-text', title: 'Alt Text Generator', actions: ['Add images'], primary: /^Generate/ },
  { route: '/create/auto-builder', title: 'Brand Starter', actions: [] },
  { route: '/create/3d-converter', title: '3D Model Converter', actions: ['For Blender', 'Open a file'] },
  { route: '/seo', title: 'Meta & SERP Inspector', actions: [], minChildren: 2 },
  {
    route: '/create/font-pair',
    actions: [{ row: 'Shuffle', menu: 'Shuffle the heading' }, 'Build a type scale from this pair', 'Copy font import'],
    // Below 1024 Shuffle is in the docked bar, and below 768 so is Copy CSS.
    dockedBelow: 1024,
    docked: ['Shuffle'],
    primaryFrom: 768,
    links: ['Browse the Font Gallery'],
    primary: /^Copy CSS/,
    title: 'Font Pair',
  },
  {
    route: '/create/type-scale',
    // Save to a project is in the docked bar at every width, never the toolbar;
    // under 768 Copy CSS is there too.
    actions: ['Reset scale', 'Find a pairing for these families', 'Copy font import'],
    primary: /^Copy CSS/,
    primaryDockedBelow: 768,
    title: 'Type Scale',
  },
  {
    route: '/create/font-gallery',
    actions: ['All', 'Serif', 'Display'],
    selects: ['Sort families'],
    sliders: ['Specimen size'],
    // Preview text is a field on the row only where the row has room for it (about
    // 1440 and up); below that it is in the overflow ("More filters" at 1024 and up).
    fields: ['Preview text'],
    links: ['Build a font pair'],
    // From 768 to 1023 search and "Build a font pair" sit on the page's own second row.
    secondRow: '.fg-bar2',
    // Under 1024 the page has a Filters sheet in place of an overflow menu. Whatever
    // is off the row must be in the sheet, found by the role and name the sheet gives
    // it (the sheet spells Sort out as pills and Specimen size as a slider called Size).
    sheet: {
      below: 1024,
      open: 'Filters',
      reach: {
        All: ['button', 'All'],
        Serif: ['button', 'Serif'],
        Display: ['button', 'Display'],
        'Sort families': ['group', 'Sort'],
        'Specimen size': ['slider', 'Size'],
        'Preview text': ['textbox', 'Preview text'],
      },
    },
    // What the tool calls whatever is left in its overflow at each width.
    overflow: (width) => (width >= 1024 ? 'More filters' : 'More'),
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
        // Where an action can sit while it is still "on the row": the toolbar, or
        // the tool's own second row when it names one.
        const scope = tool.secondRow ? page.locator(`[data-tool-toolbar], ${tool.secondRow}`) : bar

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

        // The primary, where the tool has one, is always on the row from the
        // width the tool names, or in the docked bar where the tool says so
        // (Type Scale on a phone).
        if (tool.primary && width >= (tool.primaryFrom || 0)) {
          const docked = width < (tool.primaryDockedBelow || 0)
          await expect(docked
            ? page.locator('.tsc-dock').getByRole('button', { name: tool.primary })
            : bar.getByRole('button', { name: tool.primary })).toBeVisible()
          if (docked) await expect(bar.getByRole('button', { name: tool.primary }), `${width}px: the primary is in the dock, not also on the row`).toHaveCount(0)
        }

        // Every action: on the row, or in the overflow.
        await expect(bar, `${width}px: the toolbar is still measuring`).not.toHaveClass(/is-measuring/)
        const overflowName = typeof tool.overflow === 'function' ? tool.overflow(width) : (tool.overflow || 'More')
        const inSheet = Boolean(tool.sheet) && width < tool.sheet.below
        const rowName = (a) => (typeof a === 'string' ? a : a.row)
        const menuName = (a) => (typeof a === 'string' ? a : a.menu)
        const missingActions = []
        for (const action of tool.actions.filter((a) => !(width < (tool.dockedBelow || 0) && (tool.docked || []).includes(typeof a === 'string' ? a : a.row)))) {
          // A row action that navigates is a link; its overflow row is a button.
          const named = { name: startsWith(rowName(action)) }
          const shown = await scope.getByRole('button', named).or(scope.getByRole('link', named)).first().isVisible().catch(() => false)
          if (!shown) missingActions.push(menuName(action))
        }
        const missingLinks = []
        for (const name of tool.links || []) {
          const shown = await scope.getByRole('link', { name: startsWith(name) }).first().isVisible().catch(() => false)
          if (!shown) missingLinks.push(name)
        }
        const missing = [...missingActions, ...missingLinks]
        const missingSelects = []
        for (const name of tool.selects || []) {
          const shown = await scope.getByRole('button', { name }).first().isVisible().catch(() => false)
          if (!shown) missingSelects.push(name)
        }
        const missingFields = []
        for (const name of tool.fields || []) {
          const shown = await scope.getByRole('textbox', { name }).first().isVisible().catch(() => false)
          if (!shown) missingFields.push(name)
        }
        const missingSliders = []
        for (const name of tool.sliders || []) {
          const shown = await scope.getByRole('slider', { name }).or(scope.getByRole('button', { name })).first().isVisible().catch(() => false)
          if (!shown) missingSliders.push(name)
        }
        // Where a sheet takes the place of the overflow, what is off the row is
        // reached through the sheet; links and menu-only actions still use the overflow.
        const sheetControls = inSheet ? [...missingActions, ...missingSelects, ...missingSliders, ...missingFields] : []
        if (inSheet) {
          const open = scope.getByRole('button', { name: tool.sheet.open, exact: true })
          await expect(open, `${width}px: ${sheetControls.join(', ')} are off the row and there is no ${tool.sheet.open} button`).toBeVisible()
          await open.click()
          const sheet = page.getByRole('dialog', { name: tool.sheet.open })
          await expect(sheet).toBeVisible()
          for (const name of sheetControls) {
            const target = tool.sheet.reach[name]
            expect(target, `${width}px: the spec does not say where the ${tool.sheet.open} sheet keeps "${name}"`).toBeTruthy()
            const [role, label] = target
            const found = sheet.getByRole(role, { name: label, exact: true })
            await expect(found.first(), `${width}px: "${name}" is not in the ${tool.sheet.open} sheet`).toBeVisible()
            // A group of choices is only reachable if it has choices in it.
            if (role === 'group') await expect(found.first().getByRole('button'), `${width}px: the "${label}" group in the ${tool.sheet.open} sheet is empty`).not.toHaveCount(0)
          }
          // The sheet is dismissable, and gives focus back.
          await page.keyboard.press('Escape')
          await expect(sheet).toBeHidden()
          await expect(open).toBeFocused()
        }
        const inOverflow = inSheet ? [...missingLinks, ...(tool.menuOnly || [])] : [...missing, ...(tool.menuOnly || [])]
        const overflowSelects = inSheet ? [] : missingSelects
        const overflowSliders = inSheet ? [] : missingSliders
        const overflowFields = inSheet ? [] : missingFields
        // An overflow with nothing in it is a defect too: it means the row is
        // stuck in its measuring pass (seen once on /create/tint).
        if (!inOverflow.length && !overflowSelects.length && !overflowSliders.length && !overflowFields.length) {
          await expect(bar.getByRole('button', { name: overflowName, exact: true }), `${width}px: a ${overflowName} button with nothing in it`).toHaveCount(0)
        }
        if (inOverflow.length || overflowSelects.length || overflowSliders.length || overflowFields.length) {
          const more = bar.getByRole('button', { name: overflowName, exact: true })
          await expect(more, `${width}px: ${[...inOverflow, ...overflowSelects, ...overflowSliders, ...overflowFields].join(', ')} are off the row and there is no ${overflowName}`).toBeVisible()
          await more.click()
          const panel = page.getByRole('dialog', { name: overflowName })
          await expect(panel).toBeVisible()
          for (const name of inOverflow) {
            await expect(panel.getByRole('button', { name: startsWith(name) }).first(), `${width}px: "${name}" is not in the overflow`).toBeVisible()
          }
          for (const name of overflowSelects) {
            await expect(panel.getByRole('button', { name }), `${width}px: the "${name}" select is not in the overflow`).toBeVisible()
          }
          for (const name of overflowFields) {
            await expect(panel.getByRole('textbox', { name }).first(), `${width}px: the "${name}" field is not in the overflow`).toBeVisible()
          }
          for (const name of overflowSliders) {
            await expect(panel.getByRole('slider', { name }).or(panel.getByRole('button', { name })).first(), `${width}px: the "${name}" control is not in the overflow`).toBeVisible()
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
  // 360: the narrowest phone, where Random is always in the overflow. At 390 the
  // tightened row can keep it inline.
  await page.setViewportSize({ width: 360, height: 844 })
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

test('/create/palette · Reset run from the phone Extra tools sheet still resets', async ({ page }) => {
  watch(page, 'a designer resetting a palette from the bottom sheet')
  await page.setViewportSize({ width: 390, height: 844 })
  await go(page, '/create/palette')
  const hexes = page.locator('.plb-col .plb-hex')
  await expect(hexes).toHaveCount(5)
  const before = (await hexes.allTextContents()).join()
  await page.getByRole('button', { name: 'Extra tools', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Extra tools' })
  await expect(sheet).toBeVisible()
  const box = await sheet.boundingBox()
  expect(Math.round(box.y + box.height)).toBeGreaterThanOrEqual(843)
  await sheet.getByRole('button', { name: 'Reset palette', exact: true }).click()
  await expect(sheet).toBeHidden()
  await expect.poll(async () => (await hexes.allTextContents()).join()).not.toBe(before)
})
