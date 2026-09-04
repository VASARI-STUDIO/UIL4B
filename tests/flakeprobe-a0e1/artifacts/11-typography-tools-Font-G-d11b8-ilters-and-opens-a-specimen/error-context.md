# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 11-typography-tools.spec.js >> Font Gallery >> a designer browses, filters and opens a specimen
- Location: tests\user-sim\11-typography-tools.spec.js:251:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Font Gallery', level: 1 })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Font Gallery', level: 1 })

```

```yaml
- status: Loading UIL4B
```

# Test source

```ts
  155 | 
  156 |   test('extreme 40px, ratio 3, nine-step tokens stay exact while the preview is fitted', async ({ page }) => {
  157 |     watch(page, 'designer stress-testing an extreme modular scale')
  158 |     await go(page, '/create/type-scale')
  159 | 
  160 |     await page.getByLabel('Scale ratio').selectOption('custom')
  161 |     await page.locator('#tsc-custom + .snapv-value').click()
  162 |     await page.getByRole('spinbutton', { name: /Custom scale ratio/ }).fill('3')
  163 |     await page.getByRole('spinbutton', { name: /Custom scale ratio/ }).press('Enter')
  164 |     await page.locator('#tsc-base + .snapv-value').click()
  165 |     await page.getByRole('spinbutton', { name: /Base font size/ }).fill('40')
  166 |     await page.getByRole('spinbutton', { name: /Base font size/ }).press('Enter')
  167 |     await page.getByLabel('Number of steps above the base size').fill('9')
  168 | 
  169 |     await expect(page.locator('.tsc-row').first().locator('.tsc-row-num')).toContainText('787320px')
  170 |     await expect(page.locator('.tsc-fit-note')).toContainText('Labels and exports retain the exact scale')
  171 |     const rendered = parseFloat(await page.locator('.tsc-row-text').first().evaluate(
  172 |       element => getComputedStyle(element).fontSize,
  173 |     ))
  174 |     expect(rendered).toBeLessThanOrEqual(96)
  175 |     expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(10000)
  176 | 
  177 |     // The exact figure survives into the export. It is now the DESKTOP end of a
  178 |     // clamp rather than a lone rem — the extreme value is still carried
  179 |     // losslessly, which is what this test exists to prove, and the comment
  180 |     // still names it in pixels.
  181 |     await page.getByRole('tab', { name: 'Developer handoff' }).click()
  182 |     await expect(page.locator('#tsc-export')).toContainText('787320px')
  183 |     await expect(page.locator('#tsc-export')).toContainText('--text-8xl: clamp(')
  184 |   })
  185 | })
  186 | 
  187 | test.describe('Font Pair', () => {
  188 |   test('a designer gets reasoned body suggestions and a live specimen', async ({ page }) => {
  189 |     watch(page, 'designer choosing a font pairing')
  190 |     await go(page, '/create/font-pair')
  191 | 
  192 |     await expect(page.getByRole('heading', { level: 1, name: 'Font Pair' })).toBeVisible()
  193 |     await expect(page.locator('.fpr-specimen')).toBeVisible()
  194 |     await expect(page.getByRole('link', { name: /Browse the Font Gallery/ })).toHaveAttribute('href', '/create/font-gallery')
  195 |     await expect(page.getByRole('link', { name: /Select from the Font Gallery/ })).toHaveAttribute('href', '/create/font-gallery')
  196 | 
  197 |     const cards = page.locator('.fpr-card')
  198 |     await expect(cards).toHaveCount(6)
  199 |     // Every suggestion states WHY it is here — that is the whole point of the tool.
  200 |     for (const reason of await cards.locator('.fpr-card-reason').allInnerTexts()) {
  201 |       expect(reason.trim().length).toBeGreaterThan(20)
  202 |     }
  203 | 
  204 |     // Applying a pair marks it in use and swaps the body family everywhere.
  205 |     const first = cards.first()
  206 |     const chosen = (await first.locator('.fpr-card-name').innerText()).split('\n')[0].trim()
  207 |     await first.getByRole('button', { name: 'Use this pair' }).click()
  208 |     await expect(first.getByRole('button', { name: 'In use' })).toBeVisible()
  209 |     await expect(page.locator('.fpr-status')).toContainText(chosen)
  210 |   })
  211 | 
  212 |   test('the specimen re-lays out and honours custom preview text', async ({ page }) => {
  213 |     watch(page, 'designer testing brand words')
  214 |     await go(page, '/create/font-pair')
  215 | 
  216 |     await page.getByRole('button', { name: 'Product page' }).click()
  217 |     await expect(page.locator('.fpr-product')).toBeVisible()
  218 |     await page.getByRole('button', { name: 'Specimen' }).click()
  219 |     await expect(page.locator('.fpr-specimen-raw')).toBeVisible()
  220 |     await page.getByRole('button', { name: 'Article' }).click()
  221 | 
  222 |     await page.getByLabel('Preview text').fill('Ship interfaces that hold up')
  223 |     await expect(page.locator('.fpr-h1')).toHaveText('Ship interfaces that hold up')
  224 |   })
  225 | 
  226 |   test('a developer copies one import and one block of CSS', async ({ page }) => {
  227 |     watch(page, 'front-end developer wiring up two families')
  228 |     await go(page, '/create/font-pair')
  229 | 
  230 |     const code = page.locator('#fpr-export')
  231 |     await expect(code).toContainText('@import url(')
  232 |     await expect(code).toContainText('--font-heading:')
  233 |     await expect(code).toContainText('--font-body:')
  234 |     await expect(code).toContainText('font-family: var(--font-heading);')
  235 |     await expect(page.getByRole('button', { name: 'Copy font import' })).toBeVisible()
  236 |     await expect(page.getByRole('button', { name: 'Copy CSS' })).toBeVisible()
  237 |   })
  238 | })
  239 | 
  240 | test.describe('Font Gallery', () => {
  241 |   const loraCatalog = {
  242 |     fonts: [{
  243 |       family: 'Lora',
  244 |       category: 'serif',
  245 |       variants: [400, 700],
  246 |       subsets: ['latin'],
  247 |       popularity: 0,
  248 |     }],
  249 |   }
  250 | 
  251 |   test('a designer browses, filters and opens a specimen', async ({ page }) => {
  252 |     watch(page, 'designer looking for a typeface')
  253 |     await go(page, '/create/font-gallery')
  254 | 
> 255 |     await expect(page.getByRole('heading', { level: 1, name: 'Font Gallery' })).toBeVisible()
      |                                                                                 ^ Error: expect(locator).toBeVisible() failed
  256 |     await expect(page.locator('.fg-card')).toHaveCount(24)
  257 | 
  258 |     await page.getByLabel('Preview text').fill('Make the words the interface')
  259 |     await expect(page.getByLabel('Preview text')).toHaveValue('Make the words the interface')
  260 |     // ONE SPECIMEN PER ROW, AT EVERY WIDTH.
  261 |     //
  262 |     // This assertion has now been turned twice, and both turns were founder
  263 |     // decisions rather than tests relaxed to go green. It first pinned a
  264 |     // full-width list; then a grid, on the direction that the typography tools
  265 |     // browse like the gradient and palette libraries; and now a list again, on
  266 |     // the direction of 2026-09-02 — "1 font per row and 1 column".
  267 |     //
  268 |     // What is NOT the same as the first version is what a row now contains, and
  269 |     // that is the part worth pinning. The audit that produced the grid was
  270 |     // complaining about a 790px row holding content composed for 435px, so the
  271 |     // test below asserts the row is full width AND that the specimen actually
  272 |     // spans it, which is the only version of this layout worth having.
  273 |     const cards = page.locator('.fg-card')
  274 |     const first = await cards.nth(0).boundingBox()
  275 |     const second = await cards.nth(1).boundingBox()
  276 |     expect(second.y, 'the second typeface sits under the first, not beside it')
  277 |       .toBeGreaterThan(first.y + first.height - 2)
  278 |     expect(Math.abs(second.x - first.x), 'every row starts at the same left edge').toBeLessThan(2)
  279 | 
  280 |     await page.getByRole('button', { name: 'Serif', exact: true }).click()
  281 |     await expect(page.locator('.fg-count')).toContainText('in Serif')
  282 |     const serifCount = await page.locator('.fg-card').count()
  283 |     expect(serifCount).toBeGreaterThan(0)
  284 |     expect(serifCount).toBeLessThan(48)
  285 |     await page.getByRole('button', { name: 'All', exact: true }).click()
  286 | 
  287 |     await page.getByLabel('Search font families').fill('Lora')
  288 |     await expect(page.locator('.fg-card')).toHaveCount(1)
  289 |     await page.locator('.fg-card-open').first().click()
  290 | 
  291 |     const dialog = page.getByRole('dialog')
  292 |     await expect(dialog).toBeVisible()
  293 |     await expect(dialog).toHaveAttribute('aria-modal', 'true')
  294 |     await expect(dialog.getByRole('heading', { name: 'Lora' })).toBeVisible()
  295 |     await expect(dialog.getByText('Character set')).toBeVisible()
  296 |   })
  297 | 
  298 |   test('code, emoji, icon and symbol families never enter the gallery', async ({ page }) => {
  299 |     watch(page, 'designer browsing a text-only type catalogue')
  300 |     await page.route('**/api/fonts', route => route.fulfill({ json: {
  301 |       fonts: [
  302 |         ...loraCatalog.fonts,
  303 |         { family: 'JetBrains Mono', category: 'monospace', variants: [400], subsets: ['latin'] },
  304 |         { family: 'Noto Color Emoji', category: 'sans-serif', variants: [400], subsets: ['emoji'] },
  305 |         { family: 'Material Symbols Rounded', category: 'display', variants: [400], subsets: ['symbols'] },
  306 |         { family: 'Libre Barcode 39', category: 'display', variants: [400], subsets: ['latin'] },
  307 |       ],
  308 |     } }))
  309 | 
  310 |     await go(page, '/create/font-gallery')
  311 |     await expect(page.locator('.fg-card')).toHaveCount(1)
  312 |     await expect(page.locator('.fg-card-name')).toHaveText('Lora')
  313 |     await expect(page.getByRole('button', { name: 'Mono', exact: true })).toHaveCount(0)
  314 |   })
  315 | 
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
```