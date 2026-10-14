// Preview grounds, colour controls, loading states and toolbar geometry.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER } from './iconify-stub.js'

const WIDTHS = [320, 360, 390, 640, 641, 768, 961, 999, 1440]

const openCustomizer = async (page) => {
  await go(page, '/create/icons')
  await page.locator('.ig .ic').first().click()
  await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20000 })
}

const stageAndPage = (page) => page.evaluate(() => {
  const s = getComputedStyle(document.querySelector('.icust-stage'))
  return {
    bg: s.backgroundColor,
    image: s.backgroundImage,
    page: getComputedStyle(document.body).backgroundColor,
  }
})

test.describe('the customizer preview ground', () => {
  for (const scheme of ['light', 'dark']) {
    test(`default colour previews on the ${scheme} page background`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } })
      const page = await ctx.newPage()
      watch(page, `someone opening an icon in ${scheme} mode`)
      await openCustomizer(page)
      await expect(page.locator('.icust-panel').getByRole('button', { name: 'Default', exact: true })).toHaveCount(0)
      await expect(page.locator('.icust-row').filter({ has: page.locator('label', { hasText: /^Colour$/ }) }).locator('.icust-seg button.active')).toHaveCount(0)
      const { bg, image, page: pageBg } = await stageAndPage(page)
      expect(image, 'the stage is painting a gradient').toBe('none')
      expect(bg, 'the stage is not the page background').toBe(pageBg)
      await ctx.close()
    })
  }

  test('a chosen colour keeps a contrast ground, and Reset brings the page ground back', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light', viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    watch(page, 'someone picking white for an icon')
    await openCustomizer(page)
    await page.getByRole('button', { name: 'White', exact: true }).click()
    const picked = await stageAndPage(page)
    expect(picked.image, 'white on the page ground would be invisible').not.toBe('none')
    await page.getByRole('button', { name: 'Reset to default', exact: true }).click()
    const back = await stageAndPage(page)
    expect(back.bg).toBe(back.page)
    await ctx.close()
  })
})

const measureToolbar = (page) => page.evaluate(() => {
  const tb = document.querySelector('.ig-toolbar')
  const row = tb.querySelector('.lbry-toolbar-row')
  const rr = row.getBoundingClientRect()
  const controls = [...tb.querySelectorAll('button, input, select, a[href]')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
    .map((e) => {
      const r = e.getBoundingClientRect()
      return { name: e.getAttribute('aria-label') || e.textContent.trim() || e.className, w: r.width, h: r.height, left: r.left, right: r.right, top: r.top, bottom: r.bottom }
    })
  const add = tb.querySelector('.ig-addbtn')
  const slot = tb.querySelector('.lbry-toolbar-action')
  return {
    coarse: matchMedia('(pointer:coarse)').matches,
    rowH: rr.height, rowRight: rr.right, rowLeft: rr.left,
    pageOverflow: document.documentElement.scrollWidth - innerWidth,
    controls,
    addW: add ? add.getBoundingClientRect().width : null,
    slotW: slot ? slot.getBoundingClientRect().width : null,
    addLabelVisible: add ? (() => { const l = add.querySelector('.ig-addbtn-label'); const r = l.getBoundingClientRect(); return r.width > 8 && r.height > 8 })() : null,
  }
})

test.describe('the icon toolbar', () => {
  for (const [scheme, widths] of [['light', WIDTHS], ['dark', [390, 1440]]]) {
    for (const w of widths) {
      test(`one row, whole controls, 44px targets on touch at ${w} ${scheme}`, async ({ browser }) => {
        const touch = w <= 768
        const ctx = await browser.newContext({
          colorScheme: scheme, viewport: { width: w, height: 900 }, hasTouch: touch, isMobile: touch,
        })
        const page = await ctx.newPage()
        watch(page, `someone browsing icons at ${w}px`)
        await go(page, '/create/icons')
        await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20000 })
        await expect(page.locator('.ig-addbtn')).toBeVisible()
        await expect(page.locator('.ig-toolbar').getByRole('button', { name: /^Outlined/ })).toHaveCount(0)
        await expect(page.locator('.ig-toolbar').getByRole('button', { name: /^Solid/ })).toHaveCount(0)
        const m = await measureToolbar(page)

        // One row: no control starts below another's bottom edge on the row.
        const rowControls = m.controls.filter((c) => !/Regular|Bold|Fill|Duo/.test(c.name))
        const tops = rowControls.map((c) => c.top)
        expect(Math.max(...tops) - Math.min(...tops), 'a control sits on a second row').toBeLessThan(12)
        // Nothing runs past the row or the screen.
        for (const c of m.controls) {
          expect(c.right, `${c.name} runs past the toolbar`).toBeLessThanOrEqual(m.rowRight + 1)
          expect(c.left, `${c.name} starts before the toolbar`).toBeGreaterThanOrEqual(m.rowLeft - 1)
        }
        expect(m.pageOverflow, 'the page scrolls sideways').toBeLessThanOrEqual(0)
        // The Add icon control is a whole control, not a sliver.
        expect(m.addW, 'Add icon is squeezed').toBeGreaterThanOrEqual(44)
        expect(m.slotW, 'the action slot is squeezed').toBeGreaterThanOrEqual(44)
        if (w > 640) expect(m.addLabelVisible, 'the Add icon word is clipped').toBe(true)
        if (touch) {
          expect(m.coarse).toBe(true)
          for (const c of m.controls) {
            expect(c.h, `${c.name} is under 44px tall`).toBeGreaterThanOrEqual(43.5)
            expect(c.w, `${c.name} is under 44px wide`).toBeGreaterThanOrEqual(43.5)
          }
        }
        await ctx.close()
      })
    }
  }
})

const adobeCatalogue = async (page) => {
  await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/collection' && u.searchParams.get('prefix') === 'logos', route => route.fulfill({
    contentType: 'application/json', headers: { [ICONIFY_STUB_HEADER]: '1' },
    body: JSON.stringify({ prefix: 'logos', title: 'SVG Logos', total: 1, uncategorized: ['adobe'] }),
  }))
}

const openAdobeGrid = async (page) => {
  await signIn(page, { plan: 'pro' })
  await adobeCatalogue(page)
  await go(page, '/create/icons')
  // On a phone the pack menu sits inside the toolbar's Filters sheet.
  const pack = page.getByRole('button', { name: 'Icon pack' })
  const filters = page.getByRole('button', { name: 'Filters', exact: true })
  await expect(pack.or(filters).first()).toBeVisible({ timeout: 20000 })
  if (await filters.isVisible()) {
    await filters.click()
    const sheet = page.getByRole('dialog', { name: 'Filters' })
    await chooseMenuOption(page, sheet.getByRole('button', { name: 'Icon pack' }), 'logos')
    await sheet.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(sheet).toHaveCount(0)
  } else {
    await chooseMenuOption(page, pack, 'logos')
  }
  await expect(page.locator('.ig .ic').first()).toHaveAttribute('aria-label', 'Customise adobe')
}

for (const scheme of ['dark', 'light']) {
  for (const width of [390, 1440, 1920]) {
    test(`coloured grid and adobe preview use the page ground at ${width} ${scheme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width, height: 900 } })
      try {
        const page = await ctx.newPage()
        await openAdobeGrid(page)
        const glyph = page.locator('.ig .ig-chip').first()
        await expect(glyph.locator('img')).toBeVisible()
        const plate = await glyph.evaluate(e => {
          const s = getComputedStyle(e)
          return { bg: s.backgroundColor, image: s.backgroundImage, shadow: s.boxShadow }
        })
        expect(plate).toEqual({ bg: 'rgba(0, 0, 0, 0)', image: 'none', shadow: 'none' })
        await page.locator('.ig .ic').first().click()
        await expect(page.locator('.icust-stage-img')).toBeVisible()
        const stage = await stageAndPage(page)
        expect(stage.bg).toBe(stage.page)
        expect(stage.image).toBe('none')
        await expect(page.locator('.icust-stage')).toHaveClass(/icust-stage--theme/)
        await expect(page.locator('.icust-stage')).not.toHaveClass(/icust-stage--light/)
        const colourSeg = page.locator('.icust-row').filter({ has: page.locator('label', { hasText: /^Colour$/ }) }).locator('.icust-seg')
        await expect(colourSeg.getByRole('button')).toHaveCount(0)
        await expect(colourSeg).toHaveText('Default')
        await expect(colourSeg.locator('.active')).toHaveCount(1)
        expect(await page.locator('.icust-stage-img').getAttribute('src')).toMatch(/^data:/)
      } finally { await ctx.close() }
    })
  }
}

for (const weight of ['Regular', 'Bold', 'Fill', 'Duo']) {
  test(`Default colour is offered only for Duo, when browsing ${weight}`, async ({ page }) => {
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    const seg = page.getByRole('group', { name: 'Icon weight' })
    await seg.getByRole('button', { name: new RegExp(`^${weight}`) }).click()
    await expect(page.locator('.ig .ic').first()).toBeVisible()
    if (weight !== 'Regular') {
      await expect(page.locator('.ig .ic').first()).toHaveAttribute('aria-label', weight === 'Duo' ? /-duotone$/ : weight === 'Bold' ? /-bold$/ : /-(fill|solid|filled)$/)
    }
    await page.locator('.ig .ic').first().click()
    const colour = page.locator('.icust-row').filter({ has: page.locator('label', { hasText: /^Colour$/ }) })
    await expect(colour.getByRole('button', { name: 'Default', exact: true })).toHaveCount(weight === 'Duo' ? 1 : 0)
    if (weight !== 'Duo') await expect(colour.locator('.icust-seg button.active')).toHaveCount(0)
  })
}

for (const fail of [false, true]) {
  test(`an uncached coloured preview shows a loading indicator${fail ? ' and an error' : ' until its image loads'}`, async ({ page }) => {
    let release
    const pending = new Promise(resolve => { release = resolve })
    await page.route(u => ICONIFY_HOSTS.includes(u.hostname) && (u.pathname === '/logos.json' || /\/logos\/.*\.svg$/.test(u.pathname)), async route => {
      await pending
      if (fail) await route.fulfill({ status: 404, contentType: 'text/plain', headers: { [ICONIFY_STUB_HEADER]: 'refused' }, body: 'Missing' })
      else await route.fallback()
    })
    try {
      await openAdobeGrid(page)
      await page.locator('.ig .ic').first().click()
      const stage = page.locator('.icust-stage')
      await expect(stage.getByRole('status')).toHaveText('Loading\u2026')
      await expect(stage.getByRole('status')).toBeVisible()
      const reserved = await stage.boundingBox()
      release()
      if (fail) await expect(stage.getByRole('status')).toHaveText('Couldn\u2019t load this icon.')
      else {
        await expect(stage.locator('img')).toBeVisible()
        await expect(stage.getByRole('status')).toHaveCount(0)
      }
      expect(Math.abs((await stage.boundingBox()).height - reserved.height)).toBeLessThan(0.5)
    } finally { release() }
  })
}
