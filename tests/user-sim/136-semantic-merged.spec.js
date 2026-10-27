// /create/semantic-color: the rebuilt Semantic Colour page, held as a whole.
//
// The page brings back the whole earlier page (bundles you can read, every role's
// presets on show, ramps, a picture of each role at work, the token handoff)
// inside today's tool shell. This file pins the board's Done-when list in a
// browser, with the decisions recorded on the board applied:
//
//   · four roles (Pending does not come back);
//   · swatches print the STEP NUMBER only, on desktop and phone: no hex on the
//     face (the hex is in each swatch's accessible name and on the clipboard);
//   · a small Light / Dark switch on the "colours at work" panel repaints that
//     panel only;
//   · no "More colour tools" list and no "Next step: Typography" link;
//   · the code box is collapsed behind a "Show all N variables" button.
//
// THE NINE PARTS asserted below, in page order:
//   1 the toolbar title (the h1)            6 preset chips (+ Custom, + Family)
//   2 the lead line                         7 the ten-step ramps
//   3 the seven bundle cards                8 the "colours at work" panel + switch
//   4 the Ramps header and Base step        9 token names, Copy N variables, code box
//   5 the four role rows
//
// Strings pinned here are the ones the board settled. The Cool bundle's
// description and the two code-box button labels are still being approved, so
// they are NOT pinned: Cool's is checked only as visible text that fits, and the
// toggle is found by its aria-controls, with its label checked against the count.
//
// Every test names a MUTATION: a temporary change to src/pages/ColorStudio.jsx
// or src/styles/pages/semantic-color.css that makes its main assertion fail. Each
// was applied once, seen to fail, and restored.
import { test, expect } from './base.js'
import { go, watch, signIn } from './helpers.js'

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
const ROLES = [
  { id: 'success', name: 'Success', cue: '✓', meaning: 'Completed, connected or ready' },
  { id: 'warning', name: 'Warning', cue: '!', meaning: 'Needs attention before continuing' },
  { id: 'error', name: 'Error', cue: '×', meaning: 'Failed, destructive or blocked' },
  { id: 'info', name: 'Information', cue: 'i', meaning: 'Context, or work that is underway' },
]
// Each role lists its six presets and Custom; this is the order the page uses.
const PRESET_TAIL = ['Apple', 'Material', 'Tailwind']
const CHIPS = {
  success: ['Emerald', 'Green', 'Teal', ...PRESET_TAIL, 'Custom'],
  warning: ['Amber', 'Yellow', 'Orange', ...PRESET_TAIL, 'Custom'],
  error: ['Red', 'Rose', 'Pink', ...PRESET_TAIL, 'Custom'],
  info: ['Blue', 'Sky', 'Indigo', ...PRESET_TAIL, 'Custom'],
}
const BUNDLES = ['Balanced', 'Material', 'Vivid', 'Cool', 'Warm', 'Apple', 'Tailwind']
// The six descriptions that are settled. Cool's is still being written.
const SETTLED_DESCRIPTIONS = {
  Balanced: 'Familiar, calm defaults for most product UI.',
  Material: 'Established Material state foundations.',
  Vivid: 'Higher chroma for expressive interfaces.',
  Warm: 'Classic green, amber and red signals.',
  Apple: 'System colours aligned with Apple platforms.',
  Tailwind: 'Direct mapping to Tailwind colour ramps.',
}
// Four aliases (--color-<role>) and four ramps of ten steps. Worked out by hand,
// not read from the page: 4 + 4 x 10.
const VARIABLE_COUNT = 44

/** A fresh context on the built page: signed out, one theme, optional phone. */
async function openPage(browser, { width = 1440, height = 900, theme = 'light', phone = false, account = null } = {}) {
  const ctx = await browser.newContext(phone
    ? { viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS_UA, colorScheme: theme }
    : { viewport: { width, height }, colorScheme: theme })
  await ctx.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  const page = await ctx.newPage()
  watch(page, 'a designer setting up status colours')
  if (account) await signIn(page, account)
  await go(page, '/create/semantic-color')
  await expect(page.locator('.stc-ramp')).toHaveCount(4)
  return { ctx, page }
}

const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText())
const declarations = (css) => (css.match(/^\s+--color-[a-z0-9-]+:\s*#[0-9a-f]{6};/gim) || []).length

test.describe('Semantic Colour, rebuilt', () => {
  // ── 1. The nine parts ──────────────────────────────────────────────────────
  //
  // MUTATION: delete the `<section className="stc-tokens" …>` block, or the
  // `<ToolPills className="stc-chips" …>` of a role, or change the lead line's
  // wording: the matching part goes red. Re-add the retired link list (any
  // `<a href="/create/typography">` inside `.stc`) and the absence check goes red.
  test('all nine parts are on the page, in order, and the dropped ones stay dropped', async ({ browser }) => {
    const { ctx, page } = await openPage(browser)
    const root = page.locator('.stc')

    // 1 · the title is the page's one h1.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Semantic Colour')

    // 2 · the lead line.
    const lead = root.locator('.stc-intro > .stc-lead')
    await expect(lead).toContainText('Set success, warning, error and information colours.')
    await expect(lead).toContainText('Every role gets a full 50 to 900 ramp.')

    // 3 · seven bundle cards: name, a four-segment stripe, a visible description.
    const bundles = page.getByRole('radiogroup', { name: 'Semantic colour bundle' }).getByRole('radio')
    await expect(bundles).toHaveCount(BUNDLES.length)
    for (const [i, name] of BUNDLES.entries()) {
      const card = bundles.nth(i)
      await expect(card, `bundle ${i + 1} is ${name}`).toHaveAccessibleName(name)
      await expect(card.locator('.stc-bundle-strip i'), `${name} has a stripe of four roles`).toHaveCount(4)
      const desc = card.locator('.stc-bundle-desc')
      await expect(desc, `${name} shows its description as text`).toBeVisible()
      if (SETTLED_DESCRIPTIONS[name]) await expect(desc).toHaveText(SETTLED_DESCRIPTIONS[name])
      else expect((await desc.innerText()).trim().length, `${name} has a description`).toBeGreaterThan(10)
    }
    await expect(bundles.nth(0), 'Balanced is the one that is on').toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('.stc-bundles [aria-checked="true"]')).toHaveCount(1)

    // 4 · the Ramps header with the Base step pills.
    await expect(page.getByRole('heading', { level: 2, name: 'Ramps' })).toBeVisible()
    const base = page.getByRole('group', { name: 'Base step' })
    await expect(base.getByRole('button')).toHaveText(['Step 400', 'Step 500', 'Step 600'])
    await expect(base.getByRole('button', { name: 'Step 500' })).toHaveAttribute('aria-pressed', 'true')

    // 5 · four role rows, each with its cue, name, meaning and token. No Pending.
    await expect(root.locator('.stc-fam')).toHaveCount(4)
    for (const role of ROLES) {
      const row = root.locator(`.stc-fam[data-role="${role.id}"]`)
      await expect(row.locator('.stc-fam-name')).toHaveText(`${role.cue}${role.name}`)
      await expect(row.locator('.stc-fam-meaning')).toHaveText(role.meaning)
      await expect(row.locator('.stc-fam-token')).toHaveText(`--color-${role.id}`)

      // 6 · every preset as a visible chip, plus Custom; exactly one is on.
      const chips = row.getByRole('group', { name: `${role.name} preset` })
      await expect(chips.getByRole('button'), `${role.name} lists its presets and Custom`).toHaveText(CHIPS[role.id])
      await expect(chips.locator('[aria-pressed="true"]')).toHaveCount(1)

      // 7 · a ramp of ten steps, labelled by its step numbers.
      const ramp = row.getByRole('group', { name: `${role.name} ramp, 10 steps` })
      await expect(ramp.getByRole('button')).toHaveCount(10)
      await expect(ramp.locator('.stc-cell-tone')).toHaveText(STEPS)
    }
    // Information also has its family choice.
    await expect(root.locator('.stc-fam[data-role="info"]').getByRole('group', { name: 'Family' }).getByRole('button')).toHaveText(['Blue', 'Purple'])

    // 8 · the "colours at work" panel: five components, a caption and a switch.
    await expect(page.getByRole('heading', { level: 2, name: 'See each role do its job' })).toBeVisible()
    await expect(root.locator('.stc-work-body > .stc-sc')).toHaveCount(5)
    await expect(root.locator('.stc-work-head strong')).toHaveText('Light interface')
    await expect(page.getByRole('group', { name: 'Preview theme' }).getByRole('button')).toHaveText(['Light', 'Dark'])

    // 9 · token names: the explanation, Copy N variables, and the code box with its toggle.
    await expect(page.getByRole('heading', { level: 2, name: 'Token names you can predict' })).toBeVisible()
    await expect(root.getByRole('button', { name: `Copy ${VARIABLE_COUNT} variables` })).toBeVisible()
    await expect(root.locator('.stc-code')).toContainText('--color-success-50:')
    await expect(root.locator('.stc-code-toggle')).toBeVisible()

    // The nine, in page order: each anchor is followed by the next.
    const inOrder = await page.evaluate(() => {
      const anchors = [
        document.querySelector('h1'),
        document.querySelector('.stc-intro > .stc-lead'),
        document.querySelector('.stc-bundles'),
        document.querySelector('#stc-ramps-title'),
        document.querySelector('.stc-fam[data-role="success"] .stc-fam-name'),
        document.querySelector('.stc-fam[data-role="success"] .stc-chips'),
        document.querySelector('.stc-fam[data-role="success"] .stc-ramp'),
        document.querySelector('#stc-work-title'),
        document.querySelector('#stc-tokens-title'),
      ]
      if (anchors.some((a) => !a)) return { missing: anchors.map((a) => !!a) }
      const bad = []
      for (let i = 1; i < anchors.length; i++) {
        if (!(anchors[i - 1].compareDocumentPosition(anchors[i]) & Node.DOCUMENT_POSITION_FOLLOWING)) bad.push(i)
      }
      return { bad }
    })
    expect(inOrder, 'the nine parts follow one another in page order').toEqual({ bad: [] })

    // DROPPED, on the board's word: the tool-link list and the next-step link.
    await expect(page.getByRole('heading', { name: /More colour tools/i })).toHaveCount(0)
    await expect(root.locator('a[href="/create/typography"], a[href="/create/palette"], a[href="/create/gradient"], a[href="/create/tint"], a[href="/create/contrast"]')).toHaveCount(0)
    await expect(root.getByText(/Next: Typography|Next step/i)).toHaveCount(0)
    await expect(root.getByText(/pending/i)).toHaveCount(0)
    await ctx.close()
  })

  // ── 2. The panel switch repaints the panel and nothing else ─────────────────
  //
  // MUTATION: in ColorStudio.jsx make the panel's switch call `setTheme` from
  // useTheme() instead of `setSceneChoice` (the page theme moves, and the page
  // background assertion goes red); or drop `data-theme={sceneTheme}` from the
  // figure (the panel's computed background no longer flips and the first
  // assertion goes red).
  for (const pageTheme of ['light', 'dark']) {
    const other = pageTheme === 'light' ? 'dark' : 'light'
    test(`the Light / Dark switch repaints only the panel, with the page in ${pageTheme}`, async ({ browser }) => {
      const { ctx, page } = await openPage(browser, { theme: pageTheme })
      const switchGroup = page.getByRole('group', { name: 'Preview theme' })
      const snapshot = () => page.evaluate(() => {
        const bg = (sel) => getComputedStyle(document.querySelector(sel)).backgroundColor
        return {
          around: {
            htmlTheme: document.documentElement.getAttribute('data-theme'),
            stored: localStorage.getItem('vs-t'),
            page: bg('body'),
            bundle: bg('.stc-bundle:not(.is-on)'),
            chip: bg('.stc-chips .tl-pill:not(.is-on)'),
            code: bg('.stc-code'),
            ramp: bg('.stc-ramps'),
          },
          panel: {
            theme: document.querySelector('.stc-work').getAttribute('data-theme'),
            bg: bg('.stc-work'),
            text: getComputedStyle(document.querySelector('.stc-work')).color,
            caption: document.querySelector('.stc-work-head strong').textContent,
          },
        }
      })

      const before = await snapshot()
      expect(before.around.htmlTheme, 'the page starts in the theme asked for').toBe(pageTheme)
      expect(before.panel.theme, 'until it is used, the panel follows the page').toBe(pageTheme)
      await expect(switchGroup.getByRole('button', { name: pageTheme === 'light' ? 'Light' : 'Dark' })).toHaveAttribute('aria-pressed', 'true')

      await switchGroup.getByRole('button', { name: other === 'light' ? 'Light' : 'Dark', exact: true }).click()
      await expect(page.locator('.stc-work')).toHaveAttribute('data-theme', other)
      const after = await snapshot()

      // The panel flips: its own theme, its ground, its text, its caption.
      expect(after.panel.theme).toBe(other)
      expect(after.panel.bg, 'the panel ground changes').not.toBe(before.panel.bg)
      expect(after.panel.text, 'the panel text changes').not.toBe(before.panel.text)
      expect(after.panel.caption).toBe(other === 'light' ? 'Light interface' : 'Dark interface')
      await expect(switchGroup.getByRole('button', { name: other === 'light' ? 'Light' : 'Dark' })).toHaveAttribute('aria-pressed', 'true')

      // Everything else holds still: the page's theme, its stored choice, its ground,
      // and the controls around the panel.
      expect(after.around, 'only the panel moved').toEqual(before.around)
      expect(after.around.htmlTheme, "the page's own theme is unchanged").toBe(pageTheme)

      // And it is reversible, back to the exact same paint.
      await switchGroup.getByRole('button', { name: pageTheme === 'light' ? 'Light' : 'Dark', exact: true }).click()
      await expect(page.locator('.stc-work')).toHaveAttribute('data-theme', pageTheme)
      expect(await snapshot()).toEqual(before)
      await ctx.close()
    })
  }

  // ── 3. Swatches: step numbers, no hex ──────────────────────────────────────
  //
  // MUTATION: in StateShade put `{label} {shade}` (or the hex) inside
  // `.stc-cell-tone`: the text assertion goes red on the first swatch. Remove the
  // hex from the `aria-label` and the accessible-name assertion goes red.
  for (const [width, phone] of [[1440, false], [390, true]]) {
    test(`every swatch prints its step number and no hex, at ${width}`, async ({ browser }) => {
      const { ctx, page } = await openPage(browser, { width, height: phone ? 844 : 900, phone })
      for (const role of ROLES) {
        const cells = page.locator(`.stc-fam[data-role="${role.id}"] .stc-cell`)
        await expect(cells, `${role.name}: ten swatches`).toHaveCount(10)
        // What a person can see written on the swatch is exactly its step.
        expect(await cells.evaluateAll((els) => els.map((e) => e.innerText.trim())), `${role.name}: the face reads 50 to 900`).toEqual(STEPS)
        expect(await cells.evaluateAll((els) => els.filter((e) => /#|[0-9a-f]{6}/i.test(e.innerText)).length), `${role.name}: no hex on any face`).toBe(0)
        // The hex is still there for a screen reader and the clipboard: in the name.
        const names = await cells.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
        names.forEach((n, i) => expect(n, `${role.name} ${STEPS[i]}`).toMatch(new RegExp(`^Copy ${STEPS[i]}, #[0-9A-F]{6}`)))
        // Exactly one swatch is the base step, and it says so.
        expect(names.filter((n) => n.endsWith(', the base step')), `${role.name}: one base step`).toHaveLength(1)
      }
      await ctx.close()
    })
  }

  // ── 4. Copy tokens is the only accent fill ─────────────────────────────────
  //
  // "Accent-filled" is measured, not looked up by class: a control whose computed
  // background is the page's `--accent-fill` (read off a probe element, so a
  // theme change cannot leave a stale literal). The Add to project popover is the
  // one place a second accent fill is allowed (its Save button), and it is
  // included here as the POSITIVE CONTROL that the measurement can see one.
  //
  // MUTATION: give `.stc-bundle.is-on` (or `.tl-pill.is-on`, or `.stc-code-toggle`)
  // `background: var(--accent-fill)` in semantic-color.css, or pass
  // `variant="accent"` to the "Copy N variables" ToolButton: the list of accent
  // fills grows past ["Copy tokens"] and this goes red.
  for (const theme of ['light', 'dark']) {
    test(`Copy tokens is the only accent-filled control outside the popover, in ${theme}`, async ({ browser }) => {
      const { ctx, page } = await openPage(browser, { theme, account: { plan: 'free', projects: 1 } })

      const accentFills = () => page.evaluate(() => {
        const root = document.querySelector('.stc')
        const probe = document.createElement('i')
        probe.style.background = 'var(--accent-fill)'
        root.appendChild(probe)
        const accent = getComputedStyle(probe).backgroundColor
        probe.remove()
        const found = { outside: [], inside: [], accent }
        for (const el of root.querySelectorAll('button, a[href], [role=button], [role=radio], summary, input')) {
          if (!el.getClientRects().length) continue
          if (getComputedStyle(el).backgroundColor !== accent) continue
          const name = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
          found[el.closest('[role=dialog]') ? 'inside' : 'outside'].push(name)
        }
        return found
      })

      // Resting state, then states that move paint: another bundle, a chip, Custom, the code box open.
      expect((await accentFills()).outside).toEqual(['Copy tokens'])
      await page.getByRole('radio', { name: 'Vivid' }).click()
      await page.locator('[data-role="warning"]').getByRole('button', { name: 'Orange' }).click()
      await page.locator('[data-role="error"]').getByRole('button', { name: 'Custom' }).click()
      await page.locator('.stc-code-toggle').click()
      await page.getByRole('button', { name: 'Purple family' }).click()
      await page.getByRole('button', { name: 'Step 600' }).click()
      expect((await accentFills()).outside, 'after changing things, still only Copy tokens').toEqual(['Copy tokens'])
      // Hover and focus are paint too.
      await page.getByRole('button', { name: `Copy ${VARIABLE_COUNT} variables` }).hover()
      expect((await accentFills()).outside).toEqual(['Copy tokens'])

      // POSITIVE CONTROL: with the popover open the detector does see an accent fill, inside it.
      await page.getByRole('button', { name: 'Add to project' }).click()
      await expect(page.getByRole('dialog', { name: 'Add current design to project' })).toBeVisible()
      const open = await accentFills()
      expect(open.inside, 'the popover has its own primary, and the measurement can see it').toEqual(['Save'])
      expect(open.outside, 'and it is the only other one').toEqual(['Copy tokens'])
      await ctx.close()
    })
  }

  // ── 5. Show all N variables ────────────────────────────────────────────────
  //
  // MUTATION: (a) in the toggle's `onClick` stop flipping `codeOpen`: the
  // aria-expanded assertion goes red. (b) Make `tokenCount` count `ROLE_IDS.length * 10`
  // (drops the four aliases, 40): the label no longer matches the copied
  // variables and the count assertion goes red. (c) Give `.stc-code` a fixed
  // `max-height: 168px` always: the box does not grow and the height assertion
  // goes red.
  test('the code box expands behind "Show all N variables", and N is the copied variable count', async ({ browser }) => {
    const { ctx, page } = await openPage(browser)
    const toggle = page.locator('.stc-code-toggle')
    const box = page.locator('.stc-code')
    const heights = () => box.evaluate((el) => ({ shown: el.clientHeight, whole: el.scrollHeight }))

    // Collapsed: the label carries N, the box scrolls inside itself.
    await expect(toggle).toHaveText(`Show all ${VARIABLE_COUNT} variables`)
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    const wrapId = await toggle.getAttribute('aria-controls')
    await expect(page.locator(`#${wrapId} .stc-code`), 'the toggle controls the code box').toHaveCount(1)
    const closed = await heights()
    expect(closed.whole, 'collapsed, there is more code than is shown').toBeGreaterThan(closed.shown + 40)

    // Open: the label flips, and every line is on show with no inner scroll.
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(toggle).not.toHaveText(`Show all ${VARIABLE_COUNT} variables`)
    const opened = await heights()
    expect(opened.shown, 'the box grew').toBeGreaterThan(closed.shown * 2)
    expect(opened.whole, 'all of it is shown, none scrolls inside').toBeLessThanOrEqual(opened.shown + 1)

    // N, three ways, against a hand-worked 44 (four aliases + four ramps of ten):
    // the label, the lines in the box, and the variables Copy tokens puts on the clipboard.
    const inBox = declarations(await box.innerText())
    expect(inBox, 'variables written in the code box').toBe(VARIABLE_COUNT)
    await page.getByRole('button', { name: 'Copy tokens' }).click()
    const copied = await clipboard(page)
    expect(declarations(copied), 'variables copied by Copy tokens').toBe(VARIABLE_COUNT)
    expect(inBox).toBe(declarations(copied))

    // The button beside the box copies the very same text.
    await page.getByRole('button', { name: `Copy ${VARIABLE_COUNT} variables` }).click()
    expect(await clipboard(page), 'Copy N variables copies what Copy tokens copies').toBe(copied)

    // And closing puts it back.
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toHaveText(`Show all ${VARIABLE_COUNT} variables`)
    expect((await heights()).shown).toBe(closed.shown)
    await ctx.close()
  })

  // ── 6. Keyboard: the tab order, and the ramp keys ──────────────────────────
  //
  // The tab walk starts on Copy tokens (the toolbar's last stop) and goes to the
  // end of the page. A ramp is ONE stop (roving tabindex), so the walk meets four
  // ramp stops, not forty; the bundles are one stop too.
  //
  // MUTATION: give every `StateShade` `tabIndex={0}` (the walk meets forty swatch
  // stops and the order goes red); or move the `<ToolPills className="stc-chips">`
  // after `<Ramp …/>` (chips come after their ramp and the order goes red); or
  // make Home in `Ramp`'s `onKey` jump to 1 instead of 0 (the key test goes red).
  test('the tab order runs toolbar, bundles, base step, then each role, then the panel switch and the code', async ({ browser }) => {
    const { ctx, page } = await openPage(browser)
    const stopName = () => page.evaluate(() => {
      const el = document.activeElement
      const name = el.getAttribute('aria-label') || el.textContent.trim().replace(/\s+/g, ' ')
      return { name: name.slice(0, 48), inRamp: !!el.closest('.stc-ramp'), ring: getComputedStyle(el).outlineStyle + ' ' + getComputedStyle(el).outlineWidth }
    })
    // Balanced is on, with its Success preset Green, so the base swatch is Green 500.
    const rampStop = 'Copy 500, #22C55E, the base step'
    const expected = [
      'Balanced',
      'Step 400', 'Step 500', 'Step 600',
      ...CHIPS.success, rampStop,
      ...CHIPS.warning, 'Copy 500, #F59E0B, the base step',
      ...CHIPS.error, 'Copy 500, #EF4444, the base step',
      'Blue family', 'Purple family', ...CHIPS.info, 'Copy 500, #3B82F6, the base step',
      'Light', 'Dark',
      `Copy ${VARIABLE_COUNT} variables`, 'Semantic colour tokens', `Show all ${VARIABLE_COUNT} variables`,
    ]

    await page.getByRole('button', { name: 'Copy tokens' }).focus()
    const walked = []
    const rings = []
    for (let i = 0; i < expected.length; i++) {
      await page.keyboard.press('Tab')
      const stop = await stopName()
      walked.push(stop.name)
      if (stop.inRamp) rings.push(stop.ring)
    }
    expect(walked, 'the tab order').toEqual(expected)
    expect(walked.filter((n) => n.startsWith('Copy ') && n.includes(', #')), 'one stop per ramp').toHaveLength(4)
    expect(rings, 'every ramp stop shows a focus ring').toEqual(Array(4).fill('solid 2px'))
    await ctx.close()
  })

  test('on a ramp, the arrows, Home and End move one step, and Enter and Space copy', async ({ browser }) => {
    const { ctx, page } = await openPage(browser)
    const ramp = page.getByRole('group', { name: 'Success ramp, 10 steps' })
    const cells = ramp.getByRole('button')
    const focusedStep = () => page.evaluate(() => document.activeElement.getAttribute('aria-label').match(/^Copy (\d+),/)?.[1] ?? null)
    const tabbable = () => cells.evaluateAll((els) => els.filter((e) => e.tabIndex === 0).map((e) => e.getAttribute('aria-label').match(/^Copy (\d+),/)[1]))

    // One tab stop, resting on the base step.
    expect(await tabbable(), 'a ramp is one tab stop').toEqual(['500'])
    await cells.nth(5).focus()
    expect(await focusedStep()).toBe('500')

    await page.keyboard.press('ArrowRight')
    expect(await focusedStep(), 'ArrowRight is one step on').toBe('600')
    expect(await tabbable(), 'the one tab stop follows focus').toEqual(['600'])
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    expect(await focusedStep(), 'ArrowLeft is one step back').toBe('400')
    await page.keyboard.press('End')
    expect(await focusedStep(), 'End is the last step').toBe('900')
    await page.keyboard.press('ArrowRight')
    expect(await focusedStep(), 'it stops at the end').toBe('900')
    await page.keyboard.press('Home')
    expect(await focusedStep(), 'Home is the first step').toBe('50')
    await page.keyboard.press('ArrowLeft')
    expect(await focusedStep(), 'it stops at the start').toBe('50')

    // Enter and Space copy that swatch's hex.
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    expect(await focusedStep()).toBe('200')
    const hex = (await page.evaluate(() => document.activeElement.getAttribute('aria-label'))).match(/#[0-9A-F]{6}/)[0].toLowerCase()
    await page.keyboard.press('Enter')
    expect((await clipboard(page)).toLowerCase(), 'Enter copies the swatch').toBe(hex)
    await page.evaluate(() => navigator.clipboard.writeText('cleared'))
    await page.keyboard.press('Space')
    expect((await clipboard(page)).toLowerCase(), 'Space copies the swatch').toBe(hex)

    // Another ramp is its own group: keys in one do not move the other.
    expect(await page.getByRole('group', { name: 'Warning ramp, 10 steps' }).getByRole('button').evaluateAll((els) => els.filter((e) => e.tabIndex === 0).length)).toBe(1)
    await ctx.close()
  })

  // ── 7. No sideways scroll on a phone ───────────────────────────────────────
  //
  // Measured on the document, in the resting page and with everything that can
  // widen it switched on: the code box open, Custom (the hue row and its hex
  // field) on every role, Purple Information, a long bad-hex message showing.
  //
  // MUTATION: give `.stc-ramp` `grid-template-columns: repeat(10, 56px)` below
  // 600px, or `.stc-code` `white-space: pre; width: max-content` outside its
  // wrapper: the document grows past the viewport and this goes red.
  for (const width of [390, 320]) {
    test(`the page does not scroll sideways at ${width}`, async ({ browser }) => {
      const { ctx, page } = await openPage(browser, { width, height: 844, phone: true })
      const overflow = () => page.evaluate(() => ({
        doc: document.documentElement.scrollWidth - window.innerWidth,
        body: document.body.scrollWidth - window.innerWidth,
        wide: [...document.querySelectorAll('.stc *')]
          .filter((el) => el.getClientRects().length && el.getBoundingClientRect().right > window.innerWidth + 1 && !el.closest('.stc-code'))
          .slice(0, 4).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`),
      }))
      const read = await overflow()
      expect(read.doc, 'the document is not wider than the screen').toBeLessThanOrEqual(0)
      expect(read.body).toBeLessThanOrEqual(0)
      expect(read.wide, 'nothing in the page reaches past the screen edge').toEqual([])

      await page.locator('.stc-code-toggle').click()
      await page.getByRole('button', { name: 'Purple family' }).click()
      for (const role of ROLES) await page.locator(`[data-role="${role.id}"]`).getByRole('button', { name: 'Custom' }).click()
      const hexField = page.getByRole('textbox', { name: 'Import a hex colour for info' })
      await hexField.fill('nope')
      await hexField.press('Enter')
      await expect(page.locator('[data-role="info"] .stc-hue-err')).toBeVisible()
      const busy = await overflow()
      expect(busy.doc, 'still not wider with everything open').toBeLessThanOrEqual(0)
      expect(busy.wide).toEqual([])
      await ctx.close()
    })
  }

  // ── 8. Bundle descriptions fit in two lines ────────────────────────────────
  //
  // The longest description is found on the page (whatever the wording of Cool
  // becomes), and every description is measured by the lines its text occupies.
  //
  // MUTATION: lengthen COOL_BUNDLE_DESC to about 100 characters (three lines at
  // the narrowest card): the longest-description assertion goes red at both
  // widths. Or set `.stc-bundle-desc { white-space: nowrap }`: one line, but it
  // is cut off, and the "nothing is cut" assertion goes red.
  for (const [width, phone] of [[390, true], [1200, false]]) {
    test(`the longest bundle description stays within two lines at ${width}`, async ({ browser }) => {
      const { ctx, page } = await openPage(browser, { width, height: phone ? 844 : 900, phone })
      const measured = await page.evaluate(() => [...document.querySelectorAll('.stc-bundle')].map((card) => {
        const desc = card.querySelector('.stc-bundle-desc')
        const range = document.createRange()
        range.selectNodeContents(desc)
        const lineTops = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)))
        const box = desc.getBoundingClientRect()
        const cardBox = card.getBoundingClientRect()
        return {
          name: card.getAttribute('aria-label'),
          text: desc.textContent.trim(),
          lines: lineTops.size,
          cut: desc.scrollWidth > desc.clientWidth + 1 || desc.scrollHeight > desc.clientHeight + 1,
          overflowsCard: box.bottom > cardBox.bottom + 0.5 || box.right > cardBox.right + 0.5,
          visible: box.width > 0 && box.height > 0 && getComputedStyle(desc).visibility === 'visible',
          cardWidth: Math.round(cardBox.width),
        }
      }))
      expect(measured, 'seven cards').toHaveLength(7)
      const longest = measured.reduce((a, b) => (b.text.length > a.text.length ? b : a))
      expect(longest.text.length, 'the longest description is a real sentence').toBeGreaterThan(40)
      expect(longest.lines, `the longest description (${longest.name}, ${longest.text.length} characters) in a ${longest.cardWidth}px card`).toBeLessThanOrEqual(2)
      for (const m of measured) {
        expect(m.visible, `${m.name}: description is visible text`).toBe(true)
        expect(m.lines, `${m.name}: lines`).toBeLessThanOrEqual(2)
        expect(m.cut, `${m.name}: nothing is cut off`).toBe(false)
        expect(m.overflowsCard, `${m.name}: stays inside its card`).toBe(false)
      }
      await ctx.close()
    })
  }
})
