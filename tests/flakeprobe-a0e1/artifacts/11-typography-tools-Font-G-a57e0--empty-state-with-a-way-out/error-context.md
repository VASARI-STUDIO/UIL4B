# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 11-typography-tools.spec.js >> Font Gallery >> a search that matches nothing shows a real empty state with a way out
- Location: tests\user-sim\11-typography-tools.spec.js:412:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Search font families')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - status [ref=e4]: Loading UIL4B
  - generic [ref=e7]: UIL4B
```

# Test source

```ts
  316 |   // The founder asked three times for "real world examples not the same UI
  317 |   // examples for each one". These two tests are the browser half of that: the
  318 |   // unit suite proves the RULES, this proves a real reader actually sees
  319 |   // different examples for different typefaces, in the app, on the catalogue
  320 |   // this runner really has.
  321 |   //
  322 |   // NOTE WHICH CATALOGUE THAT IS. Per the note at the top of this file, the
  323 |   // sandboxed runner blocks googleapis.com and `vite preview` does not serve
  324 |   // /api/fonts, so these run on the DEGRADED (category-only) path unless a test
  325 |   // routes its own. That is the weaker of the two paths and the right one to
  326 |   // pin here: if the examples still differ per family with classifications and
  327 |   // stroke ABSENT, they differ everywhere.
  328 |   test('two different typefaces get two different sets of examples', async ({ page }) => {
  329 |     watch(page, 'designer asking what each of these faces is actually for')
  330 |     await page.route('**/api/fonts', route => route.fulfill({ json: {
  331 |       fonts: [
  332 |         { family: 'Lora', category: 'serif', variants: [400, 500, 700], subsets: ['latin'], popularity: 0 },
  333 |         { family: 'Rubik', category: 'sans-serif', variants: [400, 500, 700], subsets: ['latin'], popularity: 1 },
  334 |         { family: 'Yesteryear', category: 'handwriting', variants: [400], subsets: ['latin'], popularity: 2 },
  335 |       ],
  336 |     } }))
  337 | 
  338 |     const scenesFor = async (family) => {
  339 |       await page.getByLabel('Search font families').fill(family)
  340 |       await expect(page.locator('.fg-card')).toHaveCount(1)
  341 |       await page.locator('.fg-card-open').first().click()
  342 |       const dialog = page.getByRole('dialog')
  343 |       await expect(dialog).toBeVisible()
  344 |       await dialog.getByRole('tab', { name: 'Examples' }).click()
  345 |       await expect(dialog.locator('.fdx-ex').first()).toBeVisible()
  346 |       const scenes = await dialog.locator('.fdx-ex').evaluateAll(
  347 |         els => els.map(el => el.dataset.scene))
  348 |       await page.keyboard.press('Escape')
  349 |       await expect(dialog).toBeHidden()
  350 |       return scenes
  351 |     }
  352 | 
  353 |     await go(page, '/create/font-gallery')
  354 | 
  355 |     const serif = await scenesFor('Lora')
  356 |     const sans = await scenesFor('Rubik')
  357 |     const script = await scenesFor('Yesteryear')
  358 | 
  359 |     // THE ASSERTION THE FOUNDER'S REPORT REDUCES TO: not one fixed set.
  360 |     expect(new Set([serif.join(), sans.join(), script.join()]).size,
  361 |       `three kinds of face must not share one set of examples — got serif=${serif}, sans=${sans}, script=${script}`)
  362 |       .toBe(3)
  363 | 
  364 |     // And each set is the right one for that kind of face, not merely different.
  365 |     expect(serif, 'a text serif is shown long-form reading').toContain('column')
  366 |     expect(sans, 'a grotesque is shown interface work').toContain('ui')
  367 |     expect(script, 'a script is shown what scripts are for').toContain('signature')
  368 |     expect(sans, 'a grotesque is not handed an editorial column').not.toContain('column')
  369 |     expect(script, 'a script is not handed interface chrome').not.toContain('ui')
  370 | 
  371 |     // CAPABILITY IS NOT FAKED. Yesteryear ships ONE weight, so it gets no
  372 |     // ladder; Lora ships three, so it does. A ladder on a single-cut family
  373 |     // would be four rows of the same file labelled as four different weights.
  374 |     expect(script, 'a single-weight family gets no weight ladder').not.toContain('ladder')
  375 |     expect(serif, 'a three-weight family earns one').toContain('ladder')
  376 |   })
  377 | 
  378 |   test('the fonts-in-use link is offered as a search, not as a promise', async ({ page }) => {
  379 |     watch(page, 'designer looking for this face in the wild')
  380 |     await go(page, '/create/font-gallery')
  381 | 
  382 |     await page.getByLabel('Search font families').fill('Lora')
  383 |     await page.locator('.fg-card-open').first().click()
  384 |     const dialog = page.getByRole('dialog')
  385 |     await dialog.getByRole('tab', { name: 'Examples' }).click()
  386 | 
  387 |     const link = dialog.locator('.fdx-fiu')
  388 |     await expect(link).toBeVisible()
  389 | 
  390 |     // WORDED AS A SEARCH. fontsinuse.com has no derivable per-typeface URL, so
  391 |     // this can only ever be a query — and a query can come back empty. Verified
  392 |     // 2026-09-04 at their Crawl-delay of 10: "Chokokutai" returns HTTP 200
  393 |     // reading "No Uses found", with 47 unrelated popular uses still on the page.
  394 |     // "See Lora in use" would promise a result set we cannot guarantee, and the
  395 |     // miss case does not even look like a miss.
  396 |     await expect(link).toContainText('search fontsinuse.com for Lora')
  397 |     await expect(link).not.toContainText(/\bin use\b/)
  398 |     await expect(link).toHaveAttribute('href', 'https://fontsinuse.com/search?terms=Lora')
  399 |     // `terms`, not `q`: ?q= returns a plausible 200 that is the empty-query page.
  400 |     await expect(link).not.toHaveAttribute('href', /[?&]q=/)
  401 | 
  402 |     // The project's full third-party convention.
  403 |     await expect(link).toHaveAttribute('target', '_blank')
  404 |     await expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow')
  405 |     await expect(link.locator('.sr-only')).toHaveText('(opens in a new tab)')
  406 | 
  407 |     // And the panel says the miss case out loud rather than letting a reader
  408 |     // discover it by clicking.
  409 |     await expect(dialog.locator('.fdx-fiu-note')).toContainText('may return nothing')
  410 |   })
  411 | 
  412 |   test('a search that matches nothing shows a real empty state with a way out', async ({ page }) => {
  413 |     watch(page, 'designer searching for a font that is not there')
  414 |     await go(page, '/create/font-gallery')
  415 | 
> 416 |     await page.getByLabel('Search font families').fill('zzzzzznotafont')
      |                                                   ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  417 |     await expect(page.locator('.fg-empty')).toBeVisible()
  418 |     await expect(page.locator('.fg-card')).toHaveCount(0)
  419 |     await page.getByRole('button', { name: 'Clear filters' }).click()
  420 |     await expect(page.locator('.fg-card').first()).toBeVisible()
  421 |   })
  422 | 
  423 |   test('the specimen dialog fits the viewport and keeps its actions reachable', async ({ page }) => {
  424 |     // The defect this replaces: 1,763px of dialog in a 900px viewport, scrolling
  425 |     // the OVERLAY, so every action it offers — Find a pairing, Copy import URL,
  426 |     // Add to comparison — was below the fold the moment it opened.
  427 |     watch(page, 'designer deciding whether to use this family')
  428 |     await page.route('**/api/fonts', route => route.fulfill({ json: { fonts: [{
  429 |       family: 'Lora', category: 'serif', variants: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  430 |       subsets: ['latin', 'latin-ext', 'cyrillic'], popularity: 0,
  431 |     }] } }))
  432 | 
  433 |     await go(page, '/create/font-gallery')
  434 |     await page.locator('.fg-card-open').first().click()
  435 | 
  436 |     const dialog = page.getByRole('dialog')
  437 |     await expect(dialog).toBeVisible()
  438 | 
  439 |     const viewport = page.viewportSize().height
  440 |     const box = await dialog.boundingBox()
  441 |     expect(box.height, 'the dialog fits the screen it opened on').toBeLessThanOrEqual(viewport)
  442 | 
  443 |     // Every action is on screen WITHOUT scrolling anything.
  444 |     for (const name of [/Find a pairing/, /Build a type scale/, /Add to comparison/, /Copy import URL/]) {
  445 |       const action = dialog.getByRole('button', { name })
  446 |       await expect(action).toBeVisible()
  447 |       const ab = await action.boundingBox()
  448 |       expect(ab.bottom ?? ab.y + ab.height, `${name} is inside the viewport`).toBeLessThanOrEqual(viewport + 1)
  449 |       expect(ab.y, `${name} is inside the viewport`).toBeGreaterThanOrEqual(0)
  450 |     }
  451 | 
  452 |     // The body is what scrolls, not the overlay behind it.
  453 |     const overflows = await dialog.locator('.fg-detail-body').evaluate(
  454 |       (el) => el.scrollHeight > el.clientHeight,
  455 |     )
  456 |     expect(overflows, 'a nine-weight family overflows the BODY, which is the scrolling part').toBe(true)
  457 |   })
  458 | 
  459 |   test('the specimen dialog shows every real weight as words, and the scripts it covers', async ({ page }) => {
  460 |     // Replaces two sections that told the reader nothing: six "Ag" tiles, and a
  461 |     // "Type scale" block that printed one sentence six times, five of them
  462 |     // ellipsised. Also replaces the "1 subset" tag with the script names.
  463 |     watch(page, 'designer checking a family has the cuts and the scripts they need')
  464 |     await page.route('**/api/fonts', route => route.fulfill({ json: { fonts: [{
  465 |       family: 'Lora', category: 'serif', variants: [400, 600, 700],
  466 |       subsets: ['latin', 'latin-ext', 'cyrillic'], popularity: 0,
  467 |     }] } }))
  468 | 
  469 |     await go(page, '/create/font-gallery')
  470 |     await page.getByLabel('Preview text').fill('Handgloves')
  471 |     await page.locator('.fg-card-open').first().click()
  472 | 
  473 |     const dialog = page.getByRole('dialog')
  474 |     await expect(dialog).toBeVisible()
  475 | 
  476 |     // One line per cut the family actually ships — no more, no fewer.
  477 |     const rows = dialog.locator('.fg-weight-row')
  478 |     await expect(rows).toHaveCount(3)
  479 |     await expect(dialog.locator('.fg-weight-tag')).toHaveText([
  480 |       '400 Regular', '600 SemiBold', '700 Bold',
  481 |     ])
  482 | 
  483 |     // Each line is drawn in its own cut, and set in the reader's own words —
  484 |     // which the dialog inherited rather than discarding when it opened.
  485 |     const lines = await dialog.locator('.fg-weight-line').evaluateAll(
  486 |       (nodes) => nodes.map((n) => `${n.textContent}:${getComputedStyle(n).fontWeight}`),
  487 |     )
  488 |     expect(lines).toEqual(['Handgloves:400', 'Handgloves:600', 'Handgloves:700'])
  489 | 
  490 |     // Scripts stated, not counted.
  491 |     await expect(dialog.locator('.fg-tag--scripts')).toHaveText('Latin, Latin Extended, Cyrillic')
  492 |     await expect(dialog.getByText('1 subset')).toHaveCount(0)
  493 | 
  494 |     // Editing the words in the dialog re-sets every cut at once.
  495 |     await dialog.getByLabel('Preview text').fill('Ampersand')
  496 |     await expect(dialog.locator('.fg-weight-line').first()).toHaveText('Ampersand')
  497 |     await expect(dialog.locator('.fg-weight-line').last()).toHaveText('Ampersand')
  498 |   })
  499 | 
  500 |   test('the detail dialog is closable from the keyboard and restores focus', async ({ page }) => {
  501 |     watch(page, 'keyboard-only visitor')
  502 |     await go(page, '/create/font-gallery')
  503 | 
  504 |     const card = page.locator('.fg-card-open').first()
  505 |     await card.click()
  506 |     await expect(page.getByRole('dialog')).toBeVisible()
  507 | 
  508 |     await page.keyboard.press('Escape')
  509 |     await expect(page.getByRole('dialog')).toHaveCount(0)
  510 |     await expect(card).toBeFocused()
  511 |     // Background scroll must be handed back, or the page is left unusable.
  512 |     await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
  513 |   })
  514 | 
  515 |   test('rows reserve their metrics so the list never reflows as faces load', async ({ page }) => {
  516 |     watch(page, 'designer on a slow connection')
```