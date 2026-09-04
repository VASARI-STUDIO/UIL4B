// Can a signed-out visitor read a Pro community prompt off the rendered page?
//
// Before this change the answer was YES, and it needed no devtools — only the
// search box. PromptLibrary locked every card past the twelfth of the FILTERED
// list, so "free" meant the first twelve of whatever view you had built. Typing
// a phrase that only a locked prompt contained rebuilt the list with that
// prompt at index 0, where it was free. All twenty were reachable that way. The
// sort control did the same thing more slowly, and the category chips did it
// per category.
//
// That is the defect this file exists to keep closed, and it is a different
// defect from the palette one in 44: there the values leaked through the DOM,
// here they leaked through the QUERY. So the assertions below drive the actual
// controls — search, sort, category — rather than only reading the page.
//
// A prompt's TITLE is the product as much as its text is: "Coffee shop brand
// identity" is the idea being sold. So both are treated as payload.
//
// Every assertion is paired with a POSITIVE CONTROL over a free prompt. If the
// gallery ever fails to render, "no locked prompt found" would be true and
// meaningless — which is exactly how this suite would start lying.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { COMMUNITY_PROMPTS } from '../../src/data/communityPrompts.js'

const ROUTE = '/discover/prompts'

const FREE = COMMUNITY_PROMPTS.filter((p) => p.free === true)
const LOCKED = COMMUNITY_PROMPTS.filter((p) => p.free !== true)

const bodyOf = (p) => `${p.title || ''} ${p.text || ''}`.toLowerCase()
const FREE_WORDS = new Set(FREE.flatMap((p) => bodyOf(p).match(/[a-z]{6,}/g) || []))

// For each locked prompt, the words that appear in IT and in no free prompt.
// Those are the discriminating query terms: a search for one of them can only
// be answered from behind the gate, so a non-empty result is the leak itself.
const TELLTALE = LOCKED.map((p) => ({
  id: p.id,
  title: p.title,
  words: [...new Set(bodyOf(p).match(/[a-z]{6,}/g) || [])]
    .filter((w) => !FREE_WORDS.has(w))
    .sort((a, b) => b.length - a.length)
    .slice(0, 4),
})).filter((p) => p.words.length > 0)

// A free prompt and one of its own distinctive words, to prove the search works
// at all. Without this, "every search returned nothing" would pass this file.
const CONTROL = FREE.find((p) => /plumbing/i.test(bodyOf(p))) || FREE[0]
const CONTROL_WORD = 'plumbing'

async function surfaces(page) {
  return page.evaluate(() => ({
    text: document.body.innerText.toLowerCase(),
    html: document.documentElement.outerHTML.toLowerCase(),
    names: [...document.querySelectorAll('[aria-label],[title],button,a')]
      .map((el) => `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.textContent || ''}`)
      .join(' | ').toLowerCase(),
  }))
}

test.describe('the community prompt gate holds under every control on the page', () => {
  test.beforeEach(async ({ page }) => {
    watch(page, 'a signed-out visitor browsing the community prompt library')
    await go(page, ROUTE)
    await expect(page.locator('.pl-card').first()).toBeVisible()
  })

  test('the fixture discriminates and the page rendered — controls first', async ({ page }) => {
    // If any of these fail, every assertion in this file is vacuous.
    expect(FREE.length, 'no free prompts — the split has no open side').toBeGreaterThan(0)
    expect(LOCKED.length, 'no locked prompts — there is nothing to gate').toBeGreaterThan(0)
    expect(TELLTALE.length, 'no locked prompt has a discriminating word to search for')
      .toBe(LOCKED.length)
    const { text } = await surfaces(page)
    expect(text, 'the free control prompt is missing — the gallery did not render')
      .toContain(CONTROL.title.toLowerCase())
    expect(text.length, 'the page rendered no text').toBeGreaterThan(500)
  })

  test('a locked prompt title or body is in no text, markup or accessible name', async ({ page }) => {
    const { text, html, names } = await surfaces(page)
    const leaks = []
    for (const p of LOCKED) {
      const title = p.title.toLowerCase()
      if (text.includes(title)) leaks.push(`${p.id} title in text`)
      if (html.includes(title)) leaks.push(`${p.id} title in markup`)
      if (names.includes(title)) leaks.push(`${p.id} title in an accessible name`)
      // A distinctive sentence from the body, not the whole thing — the body
      // contains formatting a markup check would trip over on its own.
      const phrase = (p.text || '').toLowerCase().split('\n')[0].slice(0, 40)
      if (phrase.length > 20 && html.includes(phrase)) leaks.push(`${p.id} body in markup`)
    }
    expect(leaks, 'a locked prompt reached the page').toEqual([])
  })

  test('the search box cannot pull a locked prompt into a free position', async ({ page }) => {
    // THE regression. Each of these words appears in exactly one locked prompt
    // and in no free one, so any card coming back is a card from behind the
    // gate — the old build returned it at index 0, unlocked.
    const search = page.getByLabel('Search community prompts')
    for (const p of TELLTALE) {
      for (const word of p.words) {
        await search.fill(word)
        await expect(page.locator('.pl-card')).toHaveCount(0)
        const { text } = await surfaces(page)
        expect(text, `searching "${word}" surfaced locked prompt ${p.id}`)
          .not.toContain(p.title.toLowerCase())
      }
    }
    // Positive control: the search box is not simply broken.
    await search.fill(CONTROL_WORD)
    await expect(page.locator('.pl-card')).toHaveCount(1)
    await expect(page.locator('.pl-card-title')).toHaveText(CONTROL.title)
  })

  test('the sort control cannot change which prompts are free', async ({ page }) => {
    // `free` used to mean a POSITION, and Newest reversed the list — so the
    // eight prompts at the bottom under Popular became free under Newest.
    for (const order of ['Newest', 'Popular']) {
      await page.getByRole('button', { name: order, exact: true }).click()
      await expect(page.locator('.pl-card')).toHaveCount(FREE.length)
      const titles = await page.locator('.pl-card-title').allTextContents()
      const leaked = titles.filter((t) => LOCKED.some((p) => p.title === t.trim()))
      expect(leaked, `sorting by ${order} surfaced a locked prompt`).toEqual([])
    }
  })

  test('no category filter surfaces a locked prompt', async ({ page }) => {
    // The third route into the same defect: a category whose members are mostly
    // locked used to return them at low indices, and therefore free.
    for (const label of ['Website', '3D & Motion', 'UI Components', 'CSS & Visual', 'Branding']) {
      await page.getByRole('button', { name: label, exact: true }).click()
      const titles = await page.locator('.pl-card-title').allTextContents()
      const leaked = titles.filter((t) => LOCKED.some((p) => p.title === t.trim()))
      expect(leaked, `the ${label} category surfaced a locked prompt`).toEqual([])
    }
  })

  test('the teased placeholders carry no payload and no control', async ({ page }) => {
    const cards = page.locator('.lockt-card')
    await expect(cards).toHaveCount(3)
    // Nothing focusable: there is nothing to open, copy or hand off, so a
    // control would be a control that does nothing and a keyboard user would
    // still have to walk past it.
    expect(await cards.locator('button, a, [tabindex]').count(),
      'a locked placeholder carries a focusable control').toBe(0)
    // No name either. The palette placeholders carry the brand's name because
    // the name is the tease; a prompt's title is the product, so it does not.
    const placeholderText = (await cards.allTextContents()).join(' ').toLowerCase()
    const named = LOCKED.filter((p) => placeholderText.includes(p.title.toLowerCase()))
    expect(named, 'a placeholder named the prompt it stands for').toEqual([])
  })

  test('the wall is keyboard reachable, states the true count, and opens the Pro gate', async ({ page }) => {
    const heading = page.locator('.lockt-cta-head')
    await expect(heading).toHaveText(new RegExp(`Another ${LOCKED.length} community prompts?`))
    const cta = page.locator('.lockt-cta-btn')
    await cta.focus()
    await expect(cta).toBeFocused()
    await page.keyboard.press('Enter')
    // The canonical upgrade modal, not a second one built for this surface.
    await expect(page.locator('[role="dialog"]').filter({ hasText: 'The full community library' })).toBeVisible()
  })

  test('the wall steps aside while the visitor is searching or filtering', async ({ page }) => {
    // Under a narrower question the user has already said what they want, and
    // answering it with a paywall is an interruption rather than an offer.
    //
    // It is also why the empty state does not say how many locked prompts DID
    // match: that sentence is the search oracle rebuilt in words.
    await expect(page.locator('.lockt-cta')).toBeVisible()
    await page.getByLabel('Search community prompts').fill(CONTROL_WORD)
    await expect(page.locator('.lockt-cta')).toHaveCount(0)
    await expect(page.locator('.lockt-card')).toHaveCount(0)
    await page.getByLabel('Search community prompts').fill('')
    await expect(page.locator('.lockt-cta')).toBeVisible()
  })
})
