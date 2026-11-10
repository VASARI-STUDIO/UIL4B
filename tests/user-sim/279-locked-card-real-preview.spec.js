// SPEC 279: A LOCKED PALETTE OR GRADIENT SHOWS A SOFT PREVIEW OF ITSELF.
//
// On the Palette and Gradient Libraries a free account meets three locked
// cards. Each shows its own row as a blurred, frosted image made at build time
// (scripts/library/lockedThumbs.mjs), so the colours and their order read
// through. The page still holds no value of the row: the image is decoration,
// and the card is a link to /plans. If the image cannot load, the card falls
// back to the fixed decorative tints.
//
// MUTATIONS (each should turn the named test red):
//   - drop `kind=` on LockedPaletteCard in PaletteGallery.jsx or
//     GradientGallery.jsx: "each locked card shows its own preview" fails on
//     that library;
//   - give the <img> a real alt, or take aria-hidden off .lockt-stripes: "the
//     preview is decoration" fails;
//   - drop the onError fallback in LockedTease.jsx: "a preview that cannot load
//     leaves the tints" fails.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'

const LIBRARIES = [
  { name: 'Palette Library', route: '/discover/palettes', kind: 'palettes' },
  { name: 'Gradient Library', route: '/discover/gradients', kind: 'gradients' },
]

for (const [width, touch] of [[390, true], [1440, false]]) {
  test.describe(`Locked previews at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: touch, isMobile: touch })

    for (const lib of LIBRARIES) {
      test(`${lib.name}: each locked card shows its own preview, as decoration, with no values on the page`, async ({ page }) => {
        watch(page, `a free designer meeting the locked ${lib.name} cards at ${width}px`)
        await signIn(page, { plan: 'free' })
        await go(page, lib.route)
        const cards = page.locator('.lockt-card--thumb')
        await expect(cards.first()).toBeVisible()
        await cards.first().scrollIntoViewIfNeeded()
        const facts = await cards.evaluateAll((els, kind) => els.map((card) => {
          const img = card.querySelector('img.lockt-thumb')
          return {
            src: img && new URL(img.src).pathname,
            ok: !!img && img.complete && img.naturalWidth === 24,
            alt: img?.getAttribute('alt'),
            hidden: img?.closest('[aria-hidden="true"]') != null,
            kindPath: img ? new URL(img.src).pathname.startsWith(`/locked-previews/${kind}/`) : false,
            hex: /#[0-9a-f]{6}\b/i.test(card.outerHTML),
            upgrade: card.querySelector('a.lockt-upgrade')?.getAttribute('href'),
          }
        }), lib.kind)
        expect(facts.length, 'locked cards').toBe(3)
        for (const f of facts) {
          expect(f.kindPath, `${f.src} is not this library's preview`).toBe(true)
          await expect.poll(() => page.evaluate((src) => {
            const img = [...document.querySelectorAll('img.lockt-thumb')].find((i) => new URL(i.src).pathname === src)
            return !!img && img.complete && img.naturalWidth === 24
          }, f.src), { message: `${f.src} did not load` }).toBe(true)
          expect(f.alt, 'the preview is decoration').toBe('')
          expect(f.hidden, 'the preview is decoration').toBe(true)
          expect(f.hex, 'a hex value is in the locked card').toBe(false)
          expect(f.upgrade).toBe('/plans')
        }
        expect(new Set(facts.map((f) => f.src)).size, 'two locked cards share a preview').toBe(3)
        await page.screenshot({ path: `.claude/scratch/thumbs/spec-${lib.kind}-${width}.png` })
      })
    }

    test('a preview that cannot load leaves the tints', async ({ page }) => {
      watch(page, `a free designer on a connection that drops the preview images at ${width}px`)
      await page.route('**/locked-previews/**', (route) => route.abort())
      await signIn(page, { plan: 'free' })
      await go(page, '/discover/palettes')
      const card = page.locator('.lockt-card').first()
      await expect(card).toBeVisible()
      // The previews are lazy: bring the cards into view so each one is asked for.
      await card.scrollIntoViewIfNeeded()
      await expect(page.locator('.lockt-card--thumb')).toHaveCount(0)
      await expect(page.locator('img.lockt-thumb')).toHaveCount(0)
      expect(await card.locator('.lockt-stripe').count(), 'the tints are gone too').toBeGreaterThan(0)
    })
  })
}
