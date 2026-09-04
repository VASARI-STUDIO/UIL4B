# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 10-home-chaos-to-calm.spec.js >> homepage: eleven tools, five ways of working >> 5–7 · the sticky panel holds and the step sync drives the REAL workbench
- Location: tests\user-sim\10-home-chaos-to-calm.spec.js:514:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.hw-shell')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.hw-shell')

```

```yaml
- status: Loading UIL4B
```

# Test source

```ts
  428 |     await page.locator('.hcmd-input').fill('contrast')
  429 |     await expect(page.locator('.hcmd-row').first()).toBeVisible()
  430 |   })
  431 | 
  432 |   test('6 · reduced motion and ≤768px use the calm static arrangement', async ({ page }) => {
  433 |     await reducedMotion(page)
  434 |     watch(page, PERSONA)
  435 |     await go(page, '/')
  436 | 
  437 |     // Reduced motion never runs the step sync, so nothing may depend on it:
  438 |     // the panel is not sticky, and EVERY step reads at full opacity rather
  439 |     // than sitting at the inactive .4 forever.
  440 |     const view = await page.evaluate(() => ({
  441 |       sticky: getComputedStyle(document.querySelector('.hsteps-sticky')).position,
  442 |       opacities: [...document.querySelectorAll('.hstep')]
  443 |         .map((el) => Number(getComputedStyle(el).opacity)),
  444 |     }))
  445 |     expect(view.sticky).toBe('static')
  446 |     expect(view.opacities).toEqual([1, 1, 1, 1, 1])
  447 | 
  448 |     await page.setViewportSize({ width: 768, height: 900 })
  449 |     await go(page, '/')
  450 |     expect(
  451 |       await page.locator('.hsteps-sticky').evaluate((el) => getComputedStyle(el).position),
  452 |     ).toBe('static')
  453 |     const narrow = await page.locator('.hstep').evaluateAll(
  454 |       (steps) => steps.map((el) => Number(getComputedStyle(el).opacity)),
  455 |     )
  456 |     expect(narrow).toEqual([1, 1, 1, 1, 1])
  457 |     expect(await overflowOf(page)).toBeLessThanOrEqual(1)
  458 |   })
  459 | 
  460 |   test('7 · holds from 320px to 4K with no overflow, collision or clipped label', async ({ page }) => {
  461 |     await reducedMotion(page)
  462 |     watch(page, PERSONA)
  463 | 
  464 |     for (const width of [320, 380, 480, 768, 980, 1440, 3840]) {
  465 |       await page.setViewportSize({ width, height: width < 700 ? 780 : 900 })
  466 |       await go(page, '/')
  467 |       await expect(page.locator('.hw-shell')).toBeVisible()
  468 | 
  469 |       expect(await overflowOf(page), `page overflow at ${width}px`).toBeLessThanOrEqual(1)
  470 | 
  471 |       const report = await page.evaluate(() => {
  472 |         const links = [...document.querySelectorAll('.htool-link')]
  473 |         const clipped = links
  474 |           .filter((a) => a.scrollWidth > a.clientWidth + 1)
  475 |           .map((a) => a.textContent)
  476 |         const boxes = links.map((a) => a.getBoundingClientRect())
  477 |         const collisions = []
  478 |         for (let i = 0; i < boxes.length; i++) {
  479 |           for (let j = i + 1; j < boxes.length; j++) {
  480 |             const a = boxes[i]; const b = boxes[j]
  481 |             const hit = !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)
  482 |             if (hit) collisions.push([i, j])
  483 |           }
  484 |         }
  485 |         // The command bar is the hero's primary control at every width.
  486 |         const cmd = document.querySelector('.hcmd-input')?.getBoundingClientRect()
  487 |         return {
  488 |           clipped,
  489 |           collisions,
  490 |           count: links.length,
  491 |           cmdWidth: cmd ? Math.round(cmd.width) : 0,
  492 |         }
  493 |       })
  494 |       // Every Create tool, live or Soon — the grid never hides a route.
  495 |       expect(report.count, `tool links at ${width}px`).toBe(18)
  496 |       expect(report.clipped, `clipped tool labels at ${width}px`).toEqual([])
  497 |       expect(report.collisions, `tool link collisions at ${width}px`).toEqual([])
  498 |       expect(report.cmdWidth, `command bar unusable at ${width}px`).toBeGreaterThan(120)
  499 | 
  500 |       // Every control in the default panel stays inside the viewport.
  501 |       const reachable = await page.evaluate(() => {
  502 |         const controls = [...document.querySelectorAll('.hw-panel button, .hw-panel a, .hw-panel select, .hw-panel input')]
  503 |         return controls
  504 |           .filter((el) => !el.classList.contains('sr-only'))
  505 |           .every((el) => {
  506 |             const r = el.getBoundingClientRect()
  507 |             return r.left >= -1 && r.right <= document.documentElement.clientWidth + 1
  508 |           })
  509 |       })
  510 |       expect(reachable, `unreachable control at ${width}px`).toBe(true)
  511 |     }
  512 |   })
  513 | 
  514 |   test('5–7 · the sticky panel holds and the step sync drives the REAL workbench', async ({ page }) => {
  515 |     // Motion ON: the sticky column and the scroll sync only exist on this path,
  516 |     // so the reduced-motion sweep above cannot cover them.
  517 |     await page.emulateMedia({ reducedMotion: 'no-preference' })
  518 |     await page.addInitScript(() => {
  519 |       localStorage.setItem('vs-appearance', JSON.stringify({
  520 |         rounding: 'default', density: 'cozy', reducedMotion: false,
  521 |       }))
  522 |     })
  523 |     watch(page, 'motion-enabled product evaluator')
  524 | 
  525 |     for (const width of [1440, 3840]) {
  526 |       await page.setViewportSize({ width, height: 900 })
  527 |       await go(page, '/')
> 528 |       await expect(page.locator('.hw-shell')).toBeVisible()
      |                                               ^ Error: expect(locator).toBeVisible() failed
  529 | 
  530 |       const layout = await page.evaluate(() => {
  531 |         const sticky = document.querySelector('.hsteps-sticky')
  532 |         const rail = document.querySelector('.hsteps-rail')
  533 |         const s = sticky.getBoundingClientRect()
  534 |         const r = rail.getBoundingClientRect()
  535 |         return {
  536 |           position: getComputedStyle(sticky).position,
  537 |           // Two real columns: the panel sits beside the narrative, not under it.
  538 |           sideBySide: s.left >= r.right - 1,
  539 |           panelInside: s.left >= 0 && s.right <= document.documentElement.clientWidth + 1,
  540 |         }
  541 |       })
  542 |       expect(layout.position, `sticky column at ${width}px`).toBe('sticky')
  543 |       expect(layout.sideBySide, `columns collapsed at ${width}px`).toBe(true)
  544 |       expect(layout.panelInside, `the panel left the viewport at ${width}px`).toBe(true)
  545 |       expect(await overflowOf(page)).toBeLessThanOrEqual(1)
  546 | 
  547 |       if (width === 1440) {
  548 |         // The sync moves REAL product state. Scrolling the Typography step into
  549 |         // the band must select the Typography MODE of the live workbench — the
  550 |         // panel body genuinely swaps, which is what the old decorative
  551 |         // convergence only implied.
  552 |         await page.locator('.hstep[data-step="typography"]').scrollIntoViewIfNeeded()
  553 |         await expect.poll(
  554 |           () => page.locator('.hw-tab[data-tab="typography"]').getAttribute('aria-selected'),
  555 |           { timeout: 10000 },
  556 |         ).toBe('true')
  557 |         await expect(page.locator('.hw-type-preview')).toBeVisible()
  558 |         // The active step is the legible one; the rest recede.
  559 |         await expect(page.locator('.hstep[data-step="typography"]')).toHaveAttribute('data-active', 'true')
  560 | 
  561 |         // Scrolling back up walks the modes back rather than sticking.
  562 |         await page.locator('.hstep[data-step="gradient"]').scrollIntoViewIfNeeded()
  563 |         await expect.poll(
  564 |           () => page.locator('.hw-tab[data-tab="gradient"]').getAttribute('aria-selected'),
  565 |           { timeout: 10000 },
  566 |         ).toBe('true')
  567 | 
  568 |         // …and once the visitor drives the tablist themselves, scroll stops
  569 |         // overriding them. A control that keeps changing back is unusable.
  570 |         await page.locator('.hw-tab[data-tab="icon"]').click()
  571 |         await page.locator('.hstep[data-step="typography"]').scrollIntoViewIfNeeded()
  572 |         await page.waitForTimeout(700)
  573 |         await expect(page.locator('.hw-tab[data-tab="icon"]')).toHaveAttribute('aria-selected', 'true')
  574 |       }
  575 |     }
  576 |   })
  577 | 
  578 |   test('the command bar searches the real registry and never invents a route', async ({ page }) => {
  579 |     await reducedMotion(page)
  580 |     watch(page, 'visitor looking for one specific tool')
  581 |     await go(page, '/')
  582 | 
  583 |     const input = page.locator('.hcmd-input')
  584 |     // Empty is empty: no results panel until there is a query.
  585 |     await expect(page.locator('.hcmd-results')).toHaveCount(0)
  586 | 
  587 |     await input.fill('contrast')
  588 |     const rows = page.locator('.hcmd-row')
  589 |     await expect(rows.first()).toBeVisible()
  590 | 
  591 |     // Every row is a real link to a route the router actually has — the mock's
  592 |     // invented /tools/* hrefs must never appear.
  593 |     const hrefs = await rows.evaluateAll((els) => els.map((el) => el.getAttribute('href')))
  594 |     expect(hrefs.length).toBeGreaterThan(0)
  595 |     for (const href of hrefs) {
  596 |       expect(href, 'a fabricated route reached the results panel').toMatch(/^\//)
  597 |       expect(href).not.toContain('/tools/')
  598 |     }
  599 | 
  600 |     // A query with no match says so instead of showing a stale or invented row.
  601 |     await input.fill('zzzznothing')
  602 |     await expect(page.locator('.hcmd-row')).toHaveCount(0)
  603 |     await expect(page.locator('.hcmd-empty')).toContainText('zzzznothing')
  604 | 
  605 |     // This used to click a quick-fill chip. The founder removed the chip row on
  606 |     // 2026-09-03 (asserted in test 1–4), but the property the click was standing
  607 |     // in for — a term the page SUGGESTS is a real query against this same index
  608 |     // — did not go with it. That property moved to the typed placeholder and is
  609 |     // asserted harder below, in "every term the placeholder types is a tool the
  610 |     // bar can actually find", which types whatever it observed on screen rather
  611 |     // than a term this file chose. What is left to check here is the recovery
  612 |     // path: a real query after a miss still resolves.
  613 |     await input.fill('gradient')
  614 |     await expect(input).toHaveValue('gradient')
  615 |     await expect(page.locator('.hcmd-row').first()).toBeVisible()
  616 | 
  617 |     // Enter opens the first hit.
  618 |     const first = await page.locator('.hcmd-row').first().getAttribute('href')
  619 |     await input.press('Enter')
  620 |     await page.waitForURL(`**${first}`)
  621 |   })
  622 | 
  623 |   test('the ⌘K keycap names a shortcut that actually works', async ({ page }) => {
  624 |     // A keycap that does nothing is a decoration that lies. This one focuses
  625 |     // the bar, which is exactly what it claims.
  626 |     await reducedMotion(page)
  627 |     watch(page, 'keyboard-first visitor')
  628 |     await go(page, '/')
```