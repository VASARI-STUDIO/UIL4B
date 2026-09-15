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
//
// ── WHAT CHANGED, AND WHY THE STAKES WENT UP ────────────────────────────────
//
// The cards now PREVIEW THE PROMPT. Each free card renders `p.text` in full
// inside a fixed-height window, because the founder asked the library to show
// the artefact rather than a name for it. That makes the split the only thing
// between a signed-out visitor and eight paid prompt texts, where before it was
// the only thing between them and eight titles.
//
// So the assertions below no longer stop at "the title is absent". They read
// EVERY RENDERED PREVIEW on the page, pair it with the card it belongs to, and
// require that the set of previewed texts is exactly the free set — under the
// search box, under both sort orders, and under every category chip. Reverting
// the grid's source from `browsableCommunity` to `sortedCommunity` fails these,
// which is the wiring the first version of this gate got wrong.
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

/**
 * Every card on screen, paired with the text its preview window is showing.
 *
 * `[data-preview]` is the stable hook rather than the class: PromptCard's
 * comment says so, and a class is something CSS is free to rename. What this
 * gate needs to know is WHICH PROMPT'S TEXT IS ON THE PAGE, and that is the
 * element the attribute marks.
 */
// WHAT A CARD IS SHOWING, in both of the forms it can take.
//
// Until 2026-09-15 there was one: the prompt's own text, scrolling. A card
// whose output has been BUILT now shows a poster of that output instead
// (PromptCard, data-preview-kind="output"), so a gate test that only read
// textContent would come back empty for those cards — and every leak assertion
// below would pass because there was nothing in them to leak. That is the
// vacuity the positive control exists to catch, and it is why this returns the
// poster too rather than being taught to ignore the new cards.
//
// THE LEAK SURFACE MOVED WITH IT. A locked prompt reaching the grid used to
// arrive carrying its entire text; it would now arrive carrying a poster named
// for its id. Both are read, and both are checked.
async function previews(page) {
  return page.evaluate(() => [...document.querySelectorAll('.pl-card')].map((card) => {
    const shot = card.querySelector('[data-preview-kind="output"] img')
    return {
      title: (card.querySelector('.pl-card-title')?.textContent || '').trim(),
      preview: card.querySelector('[data-preview]')?.textContent || '',
      poster: shot ? (shot.getAttribute('src') || '') : '',
      kind: card.querySelector('[data-preview]')?.getAttribute('data-preview-kind') || 'none',
    }
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

  test('every rendered card carries a free prompt\'s own artefact — the positive control', async ({ page }) => {
    // THE CONTROL FOR EVERYTHING BELOW IT. If the cards were empty, stubs, or
    // truncated summaries, every leak assertion in this file would pass by
    // accident. So each card must be shown to be carrying the real artefact of
    // the prompt it claims to be.
    //
    // There are two artefacts now. A prompt whose output has been built shows a
    // POSTER of that output; every other prompt still shows its own TEXT,
    // verbatim. Both are checked against the prompt the card is titled for, so
    // neither kind can go quietly empty.
    const shown = await previews(page)
    expect(shown.length, 'the gallery rendered no cards').toBe(FREE.length)

    let withText = 0
    let withPoster = 0
    for (const card of shown) {
      const match = FREE.find((p) => p.title === card.title)
      expect(match, `a card titled "${card.title}" is not a free prompt`).toBeTruthy()

      if (card.kind === 'output') {
        withPoster++
        // The poster must be THIS prompt's. A card showing another prompt's
        // output is the same defect as a card showing another prompt's text.
        expect(card.poster, `the poster on "${card.title}" is not ${match.id}'s`)
          .toBe(`/previews/prompts/poster/${match.id}.webp`)
      } else {
        withText++
        expect(card.preview, `the preview for "${card.title}" is not the prompt itself`)
          .toBe(match.text)
      }
    }

    // And the split is real in at least one direction, so this test cannot be
    // satisfied by a page that rendered nothing of either kind.
    expect(withText + withPoster, 'no card carried an artefact of any kind').toBe(shown.length)
    expect(withPoster, 'no card showed a built output — has the manifest emptied?').toBeGreaterThan(0)
  })

  test('no preview carries a locked prompt, under search, sort or any category', async ({ page }) => {
    // THE regression, aimed at the surface that now holds the payload. A locked
    // prompt reaching the grid would arrive with its ENTIRE TEXT in a preview,
    // so this reads the previews rather than the titles.
    const leaks = async (where) => {
      const shown = await previews(page)
      const found = []
      for (const card of shown) {
        for (const p of LOCKED) {
          const phrase = (p.text || '').split('\n')[0].slice(0, 40).toLowerCase()
          if (card.preview.toLowerCase().includes(phrase)) found.push(`${p.id} previewed under ${where}`)
          if (card.title === p.title) found.push(`${p.id} titled under ${where}`)
          // The second leak surface, since 2026-09-15: a locked prompt arriving
          // with a poster of its output. The image is as much the product as
          // the text — arguably more, for the prompts that are being sold on
          // what they produce.
          if (card.poster && card.poster.includes(`/${p.id}.webp`)) {
            found.push(`${p.id} POSTERED under ${where}`)
          }
        }
      }
      // Every card on screen must still be one of the twelve.
      const strangers = shown
        .filter((c) => !FREE.some((p) => p.title === c.title))
        .map((c) => `unknown card "${c.title}" under ${where}`)
      return [...found, ...strangers]
    }

    expect(await leaks('the default view'), 'a locked prompt reached the grid').toEqual([])

    const search = page.getByLabel('Search community prompts')
    for (const p of TELLTALE) {
      for (const word of p.words) {
        await search.fill(word)
        await expect(page.locator('.pl-card')).toHaveCount(0)
        expect(await leaks(`search "${word}"`), `searching "${word}" leaked ${p.id}`).toEqual([])
      }
    }
    await search.fill(CONTROL_WORD)
    await expect(page.locator('.pl-card')).toHaveCount(1)
    expect(await leaks(`search "${CONTROL_WORD}"`)).toEqual([])
    await search.fill('')

    for (const order of ['Newest', 'Popular']) {
      await page.getByRole('button', { name: order, exact: true }).click()
      await expect(page.locator('.pl-card')).toHaveCount(FREE.length)
      expect(await leaks(`sort ${order}`), `sorting by ${order} leaked a locked prompt`).toEqual([])
    }

    for (const label of ['Website', '3D & Motion', 'UI Components', 'CSS & Visual', 'Branding']) {
      await page.getByRole('button', { name: label, exact: true }).click()
      expect(await leaks(`category ${label}`), `the ${label} category leaked a locked prompt`).toEqual([])
    }
  })

  test('a locked placeholder has no preview element to put a prompt in', async ({ page }) => {
    // Structural, not cosmetic. The free card's window is `[data-preview]`; the
    // placeholder is a different component with no such element, so there is
    // nowhere for a payload to land even if a future mapper handed one over.
    const locked = page.locator('.lockt-card')
    await expect(locked).toHaveCount(3)
    expect(await locked.locator('[data-preview]').count(),
      'a locked placeholder grew a preview window').toBe(0)
    expect(await page.locator('.lockt-card .pl-card-preview-text').count(),
      'a locked placeholder is drawing prompt text').toBe(0)
    // Positive control: the free cards DO have one, so the count above is not
    // zero because the selector is wrong.
    expect(await page.locator('.pl-card [data-preview]').count(),
      'the free cards have no preview either — this assertion is vacuous').toBe(FREE.length)
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
