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
//
// ── AND WHAT CHANGED AGAIN WHEN THE GATE GREW A THIRD RUNG ─────
//
// The founder's tiers — 3 signed out, 10 with a free account, everything with
// Pro — mean "free" is no longer one set. A signed-out visitor gets the first
// three of the twelve flagged rows; an account gets the first ten. So the
// withheld set is now bigger than the `free: false` set, and it CONTAINS ROWS
// THAT CARRY free: true — which is a new leak surface, not a smaller one: the
// search box must refuse a word that appears only in a flagged-free prompt the
// cap has not reached yet, exactly as it refuses a paid one.
//
// Everything below therefore runs TWICE, once per non-Pro rung, with the open
// set, the withheld set and the discriminating words all derived from the rung
// rather than from the flag.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'
import { COMMUNITY_PROMPTS } from '../../src/data/communityPrompts.js'
import { GALLERY_TIER_LIMITS } from '../../src/utils/lockedPreview.js'

const ROUTE = '/discover/prompts'

const FLAGGED_FREE = COMMUNITY_PROMPTS.filter((p) => p.free === true)

const bodyOf = (p) => `${p.title || ''} ${p.text || ''}`.toLowerCase()
// EVERYTHING THE PAGE'S SEARCH PREDICATE READS — title, text AND tags. The
// discriminating-word set has to be built from this rather than from the body
// alone, or a word that happens to be one of an open prompt's TAGS gets picked
// as a telltale and the search legitimately returns that open card. That is a
// false alarm rather than a leak, and with only three prompts open it fires:
// the smaller the open set, the more words look discriminating.
const searchableOf = (p) => `${p.title || ''} ${p.text || ''} ${p.tags || ''}`.toLowerCase()

// One rung's view of the library, derived the way the page derives it: the
// flagged-free prompts in the data file's own order, capped.
function rungSets(cap) {
  const open = FLAGGED_FREE.slice(0, cap)
  const withheld = COMMUNITY_PROMPTS.filter((p) => !open.includes(p))
  // The page matches with `includes()`, so the exclusion has to be a SUBSTRING
  // test and not a token test: "listing" is a perfectly good word of a withheld
  // prompt and still matches an open one through "listings".
  const openText = open.map(searchableOf).join(' | ')
  // For each withheld prompt, the words that appear in IT and in no open one.
  // Those are the discriminating query terms: a search for one of them can only
  // be answered from behind the gate, so a non-empty result is the leak itself.
  const telltale = withheld.map((p) => ({
    id: p.id,
    title: p.title,
    words: [...new Set(bodyOf(p).match(/[a-z]{6,}/g) || [])]
      .filter((w) => !openText.includes(w))
      .sort((a, b) => b.length - a.length)
      .slice(0, 4),
  })).filter((p) => p.words.length > 0)
  return { open, withheld, telltale }
}

// The two rungs a gate has to hold at. Pro has nothing withheld, so it is not
// one of them — 44 and the unit suite cover the open end.
const RUNGS = [
  { name: 'signed out', plan: null, cap: GALLERY_TIER_LIMITS.anonymous, placeholders: 0, wall: 'account' },
  { name: 'signed in, free', plan: 'free', cap: GALLERY_TIER_LIMITS.free, placeholders: 3, wall: 'pro' },
]

// A prompt that is open at EVERY rung, and one of its own distinctive words, to
// prove the search works at all. Without this, "every search returned nothing"
// would pass this file. c-1 is first in the data file, so the tightest cap
// still reaches it.
const CONTROL = FLAGGED_FREE.find((p) => /plumbing/i.test(bodyOf(p))) || FLAGGED_FREE[0]
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

// ONE BODY, BOTH RUNGS. The open set, the withheld set and the words that
// discriminate between them all come from the rung, so the same assertions
// run against a signed-out visitor (three prompts) and a free account (ten).
for (const rung of RUNGS) {
  const { open: OPEN, withheld: WITHHELD, telltale: TELLTALE } = rungSets(rung.cap)

  test.describe(`the community prompt gate holds under every control on the page — ${rung.name}`, () => {
    test.beforeEach(async ({ page }) => {
      watch(page, `a ${rung.name} visitor browsing the community prompt library`)
      if (rung.plan) await signIn(page, { plan: rung.plan })
      await go(page, ROUTE)
      await expect(page.locator('.pl-card').first()).toBeVisible()
    })

    test('the fixture discriminates and the page rendered — controls first', async ({ page }) => {
      // If any of these fail, every assertion in this file is vacuous.
      expect(OPEN.length, 'no free prompts — the split has no open side').toBeGreaterThan(0)
      expect(WITHHELD.length, 'no locked prompts — there is nothing to gate').toBeGreaterThan(0)
      expect(TELLTALE.length, 'no locked prompt has a discriminating word to search for')
        .toBe(WITHHELD.length)
      const { text } = await surfaces(page)
      expect(text, 'the free control prompt is missing — the gallery did not render')
        .toContain(CONTROL.title.toLowerCase())
      expect(text.length, 'the page rendered no text').toBeGreaterThan(500)
    })

    test('a locked prompt title or body is in no text, markup or accessible name', async ({ page }) => {
      const { text, html, names } = await surfaces(page)
      const leaks = []
      for (const p of WITHHELD) {
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
        await expect(page.locator('.pl-card')).toHaveCount(OPEN.length)
        const titles = await page.locator('.pl-card-title').allTextContents()
        const leaked = titles.filter((t) => WITHHELD.some((p) => p.title === t.trim()))
        expect(leaked, `sorting by ${order} surfaced a locked prompt`).toEqual([])
      }
    })

    test('no category filter surfaces a locked prompt', async ({ page }) => {
      // The third route into the same defect: a category whose members are mostly
      // locked used to return them at low indices, and therefore free.
      for (const label of ['Website', '3D & Motion', 'UI Components', 'CSS & Visual', 'Branding']) {
        await page.getByRole('button', { name: label, exact: true }).click()
        const titles = await page.locator('.pl-card-title').allTextContents()
        const leaked = titles.filter((t) => WITHHELD.some((p) => p.title === t.trim()))
        expect(leaked, `the ${label} category surfaced a locked prompt`).toEqual([])
      }
    })

    test('the teased placeholders carry no payload and no control', async ({ page }) => {
      const cards = page.locator('.lockt-card')
      // THE COUNT IS THE ASSERTION AT THE BOTTOM RUNG. LockedPromptCard stamps
      // each placeholder "Pro"; for a signed-out visitor the next prompts are
      // not Pro's — they arrive with a free account — so the page renders the
      // wall alone and this must be zero. At the free rung the pill is true and
      // the three placeholders are back.
      await expect(cards).toHaveCount(rung.placeholders)
      // Nothing focusable: there is nothing to open, copy or hand off, so a
      // control would be a control that does nothing and a keyboard user would
      // still have to walk past it.
      // Each placeholder carries ONE
      // control: an "Upgrade to Pro" link to /plans, shown on hover/focus. It
      // opens nothing and copies nothing of the item it stands for.
      const controls = cards.locator('button, a, [tabindex]')
      expect(await controls.count(), 'each placeholder carries exactly one control').toBe(rung.placeholders)
      for (let i = 0; i < rung.placeholders; i++) {
        await expect(controls.nth(i)).toHaveAttribute('href', '/plans')
      }
      // No name either. The palette placeholders carry the brand's name because
      // the name is the tease; a prompt's title is the product, so it does not.
      const placeholderText = (await cards.allTextContents()).join(' ').toLowerCase()
      const named = WITHHELD.filter((p) => placeholderText.includes(p.title.toLowerCase()))
      expect(named, 'a placeholder named the prompt it stands for').toEqual([])
    })

    test('the wall is keyboard reachable, states the true count, and offers this rung its own next step', async ({ page }) => {
      // WHICH NEXT STEP IS THE POINT. From the bottom rung the next step is a
      // free account and the honest number is how many more THAT opens; from
      // the free rung it is Pro and the number is everything still withheld.
      // Offering Pro to somebody whose next seven prompts are free would be
      // selling a purchase that is not needed yet.
      const heading = page.locator('.lockt-cta-head')
      const gain = rung.wall === 'account'
        ? rungSets(GALLERY_TIER_LIMITS.free).open.length - OPEN.length
        : WITHHELD.length
      await expect(heading).toHaveText(new RegExp(`Another ${gain} community prompts?`))
      const cta = page.locator('.lockt-cta-btn')
      await expect(cta).toHaveText(rung.wall === 'account' ? /Create your free account/ : /See what Pro includes/)
      await cta.focus()
      await expect(cta).toBeFocused()
      await page.keyboard.press('Enter')
      // The canonical dialog for that step, not a second one built for this
      // surface: the app's own sign-in prompt, or the upgrade modal.
      // The Pro step goes to /plans.
      if (rung.wall === 'account') await expect(page.locator('[role="dialog"]')).toBeVisible()
      else await expect(page).toHaveURL(/\/plans$/)
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
      expect(shown.length, 'the gallery rendered no cards').toBe(OPEN.length)

      let withText = 0
      let withPoster = 0
      for (const card of shown) {
        const match = OPEN.find((p) => p.title === card.title)
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
          for (const p of WITHHELD) {
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
          .filter((c) => !OPEN.some((p) => p.title === c.title))
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
        await expect(page.locator('.pl-card')).toHaveCount(OPEN.length)
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
      await expect(locked).toHaveCount(rung.placeholders)
      expect(await locked.locator('[data-preview]').count(),
        'a locked placeholder grew a preview window').toBe(0)
      expect(await page.locator('.lockt-card .pl-card-preview-text').count(),
        'a locked placeholder is drawing prompt text').toBe(0)
      // Positive control: the free cards DO have one, so the count above is not
      // zero because the selector is wrong.
      expect(await page.locator('.pl-card [data-preview]').count(),
        'the free cards have no preview either — this assertion is vacuous').toBe(OPEN.length)
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

    /* THE GATE HELD AND THE PRODUCT DID NOT.
     *
     * Everything above this proves a visitor cannot read a prompt they have not
     * paid for. None of it noticed that a visitor who HAS paid could not read
     * one either: App.jsx mounted `<PromptLibrary toast={toast} />` with no
     * `onCopy`, PromptLibrary destructures it and `copyPrompt` calls it bare, so
     * both copy paths in the modal threw `onCopy is not a function` — silently.
     * No text, no toast, no visible error, on the page whose entire product is
     * the text you came to copy. Every gate test still passed, because refusing
     * to hand over a prompt is exactly what they were written to check.
     *
     * So this asserts the OTHER direction, and it is the direction a suite full
     * of gate tests structurally forgets. The sentinel is what makes it real: a
     * clipboard that was never written and a clipboard that was written with
     * the wrong thing both fail, and an assertion that the clipboard merely
     * "has something in it" would have passed against the broken build. */
    test('a prompt the visitor IS entitled to actually reaches the clipboard', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      const SENTINEL = 'SENTINEL-CLIPBOARD-NOT-WRITTEN'
      await page.evaluate((s) => navigator.clipboard.writeText(s), SENTINEL)

      // `.pl-card` renders only the rows this rung may read, so the first one
      // is open by construction. Which one it is depends on the sort, so the
      // expectation is read OFF THE OPEN MODAL rather than assumed to be
      // OPEN[0] — pinning it to a source index made this fail against a working
      // build, which is the wrong kind of red.
      const card = page.locator('.pl-card').first()
      await expect(card, 'no open prompt card rendered — this assertion is vacuous').toBeVisible()
      await card.click()
      // A prompt with a demo opens on the running demo; its text is the other tab.
      const promptTab = page.getByRole('dialog').getByRole('tab', { name: /the prompt/i })
      if (await promptTab.count()) await promptTab.click()

      const shown = page.locator('.pl-modal-prompt pre')
      await expect(shown, 'the modal rendered no prompt body').toBeVisible()
      /* Invisible whitespace only, and it is TWO differences, not one.
       *
       * Several prompts in communityPrompts.js carry trailing spaces at the end
       * of a line, and `innerText` drops them — so the raw string and the
       * rendered one differ by characters nobody can see. And `innerText`
       * returns CRLF here, which is why stripping `[ \t]+$` alone did nothing:
       * in "text   \r\n" the `\r` sits BETWEEN the spaces and the line end, so
       * `$` never lines up with them. Line endings are normalised first. */
      const flat = (s) => s.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trim()
      const expected = flat(await shown.innerText())
      // Positive control: the modal is showing a real prompt, not an empty box,
      // so `toBe(expected)` below cannot be satisfied by two empty strings.
      expect(expected.length, 'the open modal shows no prompt text').toBeGreaterThan(80)
      expect(OPEN.map((p) => flat(p.text)),
        'the modal opened a prompt this rung may not read').toContain(expected)

      const copy = page.getByRole('button', { name: /Copy prompt/ })
      await expect(copy, 'the modal offers no way to copy the prompt').toBeVisible()
      await copy.click()

      const clip = await page.evaluate(() => navigator.clipboard.readText())
      expect(clip, 'the copy button ran and wrote nothing — onCopy is missing again').not.toBe(SENTINEL)
      expect(flat(clip), 'the clipboard holds something other than the prompt that was open').toBe(expected)
    })
  })
}
