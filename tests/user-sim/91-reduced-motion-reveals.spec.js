// ANIMATION OFF MUST NOT MEAN CONTENT MISSING.
//
// Founder report, 2026-09-15, verbatim: "if people have animation off it looks
// broken". Reproduced on the LIVE site with prefers-reduced-motion set,
// measured at load before any scroll:
//
//   /learn          13 of 14 blocks blank   1,659 characters invisible
//   /create/color    5 of 6                   691
//   /discover        5 of 9                   640
//   /plans           1 of 1                   217
//
// THE CAUSE WAS A SAFEGUARD THAT WAS DOCUMENTED AND NEVER WRITTEN.
// src/hooks/useReveal.js said, under "Resilience", that "Reduced motion → the
// CSS forces [data-reveal] visible regardless". No such CSS existed. The only
// rules were `[data-reveal]{opacity:0}` and `[data-reveal].is-in{opacity:1}`,
// so the ONLY thing that ever cleared the hidden state was an
// IntersectionObserver firing when the element scrolled into view. `<html>`
// carried `data-reduced-motion="true"` the whole time and nothing keyed on it.
//
// The content was never permanently lost — scroll far enough and it all
// appears. That is what made it survive: every earlier check either scrolled
// first, or looked only at the homepage, which is the one surface that was
// already right. The homepage runs useHomeMotion, which skips GSAP entirely
// under reduced motion and leaves all eight sections revealed at load. Every
// other surface runs useReveal.
//
// WHY AT LOAD, WITHOUT SCROLLING, IS THE WHOLE TEST. A visitor who has asked
// for no animation is precisely the person who should not have to scroll to
// make text exist, and a spec that walks the page first cannot see this at all.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

const PERSONA = 'someone who has turned animation off at the OS level'

// Every surface that runs useReveal. The homepage is included deliberately: it
// uses a different mechanism and must keep passing for a different reason.
const ROUTES = ['/learn', '/discover', '/plans', '/create/color', '/help', '/principles', '/']

test.describe('with reduced motion, nothing waits for a scroll', () => {
  for (const route of ROUTES) {
    test(`${route} shows all of itself at load`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: 'reduce',
      })
      const page = await ctx.newPage()
      watch(page, PERSONA)
      await go(page, route)
      // Long enough for the page's own reveal hook to have run if it were going
      // to. NOT long enough to scroll — and nothing here scrolls, on purpose.
      await page.waitForTimeout(1500)

      const seen = await page.evaluate(() => {
        const nodes = [...document.querySelectorAll('[data-reveal], [data-reveal-group]')]
        const blank = nodes.filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.05)
        return {
          attr: document.documentElement.getAttribute('data-reduced-motion'),
          total: nodes.length,
          blank: blank.map((el) => ({
            cls: (el.className || '').toString().split(' ')[0] || el.tagName,
            chars: (el.innerText || '').trim().length,
          })),
        }
      })

      // POSITIVE CONTROL 1: the browser preference actually reached the app. If
      // this attribute were absent the assertion below would pass on a page
      // that had never been asked to reduce anything.
      expect(seen.attr, `${route} did not receive the reduced-motion preference, so this `
        + 'test is measuring the ordinary motion path').toBe('true')

      const lost = seen.blank.reduce((n, b) => n + b.chars, 0)
      expect(seen.blank.map((b) => b.cls),
        `${route} hides ${seen.blank.length} of ${seen.total} reveal blocks at load with `
        + `reduced motion on — ${lost} characters of text a visitor cannot see until they `
        + 'scroll. Somebody who turned animation off is the last person who should have to. '
        + 'The rule that prevents this sits beside [data-reveal] in global.css.')
        .toEqual([])
    })
  }
})

test('with motion ON, the reveal still waits for the scroll', async ({ browser }) => {
  // THE OTHER HALF, and without it the fix above could be "delete the reveal".
  // The scroll reveal is a deliberate design and must survive; what changed is
  // only that reduced motion opts out of it.
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'no-preference',
  })
  const page = await ctx.newPage()
  watch(page, 'a visitor with animation on')
  await go(page, '/learn')
  await page.waitForTimeout(1500)

  const state = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('[data-reveal], [data-reveal-group]')]
    return {
      attr: document.documentElement.getAttribute('data-reduced-motion'),
      total: nodes.length,
      blank: nodes.filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.05).length,
    }
  })

  expect(state.attr, 'this context should NOT be in reduced motion').toBe('false')
  expect(state.total, '/learn renders no reveal blocks, so neither half of this is tested')
    .toBeGreaterThan(5)
  expect(state.blank, 'nothing is waiting to reveal on /learn with motion on. The reduced-motion '
    + 'rule has leaked into the ordinary path and the scroll reveal is gone.')
    .toBeGreaterThan(0)
})
