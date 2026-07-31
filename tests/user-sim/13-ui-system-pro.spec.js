import { test, expect } from '@playwright/test'
import { go, watch } from './helpers.js'

const FIXTURE = '/tests/user-sim/fixtures/ui-system-pro.html'

async function openPro(page) {
  await go(page, FIXTURE)
  await expect(page.getByRole('heading', { name: 'UI System Builder' })).toBeVisible()
}

test.describe('UI System Pro acceptance fixture', () => {
  test('legacy Palette HCT keeps requested hue and chroma through gamut endpoints', async ({ page }) => {
    watch(page, 'Pro Palette designer crossing a gamut endpoint')
    await openPro(page)

    const fixture = page.getByRole('region', { name: 'Legacy Palette HCT acceptance fixture' })
    const hue = fixture.getByRole('slider', { name: 'Hue of FIXTURE' })
    const chroma = fixture.getByRole('slider', { name: 'Chroma of FIXTURE' })
    const tone = fixture.getByRole('slider', { name: 'Tone of FIXTURE' })
    await hue.fill('312')
    await chroma.fill('120')
    await tone.fill('0')
    await expect(fixture.getByText(/Display gamut limited/)).toBeVisible()
    await expect(hue).toHaveValue('312')
    await expect(chroma).toHaveValue('120')
    await tone.fill('50')
    await expect(hue).toHaveValue('312')
    await expect(chroma).toHaveValue('120')
    await expect(fixture.getByText(/Requested H 312/)).toBeVisible()
  })

  test('seed, neutral mode, overrides, rebalance and reset preserve the Brand 500 contract', async ({ page }) => {
    watch(page, 'Pro designer tuning a functional UI colour system')
    await openPro(page)

    const seed = page.getByRole('textbox', { name: 'Brand 500' })
    await seed.fill('#0A7F72')
    await seed.press('Enter')
    await expect(page.getByRole('gridcell', { name: /Brand 500, #0A7F72/ })).toBeVisible()

    await page.getByRole('button', { name: 'True grey' }).click()
    await expect(page.getByRole('button', { name: 'True grey' })).toHaveAttribute('aria-pressed', 'true')
    const neutralLabel = await page.getByRole('gridcell', { name: /Neutral 500/ }).getAttribute('aria-label')
    const neutralHex = neutralLabel.match(/#[0-9A-F]{6}/)[0]
    expect(neutralHex.slice(1, 3)).toBe(neutralHex.slice(3, 5))
    expect(neutralHex.slice(3, 5)).toBe(neutralHex.slice(5, 7))

    await page.getByRole('gridcell', { name: /Brand 500/ }).click()
    await page.getByRole('button', { name: /Edit via Brand seed/ }).click()
    await expect(seed).toBeFocused()
    await expect(page.getByRole('dialog', { name: /Edit Brand 500/ })).toHaveCount(0)

    await page.getByRole('gridcell', { name: /Brand 600/ }).click()
    const edit = page.getByRole('button', { name: /Edit shade/ })
    await edit.click()
    const editor = page.getByRole('dialog', { name: 'Edit Brand 600' })
    await expect(editor).toBeVisible()
    await expect(page.getByRole('slider', { name: /Hue request/ })).toBeFocused()
    await page.getByRole('button', { name: 'What is HCT?' }).last().focus()
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Save override' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(edit).toBeFocused()

    await edit.click()
    await page.getByRole('slider', { name: /Hue request/ }).fill('312')
    await page.getByRole('slider', { name: /Chroma request/ }).fill('120')
    await page.getByRole('slider', { name: /Tone request/ }).fill('42')
    await page.getByRole('button', { name: 'Save override' }).click()
    await expect(page.getByText(/override saved/)).toBeAttached()
    const overridden = await page.getByRole('gridcell', { name: /Brand 600/ }).getAttribute('aria-label')

    await page.getByRole('button', { name: 'Regenerate / rebalance' }).click()
    const rebalanced = await page.getByRole('gridcell', { name: /Brand 600/ }).getAttribute('aria-label')
    expect(rebalanced).not.toBe(overridden)

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(seed).toHaveValue('#4338E0')
    await expect(page.getByRole('gridcell', { name: /Brand 500, #4338E0/ })).toBeVisible()
  })

  test('all five Pro scene tabs use roving keyboard navigation and distinct role-token structures', async ({ page }) => {
    watch(page, 'Pro designer evaluating authored interface scenes')
    await openPro(page)

    const workspace = page.getByRole('tab', { name: 'Product Workspace' })
    await expect(workspace).toHaveAttribute('tabindex', '0')
    await workspace.focus()
    await page.keyboard.press('ArrowRight')
    const settings = page.getByRole('tab', { name: 'Settings Form' })
    await expect(settings).toBeFocused()
    await expect(settings).toHaveAttribute('tabindex', '0')
    await page.keyboard.press('Enter')
    await expect(settings).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel')).toHaveAttribute('data-scene', 'settings')
    await expect(page.getByRole('tabpanel')).toContainText('Workspace name')

    const cases = [
      ['Product Workspace', 'workspace', 'Audit empty states'],
      ['Commerce', 'commerce', 'Payment details'],
      ['Documentation', 'docs', 'npm install @uil4b/tokens'],
      ['Mobile App', 'mobile', 'Good morning, Maya'],
    ]
    for (const [label, id, evidence] of cases) {
      await page.getByRole('tab', { name: label }).click()
      await expect(page.getByRole('tabpanel')).toHaveAttribute('data-scene', id)
      await expect(page.getByRole('tabpanel')).toContainText(evidence)
    }
    await page.getByRole('tab', { name: 'Mobile App' }).focus()
    await page.keyboard.press('Home')
    await expect(workspace).toBeFocused()
    await page.keyboard.press('End')
    await expect(page.getByRole('tab', { name: 'Mobile App' })).toBeFocused()
  })

  test('CSS, DTCG and Tailwind exports are real clipboard payloads with denial recovery', async ({ page, context }) => {
    watch(page, 'Pro developer exporting a complete UI token handoff')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openPro(page)

    await page.getByRole('button', { name: 'Copy CSS' }).click()
    const css = await page.evaluate(() => navigator.clipboard.readText())
    expect(css).toContain('--ui-brand-500: #4338E0')
    expect(css).toContain('[data-ui-theme="dark"]')

    await page.getByRole('button', { name: 'Copy JSON / DTCG' }).click()
    const dtcg = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))
    expect(dtcg.color.brand['500'].$value).toBe('#4338E0')
    expect(dtcg.semantic.dark.primary.$value).toMatch(/^\{color\.brand\.\d00\}$/)

    await page.getByRole('button', { name: 'Copy Tailwind' }).click()
    const tailwind = await page.evaluate(() => navigator.clipboard.readText())
    expect(tailwind).toContain('export default')
    expect(tailwind).toContain('"brand"')

    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) },
      })
    })
    await page.getByRole('button', { name: 'Copy CSS' }).click()
    await expect(page.locator('#fixture-copy-status')).toHaveText('Failed to copy')
    await expect(page.getByText(/CSS variables could not be copied/)).toBeAttached()
  })
})
