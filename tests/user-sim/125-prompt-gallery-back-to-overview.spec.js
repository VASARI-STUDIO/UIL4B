// The prompt gallery's list state lives in the URL hash (`#website`, `#all`), so
// the browser's Back button is "back to the overview".
//
// The case worth pinning is a list the visitor SWITCHED INSIDE. View more on the
// Website section pushes `#website`; choosing the UI Components chip then goes to
// `#ui-components`. If the chip switch were a second push, Back would only step from
// `#ui-components` to `#website`: still a list, two presses from the overview, and
// the visitor would have to find "Back to overview" or press Back twice to get
// out of a page they entered with one click. The chip switch REPLACES the entry
// (chooseCategory in PromptLibrary.jsx), so one Back is one step out.
//
// And where they land matters as much as that they do: focus goes to the View
// more button of the section they were just reading, scrolled into view, so
// Back never means "top of the page" and a keyboard user is where they left off.
// A section carries two View more buttons and only one is displayed at a given
// width (top right above 640px, full width at the bottom at 640 and below), so
// the visible one is the one that must hold focus.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

for (const [width, height, where] of [[1440, 900, 'top'], [390, 844, 'bottom']]) {
  test(`Back from a chip-switched list returns to the overview with focus on that section's View more — ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height } })
    const page = await context.newPage()
    watch(page, `a visitor going into a prompt list and back out at ${width}px`)
    await go(page, '/discover/prompts')
    await expect(page.locator('.pl-overview')).toBeVisible()
    expect(new URL(page.url()).hash, 'the overview has no hash').toBe('')

    // Into the Website list with its View more.
    await page.locator(`#pl-shelf-website .pl-viewmore--${where}`).click()
    await expect(page.locator('.pl-gallery')).toBeVisible()
    await expect(page.locator('#pl-results-h')).toHaveText('Website')
    expect(new URL(page.url()).hash).toBe('#website')

    // Switch to another category from inside the list. On a phone the chips are
    // behind the Filters button.
    if (width <= 640) await page.getByRole('button', { name: /^Filters/ }).click()
    await page.getByRole('radio', { name: /^UI Components( \d+ prompts?)?$/ }).click()
    await expect(page.locator('#pl-results-h')).toHaveText('UI Components')
    expect(new URL(page.url()).hash).toBe('#ui-components')

    // One Back is one step out, to the overview.
    await page.goBack()
    await expect(page.locator('.pl-overview'), 'Back from the switched list did not reach the overview').toBeVisible()
    await expect(page.locator('.pl-gallery')).toHaveCount(0)
    expect(new URL(page.url()).hash, 'the overview came back with a list hash').toBe('')

    // Focus is on the visible View more of the section they were just in,
    // which is on screen.
    const viewMore = page.locator(`#pl-shelf-ui-components .pl-viewmore--${where}`)
    await expect(viewMore, 'UI Components has no View more to return to — the test needs a section that does').toBeVisible()
    await expect(viewMore, 'focus did not return to that section\'s View more').toBeFocused()
    await expect(viewMore).toBeInViewport()
    await context.close()
  })
}

// The scroll back has to reach a section a long way down. Right after the list
// swaps for the overview, the scroller still holds the list's (short) page
// height and clamps the target to it, so a lower section stops short of where
// the visitor was. The page re-measures before it scrolls (`lenis.resize()` in
// scrollToElement). Website, the first section, is near the top and would pass
// either way; UI Components and CSS & Visual are among the last on the overview, so
// they are the ones that go red when the re-measure is missing.
for (const [width, height, where] of [[1440, 900, 'top'], [390, 800, 'bottom']]) {
  for (const [slug, heading] of [['css-visual', 'CSS & Visual'], ['ui-components', 'UI Components']]) {
    test(`Back from the ${heading} list scrolls down to that section with focus on its View more — ${width}px`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height } })
      const page = await context.newPage()
      watch(page, `a visitor opening the ${heading} list from the bottom of the overview and coming back at ${width}px`)
      await go(page, '/discover/prompts')
      await expect(page.locator('.pl-overview')).toBeVisible()

      const viewMore = page.locator(`#pl-shelf-${slug} .pl-viewmore--${where}`)
      await expect(viewMore, `${heading} has no View more on the overview; the test needs a section that does`).toBeVisible()
      await viewMore.click()
      await expect(page.locator('.pl-gallery')).toBeVisible()
      await expect(page.locator('#pl-results-h')).toHaveText(heading)
      expect(new URL(page.url()).hash).toBe(`#${slug}`)

      await page.goBack()
      await expect(page.locator('.pl-overview'), 'Back did not reach the overview').toBeVisible()
      await expect(page.locator('.pl-gallery')).toHaveCount(0)
      expect(new URL(page.url()).hash, 'the overview came back with a list hash').toBe('')

      await expect(viewMore, `focus did not return to ${heading}'s View more`).toBeFocused()
      // Down the page, not stranded at the top: the scroller reached the section.
      await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { message: 'the page did not scroll down to the section' }).toBeGreaterThan(height)
      await expect(viewMore, 'the View more is not on screen after Back').toBeInViewport()
      await context.close()
    })
  }
}

// SWITCHING TABS FROM INSIDE A LIST.
//
// A list is a Community view, so the page holds the Community tab while the
// address carries a list hash. Clicking "My Prompts" has to win anyway: the tab
// is chosen first and the router drops the hash a beat later, and if the page
// forced Community on every render that beat would flip the click straight back.
// The click is also what gets remembered; arriving by a shared list link is not.
const TAB_KEY = 'vs-prompt-tab'
const tabButton = (page, name) => page.locator('.pl-tab', { hasText: name })

for (const [hash, label] of [['#all', 'Browse all'], ['#website', 'the Website list']]) {
  test(`My Prompts clicked from ${label} stays on My Prompts, and Community clicked from there returns to the overview`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    watch(page, `a visitor leaving ${label} for My Prompts and back`)
    await go(page, `/discover/prompts${hash}`)
    await expect(page.locator('.pl-gallery')).toBeVisible()
    await expect(tabButton(page, 'Community')).toHaveAttribute('aria-pressed', 'true')

    await tabButton(page, 'My Prompts').click()
    await expect(tabButton(page, 'My Prompts')).toHaveAttribute('aria-pressed', 'true')
    expect(new URL(page.url()).hash, 'My Prompts has no list hash').toBe('')
    // Give the router's later hash change time to arrive, then look again: the
    // bug is a flip back to Community AFTER the first correct frame.
    await page.waitForTimeout(400)
    await expect(tabButton(page, 'My Prompts'), 'the tab flipped back to Community').toHaveAttribute('aria-pressed', 'true')
    await expect(tabButton(page, 'Community')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('.pl-overview')).toHaveCount(0)
    await expect(page.locator('#pl-results-heading')).toHaveText('My Prompts')
    expect(await page.evaluate((k) => localStorage.getItem(k), TAB_KEY)).toBe('my')

    await tabButton(page, 'Community').click()
    await expect(tabButton(page, 'Community')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.pl-overview'), 'Community did not return to the overview').toBeVisible()
    expect(new URL(page.url()).hash).toBe('')
    expect(await page.evaluate((k) => localStorage.getItem(k), TAB_KEY)).toBe('community')
    await context.close()
  })
}

test('a shared list link opens Community without overwriting a saved My Prompts choice', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript((k) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, 'my'); sessionStorage.setItem('seeded', '1') } } catch { /* no storage */ } }, TAB_KEY)
  const page = await context.newPage()
  watch(page, 'a visitor who last used My Prompts following a shared list link')
  await go(page, '/discover/prompts#website')
  await expect(page.locator('#pl-results-h')).toHaveText('Website')
  await expect(tabButton(page, 'Community')).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate((k) => localStorage.getItem(k), TAB_KEY), 'the link overwrote the saved tab').toBe('my')

  // And My Prompts is still one click away from that list.
  await tabButton(page, 'My Prompts').click()
  await page.waitForTimeout(400)
  await expect(tabButton(page, 'My Prompts')).toHaveAttribute('aria-pressed', 'true')
  await context.close()
})
