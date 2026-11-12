// The home "try the tools" section as a visitor scrolls it, and the File Converter
// inside it.
//
//   · each of the four tools can be reached from its name, at a desktop and a phone width
//   · the tools stand apart: the gap between one tool's frame and the next is wide
//     (240px from 1200, 104 from 768, 80 under it); the tools that are not current are
//     dimmed to 88% and the hairlines between them sit outside the dimming
//   · the settle: a scroll that ends within reach of a tool eases onto it, and it is
//     left alone where it would undo the visitor (the cases are listed at the settle block)
//   · the File Converter's Animation, Video and Extract frames tabs each draw their own
//     preview, the preview answers a setting, the spec line wraps inside the card, and
//     the "Open in File Converter" link carries that tab's mode (Image keeps the bare link)
//
// MUTATIONS (each turns a test red; the settle ones are on the tests, in HomeTry.jsx):
//   - put the row-gap in home-try.css back to 56px / 120px -> the gap test
//   - delete the settle effect in HomeTry.jsx -> the settle control tests
//   - change the dim in home-try.css, or move the hairline into the stage -> the dim test
//   - make a converter tab render the Image card in ConverterTool.jsx -> the tabs test
//   - change an entry of MODE_IDS in ConverterTool.jsx -> the link test
import { test, expect } from './base.js'
import { go, watch, wheelToRest, restingScrollY, homeSectionsLoaded } from './helpers.js'

const PERSONA = 'a visitor scrolling the home page to try the tools'
const NAMES = ['Palette Builder', 'Icon Library', 'Font Gallery', 'File Converter']

async function openTool(page, i) {
  await page.locator('#try').scrollIntoViewIfNeeded()
  await page.locator(`#ht-n-${i}`).click()
  await expect(page.locator(`#ht-n-${i}`)).toHaveAttribute('aria-current', 'true')
  await expect(page.locator(`#ht-s-${i}`)).toBeInViewport()
}

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test.describe(`home try section at ${width}`, () => {
    test.use({ viewport: { width, height } })

    test('each of the four tools is reached from its name', async ({ page }) => {
      watch(page, PERSONA)
      await go(page, '/')
      await homeSectionsLoaded(page)
      const names = page.locator('.ht-names .ht-n')
      await expect(names).toHaveCount(4)
      for (let i = 0; i < 4; i += 1) {
        await openTool(page, i)
        // Exactly one name is current at a time.
        await expect(page.locator('.ht-names .ht-n[aria-current="true"]')).toHaveCount(1)
        await expect(page.locator(`#ht-h3-${i}`)).toHaveText(new RegExp(NAMES[i].split(' ')[0]))
      }
    })

    test('the gap between one tool and the next is wide', async ({ page }) => {
      watch(page, PERSONA)
      await go(page, '/')
      await homeSectionsLoaded(page)
      await page.locator('#try').scrollIntoViewIfNeeded()
      const gaps = await page.locator('.ht-stage').evaluateAll((els) => els.slice(1).map((el, i) => el.getBoundingClientRect().top - els[i].getBoundingClientRect().bottom))
      expect(gaps).toHaveLength(3)
      // The values the stylesheet sets (240 wide, 80 on a phone); the old ones were 120 and 56.
      const least = width >= 1200 ? 200 : 72
      for (const g of gaps) expect(g, `a ${Math.round(g)}px gap is too tight at ${width}`).toBeGreaterThanOrEqual(least)
    })

    test('the tools that are not current stand back at 88% and the hairlines between them do not', async ({ page }) => {
      watch(page, PERSONA)
      await go(page, '/')
      await homeSectionsLoaded(page)
      await openTool(page, 1)
      // Out of every stage, so a hover cannot bring one forward.
      await page.mouse.move(1, 1)
      const read = () => page.evaluate(() => ({
        stages: [...document.querySelectorAll('.ht-stage')].map((el) => [el.getAttribute('data-on'), getComputedStyle(el).opacity]),
        rules: [...document.querySelectorAll('.ht-rule')].map((el) => ({ inStage: !!el.closest('.ht-stage'), opacity: getComputedStyle(el).opacity })),
      }))
      // Mutation: change the opacity in the .ht-stage[data-on="false"] rule of home-try.css -> the stages' readings.
      await expect.poll(async () => (await read()).stages, { message: 'the current tool is whole and the rest are dimmed to .88' })
        .toEqual([['false', '0.88'], ['true', '1'], ['false', '0.88'], ['false', '0.88']])
      const { rules } = await read()
      expect(rules, 'one hairline above each tool but the first').toHaveLength(3)
      // Mutation: move the <i className="ht-rule"> back inside the <article> in HomeTry.jsx -> inStage is true and the line dims.
      for (const r of rules) expect(r, 'a hairline sits outside the dimmed stage, at full strength').toEqual({ inStage: false, opacity: '1' })
    })
  })
}

// The section's one scroll listener does three jobs: keep the names in step with the
// tool in view, settle a tool onto its spot when the wheel stops, and leave a name click
// to scroll to its tool. Each is read here at a desktop and a phone width.
for (const [width, height] of [[1440, 900], [390, 844]]) {
  test.describe(`home try section follows the scroll at ${width}`, () => {
    test.use({ viewport: { width, height } })
    const wide = width >= 1200

    // How far the tool sits from the spot it lands on: the middle of the window from
    // 1200, just below the names row under it.
    const offSpot = (page, i) => page.locator(`#ht-s-${i}`).evaluate((el, isWide) => {
      const r = el.getBoundingClientRect()
      const names = document.querySelector('.ht-names')
      if (isWide) return Math.abs(r.top + r.height / 2 - window.innerHeight / 2)
      return Math.abs(r.top - (names.getBoundingClientRect().height + 16))
    }, wide)
    const current = (page) => page.locator('.ht-names .ht-n[aria-current="true"]').evaluate((el) => el.id)
    // Wheel the page until tool i is the one nearest its spot (the names do not drive it).
    const wheelTo = async (page, i) => {
      for (let step = 0; step < 40; step += 1) {
        const gap = await page.locator(`#ht-s-${i}`).evaluate((el, isWide) => {
          const r = el.getBoundingClientRect()
          return isWide ? r.top + r.height / 2 - window.innerHeight / 2 : r.top
        }, wide)
        if (Math.abs(gap) < 160) return
        await wheelToRest(page, Math.max(-800, Math.min(800, gap)), `the page on its way to tool ${i}`)
      }
    }

    test('the current name follows a scroll that no name click made', async ({ page }) => {
      watch(page, PERSONA)
      await go(page, '/')
      await homeSectionsLoaded(page)
      await openTool(page, 0)
      await expect.poll(() => current(page)).toBe('ht-n-0')
      // Scrolling down to the third tool (by the wheel, never a name) moves the name with it.
      await wheelTo(page, 2)
      // Mutation: drop track() from the scroll handler in HomeTry.jsx -> the name stays on the first tool.
      await expect.poll(() => current(page), { message: 'the name for the tool in view is current', timeout: 8000 }).toBe('ht-n-2')
      // And back up to the first.
      await wheelTo(page, 0)
      await expect.poll(() => current(page), { message: 'the name follows the scroll back up', timeout: 8000 }).toBe('ht-n-0')
    })

    test('clicking a name lands its tool and no other name is current on the way', async ({ page }) => {
      watch(page, PERSONA)
      await go(page, '/')
      await homeSectionsLoaded(page)
      await page.locator('#try').scrollIntoViewIfNeeded()
      // From the click on, every frame notes which name is current.
      await page.evaluate(() => {
        window.__seen = new Set()
        window.__armed = false
        document.addEventListener('click', () => { window.__seen.clear(); window.__armed = true }, true)
        const tick = () => {
          const el = document.querySelector('.ht-names .ht-n[aria-current="true"]')
          if (window.__armed && el) window.__seen.add(el.id)
          requestAnimationFrame(tick)
        }
        tick()
      })
      for (const i of [3, 1]) {
        await page.locator(`#ht-n-${i}`).click()
        await expect.poll(() => offSpot(page, i), { message: `tool ${i} lands from its name`, timeout: 8000 }).toBeLessThan(6)
        const seen = await page.evaluate(() => { window.__armed = false; return [...window.__seen] })
        // Mutation: drop dest in go() in HomeTry.jsx -> the tools passed on the way take the name.
        expect(seen, `names current on the way to tool ${i}`).toEqual([`ht-n-${i}`])
      }
    })
  })
}

// THE SETTLE. Once the wheel has been quiet for 150ms, the tool the scroll arrived at eases
// onto its spot (500ms), if it is within reach (the lesser of 80px and a tenth of the
// window). It must never undo what the visitor did, so it keeps still
//   - toward the tool the gesture began on, and when the scroll ends beyond reach,
//   - while a name click is on its way, a mouse button is held, or motion is reduced,
//   - for the first tool pulled down past its spot (the heading side) and for the last tool
//     scrolled down past its spot (the way out), and for a tool that would not fit.
// Every "keeps still" test aims the wheel so the page rests a fixed distance from a spot, waits
// out the whole settle window, and reads the page again; each one's sibling (the "control")
// makes the same move where the settle is allowed, so a keep-still reading cannot be one that
// the settle would also have passed.
const SETTLE_IDLE_MS = 150
const SETTLE_WINDOW_MS = 900

// The scrollY a tool lands on: centred from 1200, 60px below the top (the 44px names row
// and a 16px gap) under it.
const spotY = (page, i, wide) => page.locator(`#ht-s-${i}`).evaluate((el, isWide) => {
  const r = el.getBoundingClientRect()
  return isWide ? r.top + window.scrollY - (window.innerHeight - r.height) / 2 : r.top + window.scrollY - 60
}, wide)
const scrollNow = (page) => page.evaluate(() => window.scrollY)

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test.describe(`home try settle at ${width}`, () => {
    test.use({ viewport: { width, height } })
    const wide = width >= 1200

    // Open the home page on tool i, landed by its name and at rest.
    async function arrive(page, i) {
      watch(page, PERSONA)
      await go(page, '/')
      await homeSectionsLoaded(page)
      await openTool(page, i)
      await expect.poll(async () => Math.abs((await spotY(page, i, wide)) - (await scrollNow(page))), { message: `a name click lands tool ${i}`, timeout: 8000 }).toBeLessThan(4)
      // The name click's own scroll leaves a 150ms idle timer behind; a wheel that arrived before it
      // fired would join the click's gesture (which began elsewhere) instead of being a gesture of its own.
      await page.waitForTimeout(SETTLE_IDLE_MS + 150)
      await restingScrollY(page, `the page on tool ${i}`)
    }
    // One wheel gesture that carries the page to rest `short` px before tool i's spot (negative:
    // past it); returns where it rested, which must be where it was aimed.
    async function aim(page, i, short) {
      const target = Math.round((await spotY(page, i, wide)) - short)
      const y = await wheelToRest(page, target - (await scrollNow(page)), `the page on its way to ${short}px short of tool ${i}`)
      expect(Math.abs(y - target), 'the wheel left the page where this test aimed it').toBeLessThan(4)
      return y
    }
    async function stays(page, y, what) {
      await page.waitForTimeout(SETTLE_WINDOW_MS)
      const after = await restingScrollY(page, what)
      expect(Math.abs(after - y), `${what}: the page moved ${Math.round(after - y)}px after the wheel stopped`).toBeLessThan(2)
    }
    async function settlesOnto(page, i) {
      await expect.poll(async () => Math.abs((await spotY(page, i, wide)) - (await scrollNow(page))), { message: `the page eases onto tool ${i}`, timeout: 8000 }).toBeLessThan(4)
    }

    test('control: a scroll that ends within reach of another tool eases onto it', async ({ page }) => {
      await arrive(page, 0)
      await aim(page, 1, 50)
      // Mutation: delete the settle effect in HomeTry.jsx -> the page stays 50px short.
      await settlesOnto(page, 1)
    })

    for (const dy of [60, -60]) {
      test(`leaving a tool by a ${Math.abs(dy)}px scroll ${dy > 0 ? 'down' : 'up'} does not pull the page back to it`, async ({ page }) => {
        await arrive(page, 1)
        const from = await scrollNow(page)
        const y = await wheelToRest(page, dy, 'the page after the nudge')
        expect(Math.abs(y - (from + dy)), 'the wheel left the page where this test aimed it').toBeLessThan(4)
        // Mutation: drop `at === from` from settle() in HomeTry.jsx -> the page eases back the 60px.
        await stays(page, y, 'a modest scroll away from a tool')
      })
    }

    test('a scroll that ends beyond reach of the tool it arrived at is left where it is', async ({ page }) => {
      await arrive(page, 0)
      const y = await aim(page, 1, 120)
      // Mutation: raise SETTLE_REACH_PX (or drop the reach test) in HomeTry.jsx -> the page eases the 120px.
      await stays(page, y, 'a scroll that stops beyond reach')
    })

    if (!wide) {
      test('a tool taller than the window below the names row is never settled onto', async ({ page }) => {
        await arrive(page, 1)
        const taller = await page.locator('#ht-s-2').evaluate((el) => el.getBoundingClientRect().height - (window.innerHeight - 60))
        expect(taller, 'tool 2 must still be too tall for this window, or this test proves nothing').toBeGreaterThan(0)
        const y = await aim(page, 2, 50)
        // Mutation: drop the fit check in settle() in HomeTry.jsx -> the page eases onto tool 2.
        await stays(page, y, 'a tool that would not fit')
      })
    }

    for (const withClick of [true, false]) {
      test(withClick
        ? 'a name click still on its way keeps the settle off'
        : 'control: the same scroll with no name click is settled', async ({ page }) => {
        await arrive(page, 0)
        // Park 130px short of tool 1 (beyond reach, so nothing settles), then click its name and,
        // before the click's own scroll has landed, wheel to 30px short of it.
        await aim(page, 1, 130)
        // An in-page click: a pointer click would first scroll the page to bring the name into view.
        if (withClick) await page.locator('#ht-n-1').evaluate((el) => el.click())
        const target = Math.round((await spotY(page, 1, wide)) - 30)
        const at = await wheelToRest(page, target - (await scrollNow(page)), 'the page after the wheel')
        const off = Math.abs((await spotY(page, 1, wide)) - at)
        expect(off, 'the wheel must leave the page within reach of tool 1 but off its spot').toBeGreaterThan(2)
        expect(off, 'the wheel must leave the page within reach of tool 1 but off its spot').toBeLessThan(75)
        if (withClick) {
          // Mutation: drop `dest.current ||` from settle() in HomeTry.jsx -> the page eases onto tool 1.
          await stays(page, at, 'a scroll made while a name click is on its way')
        } else {
          await settlesOnto(page, 1)
        }
      })
    }

    test('the first tool scrolled up past its spot is not pulled back down', async ({ page }) => {
      await arrive(page, 1)
      const y = await aim(page, 0, 40)
      // Mutation: drop `at === 0 && delta > 0` from settle() in HomeTry.jsx -> the page eases down 40px.
      await stays(page, y, 'the first tool, nearer the heading than its spot')
    })

    test('control: the first tool scrolled past its spot on the other side is settled', async ({ page }) => {
      await arrive(page, 1)
      await aim(page, 0, -40)
      await settlesOnto(page, 0)
    })

    test('the last tool scrolled down past its spot is not pulled back up', async ({ page }) => {
      await arrive(page, 2)
      const y = await aim(page, 3, -40)
      // Mutation: drop `at === els.length - 1 && delta < 0 && dir > 0` from settle() -> the page eases up 40px, against the exit.
      await stays(page, y, 'the last tool, scrolled on towards the exit')
    })

    test('control: the last tool reached from above and short of its spot is settled', async ({ page }) => {
      await arrive(page, 2)
      await aim(page, 3, 40)
      await settlesOnto(page, 3)
    })

    test('a mouse button held keeps the settle off, and letting go lets it run', async ({ page }) => {
      await arrive(page, 0)
      await page.mouse.move(2, Math.round(height / 2))
      await page.mouse.down()
      const y = await aim(page, 1, 50)
      // Mutation: drop `held ||` (or the pointerdown listener) in HomeTry.jsx -> the page settles under the held button.
      await stays(page, y, 'a scroll made with a mouse button held')
      await page.mouse.up()
      await settlesOnto(page, 1)
    })

    test('turning reduced motion on while the page is open keeps the settle off', async ({ page }) => {
      await arrive(page, 0)
      expect(await page.evaluate(() => document.documentElement.classList.contains('lenis')), 'the smooth scroll is still running, so only the settle can be the one to hold back').toBe(true)
      await page.evaluate(() => document.documentElement.setAttribute('data-reduced-motion', 'true'))
      const y = await aim(page, 1, 50)
      // Mutation: drop `|| prefersReducedMotion()` from settle() in HomeTry.jsx -> the page settles.
      await stays(page, y, 'a scroll made once reduced motion is on')
    })

    test('leaving the page mid-idle takes the section\'s listeners with it and raises no error', async ({ page }) => {
      await page.addInitScript(() => {
        // Every window listener added from the HomeTry chunk, until it is removed.
        const live = []
        const add = window.addEventListener.bind(window)
        const remove = window.removeEventListener.bind(window)
        window.addEventListener = (type, fn, opts) => {
          if (/HomeTry-/.test(new Error().stack || '')) live.push({ type, fn })
          return add(type, fn, opts)
        }
        window.removeEventListener = (type, fn, opts) => {
          const at = live.findIndex((l) => l.type === type && l.fn === fn)
          if (at >= 0) live.splice(at, 1)
          return remove(type, fn, opts)
        }
        window.__homeTryListeners = () => live.map((l) => l.type)
      })
      await arrive(page, 1)
      const settleTypes = ['scroll', 'pointerdown', 'pointerup', 'pointercancel', 'pointermove', 'touchstart', 'touchend', 'touchcancel', 'blur']
      const mine = () => page.evaluate((types) => window.__homeTryListeners().filter((t) => types.includes(t)), settleTypes)
      expect((await mine()).sort(), 'the section registers its nine listeners on the window').toEqual([...settleTypes].sort())
      // A scroll arms the 150ms idle timer; leave before it fires.
      await page.mouse.wheel(0, 60)
      await page.evaluate(() => {
        window.history.pushState({}, '', '/plans')
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }))
      })
      await expect(page.locator('#try')).toHaveCount(0)
      await page.waitForTimeout(500)
      // Mutation: drop the removeEventListener calls from the effect's cleanup in HomeTry.jsx -> the nine stay.
      expect(await mine(), 'the section took its listeners down when it left').toEqual([])
    })
  })
}

// The same settle with the OS asking for reduced motion: the smooth scroll is never started, the
// page scrolls natively, and nothing moves it after the wheel stops.
test.describe('home try settle with reduced motion asked for by the system', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('the page is left where the wheel stopped, within reach of a tool or not', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await homeSectionsLoaded(page)
    expect(await page.evaluate(() => document.documentElement.classList.contains('lenis')), 'no smooth scroll under reduced motion').toBe(false)
    await openTool(page, 0)
    const before = await restingScrollY(page, 'the page on tool 0')
    const target = Math.round((await spotY(page, 1, true)) - 50)
    const y = await wheelToRest(page, target - before, 'the page after the wheel')
    expect(Math.abs(y - target), 'the wheel left the page where this test aimed it').toBeLessThan(4)
    await page.waitForTimeout(SETTLE_WINDOW_MS)
    expect(Math.abs((await restingScrollY(page, 'the page later')) - y)).toBeLessThan(2)
  })
})

test.describe('home converter tabs', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  // [tab, mode id in the link, text its spec line carries at the start]
  const TABS = [
    ['Animation', 'animation', /GIF · 6 frames · 200 ms each · 1\.2 s/],
    ['Video', 'video', /0:08 to 0:08/],
    ['Extract frames', 'frames', /4 frames, one every 2 s, as PNG/],
  ]

  test('Image keeps the bare link and the three other tabs each carry their mode', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await homeSectionsLoaded(page)
    await openTool(page, 3)
    const link = page.locator('#ht-s-3 .ht-go')
    // Mutation: add ?mode=image to the Image link -> the bare-URL check fails.
    await expect(link).toHaveAttribute('href', '/create/file-converter')
    for (const [tab, id] of TABS) {
      await page.locator('#ht-s-3').getByRole('tab', { name: tab }).click()
      await expect(link, `${tab} tab link`).toHaveAttribute('href', `/create/file-converter?mode=${id}`)
    }
    await page.locator('#ht-s-3').getByRole('tab', { name: 'Image' }).click()
    await expect(link).toHaveAttribute('href', '/create/file-converter')
  })

  test('each tab draws its own preview in place of the Image card', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await homeSectionsLoaded(page)
    await openTool(page, 3)
    const stage = page.locator('#ht-s-3')
    await expect(stage.locator('.ht-cv-card')).toBeVisible()
    for (const [tab, , spec] of TABS) {
      await stage.getByRole('tab', { name: tab }).click()
      await expect(stage.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')
      await expect(stage.locator('.ht-cv-card'), `${tab} replaces the Image card`).toHaveCount(0)
      await expect(stage.locator('.ht-cv-scr')).toBeVisible()
      await expect(stage.locator('.ht-cv-spec')).toHaveText(spec)
    }
    await stage.getByRole('tab', { name: 'Image' }).click()
    await expect(stage.locator('.ht-cv-card')).toBeVisible()
    await expect(stage.locator('.ht-cv-scr')).toHaveCount(0)
  })

  test('a setting on the Animation, Video and Frames previews changes what the preview says', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await homeSectionsLoaded(page)
    await openTool(page, 3)
    const stage = page.locator('#ht-s-3')
    const set = stage.locator('.ht-cv-set')
    const spec = stage.locator('.ht-cv-spec')

    await stage.getByRole('tab', { name: 'Animation' }).click()
    await set.getByRole('radio', { name: '500 ms' }).click()
    await expect(spec).toHaveText('GIF · 6 frames · 500 ms each · 3.0 s')

    await stage.getByRole('tab', { name: 'Video' }).click()
    await set.getByRole('radio', { name: '2×' }).click()
    await set.getByRole('radio', { name: 'On' }).click()
    await set.getByRole('radio', { name: '16:9' }).click()
    await expect(spec).toHaveText('0:08 to 0:04, crop 16:9, reversed')

    await stage.getByRole('tab', { name: 'Extract frames' }).click()
    await set.getByRole('radio', { name: '1 s' }).click()
    await set.getByRole('radio', { name: 'WebP' }).click()
    await expect(spec).toHaveText('8 frames, one every 1 s, as WebP')
    await expect(stage.locator('.ht-cv-grid li')).toHaveCount(8)
  })
})

test.describe('home converter tabs on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the Video tab swaps the card for its preview and its link carries the mode', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/')
    await homeSectionsLoaded(page)
    await openTool(page, 3)
    const stage = page.locator('#ht-s-3')
    await stage.getByRole('tab').filter({ hasText: /^Video$/ }).click()
    await expect(stage.locator('.ht-cv-scr')).toBeVisible()
    await expect(stage.locator('.ht-cv-card')).toHaveCount(0)
    await expect(stage.locator('.ht-go')).toHaveAttribute('href', '/create/file-converter?mode=video')
  })

  // The spec line can wrap, so it keeps room for two lines and the preview above it never
  // moves as the tab or setting changes; and it never runs out of the card.
  for (const width of [390, 320]) {
    test(`the spec line keeps two lines of room, stays inside the card and holds the preview still at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      watch(page, PERSONA)
      await go(page, '/')
      await homeSectionsLoaded(page)
      await openTool(page, 3)
      const stage = page.locator('#ht-s-3')
      const seen = []
      // By position, as a narrow window may show a tab's short name: Image, Animation, Video, Extract frames.
      for (const at of [1, 2, 3]) {
        await stage.getByRole('tab').nth(at).click()
        await expect(stage.getByRole('tab').nth(at)).toHaveAttribute('aria-selected', 'true')
        seen.push(await page.evaluate(() => {
          const el = document.querySelector('#ht-s-3 .ht-cv-spec')
          const spec = el.getBoundingClientRect()
          const card = document.querySelector('#ht-s-3').getBoundingClientRect()
          // The preview's distance below the stage's top, so a scroll of the page cannot move it.
          const screenTop = document.querySelector('#ht-s-3 .ht-cv-scr').getBoundingClientRect().top - card.top
          return { tab: el.textContent, height: Math.round(spec.height), right: Math.round(spec.right), cardRight: Math.round(card.right), overflow: el.scrollWidth - el.clientWidth, screenTop: Math.round(screenTop) }
        }))
      }
      // Mutation: drop the @container (max-width: 339px) min-height rule in home-try.css -> a one-line spec is 16px high.
      for (const s of seen) expect(s.height, `"${s.tab}" has room for two lines`).toBeGreaterThanOrEqual(32)
      for (const s of seen) expect(s.right, `"${s.tab}" stays inside the card`).toBeLessThanOrEqual(s.cardRight)
      // Mutation: drop overflow-wrap: anywhere from .ht-cv-spec in home-try.css -> a long unbroken run pushes out sideways.
      for (const s of seen) expect(s.overflow, `"${s.tab}" does not scroll sideways`).toBeLessThanOrEqual(0)
      expect(new Set(seen.map((s) => s.screenTop)).size, 'the preview does not move between tabs').toBe(1)
    })
  }
})
