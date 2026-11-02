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
import { COMMUNITY_PROMPTS } from '../../api/_lib/library/communityPrompts.js'
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
  { name: 'signed out', plan: null, cap: GALLERY_TIER_LIMITS.anonymous, wall: 'account' },
  { name: 'signed in, free', plan: 'free', cap: GALLERY_TIER_LIMITS.free, wall: 'pro' },
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

// ── THE PAGE HAS TWO STATES NOW, AND THE GATE HAS TO HOLD IN BOTH ─────────────
//
// The Community tab opens on an OVERVIEW (a section per category: a lead card,
// compact cards, and cover tiles) and the flat grid is the LIST (`#all`, or one
// category's `#website` and so on), entered by View more, "Browse all", or by
// typing a search. Both draw open prompts as `.pl-card` and locked ones as
// `.pl-locked-card`, and BOTH match `.pl-card`, so every count and every read of
// "the open cards" goes through OPEN_CARDS. A locked card never shows a title
// or a text; its heading is the prompt's tags.
const OPEN_CARDS = '.pl-card:not(.pl-locked-card)'
const LOCKED_CARDS = '.pl-locked-card'

// The list state, reached the way a visitor reaches it: the overview's closing
// "Browse all N with filters" button.
async function openList(page) {
  await page.locator('#pl-browse-all').click()
  await expect(page.locator('.pl-gallery')).toBeVisible()
}

// A radio group's option by its visible label. The category chips carry a count
// ("Website 5 prompts"), Sort and Access do not.
const chip = (page, label) => page.getByRole('radio', { name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( \\d+ prompts?)?$`) })

/**
 * Every card on screen, paired with what it is showing.
 *
 * `[data-preview]` is the stable hook rather than a class: what this gate needs
 * to know is WHICH PROMPT'S TEXT OR OUTPUT IS ON THE PAGE, and that is the
 * element the attribute marks. A locked card has none, by construction.
 *
 * An open card shows one of two artefacts: a poster of the prompt's built
 * output (data-preview-kind="output"), or its own text. Both are read, so a
 * leak through either surface shows up, and a card that went empty cannot make
 * a leak assertion pass for want of anything to leak.
 */
async function cards(page) {
  return page.evaluate(() => [...document.querySelectorAll('.pl-card')].map((card) => {
    const shot = card.querySelector('[data-preview-kind="output"] img')
    const poster = card.querySelector('img.pl-card-poster')
    return {
      locked: card.classList.contains('pl-locked-card'),
      title: (card.querySelector('.pl-card-title')?.textContent || '').trim(),
      all: (card.textContent || '').trim(),
      label: card.getAttribute('aria-label') || '',
      preview: card.querySelector('[data-preview]')?.textContent || '',
      poster: shot ? (shot.getAttribute('src') || '') : '',
      hasPreviewWindow: !!card.querySelector('[data-preview]'),
      kind: card.querySelector('[data-preview]')?.getAttribute('data-preview-kind') || 'none',
      // A locked card may show the output's picture, but only blurred past reading.
      lockedPicture: poster ? { src: poster.getAttribute('src') || '', filter: getComputedStyle(poster).filter } : null,
    }
  }))
}

// Anything on a locked card that names or quotes a withheld prompt.
const lockedLeaks = (shown, WITHHELD, where) => {
  const found = []
  for (const card of shown.filter((c) => c.locked)) {
    for (const p of WITHHELD) {
      const title = p.title.toLowerCase()
      const phrase = (p.text || '').split('\n')[0].slice(0, 40).toLowerCase()
      const said = `${card.all} ${card.label}`.toLowerCase()
      if (said.includes(title)) found.push(`${p.id} titled on a locked card ${where}`)
      if (phrase.length > 20 && said.includes(phrase)) found.push(`${p.id} quoted on a locked card ${where}`)
    }
    if (card.hasPreviewWindow) found.push(`a locked card grew a preview window ${where}`)
    if (card.lockedPicture && !/blur\(/.test(card.lockedPicture.filter)) {
      found.push(`a locked card's picture is not blurred ${where}`)
    }
  }
  return found
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
      await expect(page.locator('.pl-overview')).toBeVisible()
      await expect(page.locator(OPEN_CARDS).first()).toBeVisible()
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
      // The overview teases locked prompts too, so the locked side of every
      // assertion below has something on the page to be wrong about.
      expect(await page.locator(LOCKED_CARDS).count(), 'the overview shows no locked card').toBeGreaterThan(0)
    })

    for (const state of ['overview', 'list']) {
      test(`a locked prompt title or body is in no text, markup or accessible name — ${state}`, async ({ page }) => {
        if (state === 'list') await openList(page)
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
    }

    test('the search box cannot pull a locked prompt into a free position', async ({ page }) => {
      // THE regression. Each of these words appears in exactly one locked prompt
      // and in no free one, so any card coming back is a card from behind the
      // gate — the old build returned it at index 0, unlocked. Typing from the
      // overview enters the list, so this also covers that route in.
      const search = page.getByLabel('Search community prompts')
      for (const p of TELLTALE) {
        for (const word of p.words) {
          await search.fill(word)
          await expect(page.getByText('No prompts match'), `"${word}" should match nothing`).toBeVisible()
          await expect(page.locator('.pl-card')).toHaveCount(0)
          const { text } = await surfaces(page)
          expect(text, `searching "${word}" surfaced locked prompt ${p.id}`)
            .not.toContain(p.title.toLowerCase())
        }
      }
      // Positive control: the search box is not simply broken.
      await search.fill(CONTROL_WORD)
      await expect(page.locator(OPEN_CARDS)).toHaveCount(1)
      await expect(page.locator(`${OPEN_CARDS} .pl-card-title`)).toHaveText(CONTROL.title)
    })

    test('the sort control cannot change which prompts are free', async ({ page }) => {
      // `free` used to mean a POSITION, and Newest reversed the list — so the
      // eight prompts at the bottom under Popular became free under Newest.
      await openList(page)
      for (const order of ['Newest', 'Popular']) {
        await chip(page, order).check()
        await expect(chip(page, order)).toBeChecked()
        await expect(page.locator(OPEN_CARDS)).toHaveCount(OPEN.length)
        const titles = await page.locator(`${OPEN_CARDS} .pl-card-title`).allTextContents()
        const leaked = titles.filter((t) => WITHHELD.some((p) => p.title === t.trim()))
        expect(leaked, `sorting by ${order} surfaced a locked prompt`).toEqual([])
        // And the locked cards stay the same size of set.
        await expect(page.locator(LOCKED_CARDS)).toHaveCount(WITHHELD.length)
      }
    })

    test('the Access control cannot open a locked prompt', async ({ page }) => {
      // Free and Pro narrow the list; neither may move a card across the gate.
      // The set that is open is the rung's, whatever Access says.
      await openList(page)
      for (const access of ['Pro', 'Free', 'Any']) {
        await chip(page, access).check()
        await expect(chip(page, access)).toBeChecked()
        const titles = await page.locator(`${OPEN_CARDS} .pl-card-title`).allTextContents()
        const leaked = titles.filter((t) => WITHHELD.some((p) => p.title === t.trim()))
        expect(leaked, `Access "${access}" surfaced a locked prompt`).toEqual([])
        expect(titles.every((t) => OPEN.some((p) => p.title === t.trim())), `Access "${access}" showed a card that is not open`).toBe(true)
      }
      await expect(page.locator(OPEN_CARDS)).toHaveCount(OPEN.length)
    })

    test('no category filter surfaces a locked prompt', async ({ page }) => {
      // The third route into the same defect: a category whose members are mostly
      // locked used to return them at low indices, and therefore free.
      await openList(page)
      for (const label of ['Website', '3D & Motion', 'UI Components', 'CSS & Visual', 'Branding']) {
        await chip(page, label).click() // a category is a route change, so check()'s instant read-back would see the old state
        await expect(chip(page, label)).toBeChecked()
        await expect(page.locator('#pl-results-h')).toHaveText(label)
        const titles = await page.locator(`${OPEN_CARDS} .pl-card-title`).allTextContents()
        const leaked = titles.filter((t) => WITHHELD.some((p) => p.title === t.trim()))
        expect(leaked, `the ${label} category surfaced a locked prompt`).toEqual([])
      }
    })

    for (const state of ['overview', 'list']) {
      test(`the locked cards carry no payload, one control each, and no name — ${state}`, async ({ page }) => {
        if (state === 'list') await openList(page)
        const locked = page.locator(LOCKED_CARDS)
        // The overview shows only a sample of the locked prompts; the list shows
        // every one of them, so its count IS the assertion.
        if (state === 'list') await expect(locked).toHaveCount(WITHHELD.length)
        else expect(await locked.count(), 'the overview shows no locked card').toBeGreaterThan(0)

        // Each locked card is ONE control and has nothing focusable inside it.
        // For a signed-out visitor, the prompts a free account opens are a
        // sign-up button; every other locked card links to /plans.
        expect(await locked.locator('button, a, [tabindex]').count(), 'a locked card holds a control of its own').toBe(0)
        const kinds = await locked.evaluateAll((els) => els.map((el) => ({ tag: el.tagName, href: el.getAttribute('href') })))
        for (const k of kinds) {
          if (k.tag === 'A') expect(k.href, 'a locked card links somewhere other than the plans page').toBe('/plans')
          else expect(k.tag, 'a locked card is neither a link nor a button').toBe('BUTTON')
        }
        if (state === 'list') {
          const viaAccount = rung.wall === 'account' ? GALLERY_TIER_LIMITS.free - GALLERY_TIER_LIMITS.anonymous : 0
          expect(kinds.filter((k) => k.tag === 'BUTTON').length, 'cards that open with a free account').toBe(viaAccount)
          expect(kinds.filter((k) => k.tag === 'A').length, 'cards that open with Pro').toBe(WITHHELD.length - viaAccount)
        }

        // No name either. A prompt's title is the product, so a locked card's
        // heading is its tags and nothing more.
        expect(lockedLeaks(await cards(page), WITHHELD, `in the ${state}`)).toEqual([])
      })
    }

    for (const state of ['overview', 'list']) {
      test(`the access wall states the true count, is keyboard reachable, and offers this rung its own next step — ${state}`, async ({ page }) => {
        // WHICH NEXT STEP IS THE POINT. From the bottom rung the next step is a
        // free account and the honest number is how many more THAT opens; from
        // the free rung it is Pro. Offering Pro to somebody whose next seven
        // prompts are free would be selling a purchase that is not needed yet.
        if (state === 'list') await openList(page)
        const wall = page.locator('.pl-close')
        await expect(wall).toBeVisible()
        const total = COMMUNITY_PROMPTS.length
        const gain = rung.wall === 'account'
          ? rungSets(GALLERY_TIER_LIMITS.free).open.length - OPEN.length
          : WITHHELD.length
        if (state === 'overview') {
          await expect(wall.getByRole('heading', { level: 2 })).toHaveText(
            rung.wall === 'account'
              ? `Signed out, you can open ${OPEN.length} of the ${total} community prompts.`
              : `Free covers ${OPEN.length} of the ${total} community prompts.`,
          )
        } else {
          await expect(wall.getByRole('heading', { level: 2 })).toHaveText(
            rung.wall === 'account'
              ? `${gain} more prompts open with a free account`
              : `${gain} more prompts open with Pro`,
          )
        }
        const cta = rung.wall === 'account'
          ? wall.getByRole('button', { name: /Create your free account/ })
          : wall.getByRole('link', { name: /See what Pro includes/ })
        await cta.focus()
        await expect(cta).toBeFocused()
        await page.keyboard.press('Enter')
        // The canonical dialog for that step, not a second one built for this
        // surface: the app's own sign-in prompt, or the plans page.
        if (rung.wall === 'account') await expect(page.locator('[role="dialog"]')).toBeVisible()
        else await expect(page).toHaveURL(/\/plans$/)
      })
    }

    test('every open card carries a free prompt\'s own artefact — the positive control', async ({ page }) => {
      // THE CONTROL FOR EVERYTHING BELOW IT. If the cards were empty, stubs, or
      // truncated summaries, every leak assertion in this file would pass by
      // accident. So each open card must be shown to be carrying the real
      // artefact of the prompt it claims to be, on the overview AND in the list.
      //
      // There are two artefacts. A prompt whose output has been built shows a
      // POSTER of that output; every other prompt shows its own TEXT, verbatim.
      // Both are checked against the prompt the card is titled for.
      const check = (shown, where) => {
        let withPoster = 0
        for (const card of shown) {
          const match = OPEN.find((p) => p.title === card.title)
          expect(match, `a card titled "${card.title}" is not a free prompt (${where})`).toBeTruthy()
          if (card.kind === 'output') {
            withPoster++
            // The poster must be THIS prompt's. A card showing another prompt's
            // output is the same defect as a card showing another prompt's text.
            expect(card.poster, `the poster on "${card.title}" is not ${match.id}'s (${where})`)
              .toBe(`/previews/prompts/poster/${match.id}.webp`)
          } else {
            expect(card.preview, `the preview for "${card.title}" is not the prompt itself (${where})`)
              .toBe(match.text)
          }
        }
        return withPoster
      }

      const overview = (await cards(page)).filter((c) => !c.locked)
      expect(overview.length, 'the overview rendered no open cards').toBeGreaterThan(0)
      expect(check(overview, 'overview'), 'no overview card showed a built output — has the manifest emptied?').toBeGreaterThan(0)

      await openList(page)
      const list = (await cards(page)).filter((c) => !c.locked)
      expect(list.length, 'the list rendered the wrong number of open cards').toBe(OPEN.length)
      // And the split is real in at least one direction, so this cannot be
      // satisfied by a page that rendered nothing of either kind.
      expect(check(list, 'list'), 'no list card showed a built output — has the manifest emptied?').toBeGreaterThan(0)
    })

    test('no preview carries a locked prompt, under search, sort, access or any category', async ({ page }) => {
      // THE regression, aimed at the surface that holds the payload. A locked
      // prompt reaching the grid would arrive with its ENTIRE TEXT in a preview,
      // so this reads the previews rather than the titles.
      const leaks = async (where) => {
        const shown = await cards(page)
        const found = lockedLeaks(shown, WITHHELD, where)
        for (const card of shown.filter((c) => !c.locked)) {
          for (const p of WITHHELD) {
            const phrase = (p.text || '').split('\n')[0].slice(0, 40).toLowerCase()
            if (card.preview.toLowerCase().includes(phrase)) found.push(`${p.id} previewed under ${where}`)
            if (card.title === p.title) found.push(`${p.id} titled under ${where}`)
            // A locked prompt arriving on an OPEN card with a poster of its
            // output is as much the product as the text.
            if (card.poster && card.poster.includes(`/${p.id}.webp`)) found.push(`${p.id} POSTERED under ${where}`)
          }
        }
        // Every open card on screen must still be one of the rung's.
        const strangers = shown
          .filter((c) => !c.locked && !OPEN.some((p) => p.title === c.title))
          .map((c) => `unknown card "${c.title}" under ${where}`)
        return [...found, ...strangers]
      }

      expect(await leaks('the overview'), 'a locked prompt reached the overview').toEqual([])
      await openList(page)
      expect(await leaks('the default list'), 'a locked prompt reached the list').toEqual([])

      for (const order of ['Newest', 'Popular']) {
        await chip(page, order).check()
        await expect(page.locator(OPEN_CARDS)).toHaveCount(OPEN.length)
        expect(await leaks(`sort ${order}`), `sorting by ${order} leaked a locked prompt`).toEqual([])
      }
      for (const access of ['Pro', 'Free', 'Any']) {
        await chip(page, access).check()
        await expect(chip(page, access)).toBeChecked()
        expect(await leaks(`access ${access}`), `Access "${access}" leaked a locked prompt`).toEqual([])
      }
      for (const label of ['Website', '3D & Motion', 'UI Components', 'CSS & Visual', 'Branding']) {
        await chip(page, label).click() // a category is a route change, so check()'s instant read-back would see the old state
        await expect(chip(page, label)).toBeChecked()
        expect(await leaks(`category ${label}`), `the ${label} category leaked a locked prompt`).toEqual([])
      }

      // A search narrows the category that is chosen, so go back to All first.
      await chip(page, 'All').click()
      await expect(chip(page, 'All')).toBeChecked()
      const search = page.getByLabel('Search community prompts')
      for (const p of TELLTALE) {
        for (const word of p.words) {
          await search.fill(word)
          await expect(page.locator('.pl-card')).toHaveCount(0)
          expect(await leaks(`search "${word}"`), `searching "${word}" leaked ${p.id}`).toEqual([])
        }
      }
      await search.fill(CONTROL_WORD)
      await expect(page.locator(OPEN_CARDS)).toHaveCount(1)
      expect(await leaks(`search "${CONTROL_WORD}"`)).toEqual([])
    })

    test('a locked card has no preview element to put a prompt in', async ({ page }) => {
      // Structural, not cosmetic. The open card's window is `[data-preview]`; the
      // locked card is a different component with no such element, so there is
      // nowhere for a payload to land even if a future mapper handed one over.
      await openList(page)
      const locked = page.locator(LOCKED_CARDS)
      await expect(locked).toHaveCount(WITHHELD.length)
      expect(await locked.locator('[data-preview]').count(),
        'a locked card grew a preview window').toBe(0)
      expect(await page.locator(`${LOCKED_CARDS} .pl-card-preview-text`).count(),
        'a locked card is drawing prompt text').toBe(0)
      // Positive control: the open cards DO have one, so the count above is not
      // zero because the selector is wrong.
      expect(await page.locator(`${OPEN_CARDS} [data-preview]`).count(),
        'the open cards have no preview either — this assertion is vacuous').toBe(OPEN.length)
    })

    test('the wall steps aside while the visitor is searching', async ({ page }) => {
      // Under a narrower question the user has already said what they want, and
      // answering it with a paywall is an interruption rather than an offer.
      //
      // It is also why the empty state does not say how many locked prompts DID
      // match: that sentence is the search oracle rebuilt in words.
      await openList(page)
      await expect(page.locator('.pl-close')).toBeVisible()
      await expect(page.locator(LOCKED_CARDS).first()).toBeVisible()
      await page.getByLabel('Search community prompts').fill(CONTROL_WORD)
      await expect(page.locator('.pl-close')).toHaveCount(0)
      await expect(page.locator(LOCKED_CARDS)).toHaveCount(0)
      await page.getByLabel('Search community prompts').fill('')
      await expect(page.locator('.pl-close')).toBeVisible()
      await expect(page.locator(LOCKED_CARDS).first()).toBeVisible()
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

      // An open card renders only for the rows this rung may read, so the first
      // one is open by construction. Which one it is depends on the sort, so the
      // expectation is read OFF THE OPEN MODAL rather than assumed to be
      // OPEN[0] — pinning it to a source index made this fail against a working
      // build, which is the wrong kind of red.
      const card = page.locator(OPEN_CARDS).first()
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
