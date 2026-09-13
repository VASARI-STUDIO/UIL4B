// /projects across the width matrix and the account states, asserted on
// RENDERED GEOMETRY and on COMPUTED ROLES rather than on markup.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY IT EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// The founder said, unprompted and without elaborating, "i dont like the
// projects page". Rendered on the built preview at 320/360/390/430/768/834/
// 1024/1280/1440/1920 in both themes, signed out, empty, with one project, at
// the free cap of three and as Pro, the page had no horizontal overflow, no
// element painting outside its container and no operable target under 24px.
// The geometry was clean. What was wrong was what the page was made of, and
// three of the four findings are things a test can hold.
//
//   1. IT INVENTED A COMMUNITY. A "Community" tab beside a person's own saved
//      work rendered four hard-coded design systems credited to four people who
//      do not exist — Sunset Brand by Maya R., Fintech Blue by Devon K., Forest
//      Co. by Sam T., Mono Minimal by Alex P. — under the sentence "Explore
//      design systems shared by the community." "Maya R." is the SAME invented
//      designer the 2026-08-11 site audit deleted from the real Community
//      surface. tests/unit/community-seed.test.js was written to stop exactly
//      that coming back and only ever read COMMUNITY_DESIGNS, so a second copy
//      of it went on shipping for a month. The unit guard now reads the SOURCE
//      of every surface that renders a community; this file holds the rendered
//      half.
//
//   2. IT INVENTED A TAXONOMY. Five folder chips — All, Brand, App, Marketing,
//      Personal — from a fixed array with no creation, rename or delete control
//      anywhere in the repository, filed into localStorage and nowhere else. So
//      a project sorted on a laptop was unsorted on the phone, on a page whose
//      own subtitle promises "yours to open anywhere you sign in". #452 had
//      already deleted the false "3 folders · Upgrade for 10" sentence and left
//      the mechanism; the founder's call on 2026-09-13 was to drop folders as
//      an entitlement entirely.
//
//   3. THE PROMOS SAT ABOVE THE WORK. This is the one a person actually hits,
//      and it is the same class of defect as #458 one state over. #458 moved
//      the NEXT|TIP band below the EMPTY state and left it above the list for
//      an account that HAS projects. Measured at 390x844, free plan, on the
//      build before this branch:
//
//          1 project    first project card top y=781 — 709px of page between
//                       the h1 and the user's own work, 63px of card above an
//                       844px fold
//          3 projects   first project card top y=882 — THE WHOLE LIST BELOW
//                       THE FOLD, on the page that holds everything the
//                       account has made
//          1440, 3 projects   first card top y=607
//
//      The band is 258px of that at phone widths, because it collapses to one
//      column at <=860px and is therefore widest exactly where vertical space
//      is scarcest. What it spent those 258px on, above a person's own saved
//      work, was a rotating typography tip.
//
//      AFTER: 396 with one project, 497 at the cap (the card now ends at 739,
//      inside the fold), 350 at 1440. The band renders once, below the grid, in
//      every state — the order the empty account already used.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS ASSERTED, AND WHY IT IS NOT MARKUP
// ─────────────────────────────────────────────────────────────────────────────
// The seven view and filter controls that are now gone were plain <button>s.
// Read off Chrome's OWN accessibility tree through CDP — not off the source —
// every one of them reported selected=undefined, pressed=undefined,
// current=undefined: nothing but a CSS class said which tab or which folder the
// reader was looking at. A markup-shaped assertion ("no .proj-tab in the DOM")
// would pass the day someone rebuilds the same thing with different class
// names. So the absences here are asserted over the rendered accessibility tree
// and the rendered text of <main>, and the presences are asserted as measured
// boxes in viewport coordinates.
//
// THE POSITIVE CONTROL is not optional here and it is not decorative. Almost
// every assertion in this file is an ABSENCE — no invented designer, no folder
// mechanism, no second counter — and an absence passes trivially against a
// probe that reads nothing at all: a page that failed to render, a selector
// that stopped matching, a CDP session that returned an empty tree. `the probe
// can see what it is looking for` plants each shape the other tests deny,
// inside the live page, and fails unless the probe reports it. Without it, a
// broken probe would report this surface perfect.
import { test, expect } from './base.js'
import { signIn, go, watch, expectRendered } from './helpers.js'

// Every width in the lane's matrix. 834 and 430 are in because the iPad mini
// and the Pro Max are, and 320 is in because it is the floor the reflow gate
// uses.
const WIDTHS = [320, 360, 390, 430, 768, 834, 1024, 1280, 1440, 1920]
const PHONE = { width: 390, height: 844 }

// Kept as an ARRAY rather than a comma string, so every probe below is forced
// to scope each item. See the note in axControls.
const FOCUSABLE = ['a[href]', 'button', 'input', 'select', 'textarea', '[tabindex]:not([tabindex="-1"])', 'summary']

// The account states that only exist for a real session. `signIn` writes the
// same localStorage key ProjectContext saves to, under the account's own email,
// so the cap counts these the way it counts real ones.
const STATES = [
  { name: 'empty', opts: { plan: 'free', projects: 0 } },
  { name: 'one project', opts: { plan: 'free', projects: 1 } },
  { name: 'at the free cap', opts: { plan: 'free', projects: 3 } },
  { name: 'Pro', opts: { plan: 'pro', projects: 5 } },
]

/** Geometry of one element in viewport coordinates, or null if it is not there. */
async function boxOf(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return null
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }
  }, selector)
}

/**
 * Chrome's computed role, accessible name and selection state for every
 * focusable inside <main> — through CDP, so it is what an assistive technology
 * would actually be handed rather than what the JSX says.
 */
async function axControls(page, context) {
  const count = await page.evaluate((parts) => {
    // SCOPE EVERY ITEM OF THE LIST. `'main ' + 'a,button,…'` scopes only the
    // FIRST item and leaves the rest global — CSS selector-list precedence —
    // so the primary nav and the footer came back inside what was supposed to
    // be the page's own controls. Found by a mutation that should have failed
    // this file and did not.
    const sel = parts.map((part) => '.sec.uh ' + part).join(',')
    const els = [...document.querySelectorAll(sel)].filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })
    els.forEach((el, i) => el.setAttribute('data-axprobe', String(i)))
    return els.length
  }, FOCUSABLE)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Accessibility.enable')
  await cdp.send('DOM.enable')
  const rows = []
  for (let i = 0; i < count; i++) {
    const { result } = await cdp.send('Runtime.evaluate', { expression: `document.querySelector('[data-axprobe="${i}"]')` })
    const { node } = await cdp.send('DOM.describeNode', { objectId: result.objectId })
    const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { backendNodeId: node.backendNodeId, fetchRelatives: false })
    const n = nodes[0]
    if (!n) continue
    const props = Object.fromEntries((n.properties || []).map((pr) => [pr.name, pr.value?.value]))
    rows.push({
      role: n.role?.value || '',
      name: n.name?.value || '',
      selected: props.selected,
      pressed: props.pressed,
      current: props.current,
    })
  }
  await cdp.detach()
  return rows
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE FABRICATION
// ─────────────────────────────────────────────────────────────────────────────
test.describe('/projects credits no one who does not exist', () => {
  // The exact strings that were rendered to real users. A name is the cheapest
  // possible tell, and these five are the ones this repository has actually
  // shipped: four from the removed tab, one from the 2026-08-11 audit.
  const INVENTED = ['Maya R.', 'Devon K.', 'Sam T.', 'Alex P.']
  const INVENTED_WORK = ['Sunset Brand', 'Fintech Blue', 'Forest Co.', 'Mono Minimal']

  for (const state of STATES) {
    test(`no invented designer or design system is rendered — ${state.name}`, async ({ page }) => {
      watch(page, `a ${state.name} account reading its own projects page`)
      await signIn(page, state.opts)
      await go(page, '/projects')
      await expectRendered(page, '/projects')

      const text = await page.locator('main').innerText()
      for (const name of INVENTED) {
        expect(text, `the page credits "${name}", who does not exist`).not.toContain(name)
      }
      for (const work of INVENTED_WORK) {
        expect(text, `the page shows "${work}", which nobody made`).not.toContain(work)
      }
      // And the sentence that framed them as other people's work.
      expect(text, 'the page claims designs were shared by a community')
        .not.toContain('shared by the community')
    })
  }

  test('there is no second view to hide it in', async ({ page }) => {
    // The fabrication lived behind a tab, so it was invisible to anything that
    // only read the default view. Asserted on the computed role list: whatever
    // a future tab bar is built out of, a control that switches this page to a
    // community is named one of these.
    watch(page, 'somebody looking for the community tab that used to be here')
    await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const controls = await axControls(page, page.context())
    const names = controls.map((c) => c.name)
    expect(names, 'a Community view control is back on /projects').not.toContain('Community')
    expect(names, 'and so is the My Projects tab that paired with it').not.toContain('My Projects')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE TAXONOMY
// ─────────────────────────────────────────────────────────────────────────────
test.describe('/projects offers no folder it cannot keep', () => {
  for (const plan of ['free', 'pro']) {
    test(`no folder mechanism on ${plan}`, async ({ page }) => {
      watch(page, `a ${plan} account looking for somewhere to file a project`)
      await signIn(page, { plan, projects: 2 })
      await go(page, '/projects')
      await expectRendered(page, '/projects')
      await expect(page.locator('.uh-grid .proj-card')).toHaveCount(2)

      // The word, anywhere a reader could see it on this surface. It covers the
      // chip row, the per-card select, the modal field and the sentence about
      // an allowance, without naming any of their classes.
      await expect(page.locator('.sec.uh'), 'the surface still says "folder"')
        .not.toContainText(/folder/i)

      // AN ALLOWLIST, NOT A DENYLIST, and the reason is a mutation that got
      // through. The first version of this asserted that the five category
      // labels were absent. Re-adding the chip row with LOWERCASE labels
      // ('brand', 'app', 'marketing') passed it, and so would any rebuild of
      // the same idea under any other words — which is the whole failure mode
      // the anti-slop bar calls “the same control, renamed”.
      //
      // So this names what SHOULD be between the masthead and the grid, and
      // fails on anything else. Four controls: the two the masthead has always
      // carried, and the two that filter the list.
      const ALLOWED_ABOVE_THE_GRID = ['Save Current', 'New Project', 'Search projects…', 'SORT']
      const above = await page.evaluate((parts) => {
        const grid = document.querySelector('.uh-grid')
        const gridTop = grid.getBoundingClientRect().top + window.scrollY
        // Operable controls only — buttons, fields and menus. Links inside the
        // quota sentence ("Pro lifts the cap") are prose, they come and go with
        // the allowance, and they are not what a filter row is made of.
        const sel = parts.map((part) => '.sec.uh ' + part).join(',')
        return [...document.querySelectorAll(sel)]
          .filter((el) => {
            const r = el.getBoundingClientRect()
            return r.width > 0 && r.height > 0 && r.top + window.scrollY < gridTop
          })
          .map((el) => {
            // A <select> is named by its LABEL, not by the text of its
            // options. el.innerText on the sort menu returns all three option
            // labels run together, which is the menu's contents rather than
            // what the control is called.
            // .proj-sort wraps BOTH its caption and the menu, so the label's
            // full text is the caption followed by every option. The caption is
            // its first element child.
            const label = el.labels && el.labels[0]
            const labelled = label ? (label.firstElementChild || label).innerText : ''
            const name = el.getAttribute('aria-label') || labelled || el.placeholder || el.innerText || el.tagName
            return name.trim()
          })
      }, ['button', 'input', 'select', 'textarea'])
      for (const name of above) {
        expect(ALLOWED_ABOVE_THE_GRID, `${plan}: an unexpected control "${name}" sits above the work`)
          .toContain(name)
      }
      expect(above.length, `${plan}: the probe found no controls above the grid at all`)
        .toBe(ALLOWED_ABOVE_THE_GRID.length)

      // Paying must not bring it back, which is what #452's "a Pro account sees
      // the same folder row, which is the point" was really pinning.
      const controls = await axControls(page, page.context())
      for (const chip of ['All', 'Brand', 'App', 'Marketing', 'Personal']) {
        expect(controls.map((c) => c.name), `${plan}: the "${chip}" filter is back`).not.toContain(chip)
      }
    })
  }

  test('the New project dialog asks for a name and a starting point, and nothing else', async ({ page }) => {
    watch(page, 'somebody starting their second project')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    await page.getByRole('button', { name: 'New Project' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog, 'the dialog still asks which folder to file it in')
      .not.toContainText(/folder/i)
    // The two things it legitimately asks, unchanged.
    await expect(dialog).toContainText('Project name')
    await expect(dialog).toContainText('Start from')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. THE WORK COMES FIRST — the defect a person actually hits
// ─────────────────────────────────────────────────────────────────────────────
test.describe('a person sees their own projects before anything else', () => {
  test('at 390x844 at the free cap, the first project is inside the fold', async ({ page }) => {
    // THE MEASUREMENT THIS FILE EXISTS FOR. Before: top y=882 in an 844px
    // viewport — the entire list below the fold for somebody who has filled
    // their free plan. There is no scroll here on purpose: the question is what
    // is on screen when the page arrives.
    watch(page, 'a free account at the cap opening its projects on a phone')
    await page.setViewportSize(PHONE)
    await signIn(page, { plan: 'free', projects: 3 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const card = await boxOf(page, '.uh-grid .proj-card')
    expect(card, 'no project card rendered at all').not.toBeNull()
    expect(card.top, `the first project opens at y=${card.top} in an 844px viewport`)
      .toBeLessThan(PHONE.height)
    expect(card.bottom, `the first project ends at y=${card.bottom}, past the fold`)
      .toBeLessThanOrEqual(PHONE.height)

    // And it is really the top one: nothing scrolled to make this true.
    const scrolled = await page.evaluate(() => window.scrollY)
    expect(scrolled, 'the page scrolled itself before we measured').toBe(0)
  })

  // ONE TEST PER STATE, and the reason is worth recording: `signIn` seeds
  // localStorage ONCE PER TAB (the `__uil4b_test_seeded` guard in helpers.js
  // exists so the app's own writes are not overwritten on every navigation), so
  // a loop that signs in four times inside one test measures the FIRST state
  // four times. Written as a loop, this passed on `empty` and then reported
  // “one project: no content rendered” — which was the harness, not the page.
  for (const state of STATES) {
    test(`the tip band renders below the work, once — ${state.name}`, async ({ page }) => {
      // #458 made this conditional on the account being empty. It is
      // unconditional now: one render site, the same at 320 and at 1440, so the
      // reading order cannot differ between an account with work and one
      // without.
      watch(page, `a ${state.name} account reading down the page it keeps its work on`)
      await signIn(page, state.opts)
      await go(page, '/projects')
      await expectRendered(page, '/projects')

      await expect(page.locator('.uh-band'), 'the band renders twice').toHaveCount(1)

      // Whatever is the page's own content in this state — the grid, or the
      // empty state that stands in for it — must come first.
      const contentSel = state.name === 'empty' ? '.uh-empty' : '.uh-grid'
      const tops = await page.evaluate((sel) => {
        const at = (s) => {
          const el = document.querySelector(s)
          return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null
        }
        return { content: at(sel), band: at('.uh-band') }
      }, contentSel)

      expect(tops.content, 'no content rendered — the state did not seed').not.toBeNull()
      expect(tops.band, 'no band rendered').not.toBeNull()
      expect(tops.band, `the tip band (y=${tops.band}) is above the work (y=${tops.content})`)
        .toBeGreaterThan(tops.content)
    })
  }

  test('the work is reached before the promos by keyboard', async ({ page }) => {
    // The tab band carries a link. Before this branch it sat third in the tab
    // order, ahead of every control belonging to the reader's own projects.
    watch(page, 'a keyboard user reaching for their own project')
    await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const controls = await axControls(page, page.context())
    const firstProject = controls.findIndex((c) => /^Seeded Project/.test(c.name))
    const bandLink = controls.findIndex((c) => /^Open the /.test(c.name))
    expect(firstProject, 'no project control in the tab order at all').toBeGreaterThanOrEqual(0)
    expect(bandLink, 'the band link is gone, so this test is measuring nothing').toBeGreaterThanOrEqual(0)
    expect(firstProject, `the band's link (${bandLink}) comes before the first project (${firstProject})`)
      .toBeLessThan(bandLink)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. ONE COUNTER FOR ONE QUANTITY
// ─────────────────────────────────────────────────────────────────────────────
test.describe('/projects states a number once', () => {
  test('the masthead count is not repeated in the toolbar', async ({ page }) => {
    // Before: "3 of 3 projects" at y=203 and "3 projects" at y=567 at 1440.
    watch(page, 'a free account at the cap counting its projects')
    await signIn(page, { plan: 'free', projects: 3 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    await expect(page.locator('[data-testid="project-quota-note"]')).toBeVisible()
    await expect(page.locator('.proj-count'), 'a second counter of the same quantity')
      .toHaveCount(0)
  })

  test('but it appears when a search has narrowed the list, which is when it says something new', async ({ page }) => {
    watch(page, 'somebody searching a full free plan')
    await signIn(page, { plan: 'free', projects: 3 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    await page.locator('.proj-search input').fill('Seeded Project 2')
    await expect(page.locator('.uh-grid .proj-card')).toHaveCount(1)
    await expect(page.locator('.proj-count')).toHaveText('1 project')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. THE WIDTH MATRIX, both themes
// ─────────────────────────────────────────────────────────────────────────────
test.describe('/projects holds every width in both themes', () => {
  for (const theme of ['light', 'dark']) {
    test(`no horizontal overflow and nothing painting outside the viewport — ${theme}`, async ({ page }) => {
      watch(page, `a free account at the cap on every screen we support (${theme})`)
      await page.emulateMedia({ colorScheme: theme })
      await signIn(page, { plan: 'free', projects: 3 })
      await go(page, '/projects')
      await expectRendered(page, '/projects')

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 844 })
        const report = await page.evaluate(() => {
          const de = document.documentElement
          const bleed = [...document.querySelectorAll('main *')]
            .filter((el) => {
              const r = el.getBoundingClientRect()
              return r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1)
            })
            .slice(0, 4)
            .map((el) => `${el.tagName.toLowerCase()}.${(typeof el.className === 'string' ? el.className : '').split(' ')[0]}`)
          return { overflow: de.scrollWidth - de.clientWidth, bleed, cards: document.querySelectorAll('.uh-grid .proj-card').length }
        })
        expect(report.overflow, `${theme} @${width}: the document scrolls sideways by ${report.overflow}px`).toBe(0)
        expect(report.bleed, `${theme} @${width}: painting outside the viewport`).toEqual([])
        // A positive control on the sweep itself: a width that rendered no
        // cards would report zero overflow for the wrong reason.
        expect(report.cards, `${theme} @${width}: the page rendered no projects to measure`).toBe(3)
      }
    })
  }

  test('every operable control clears 24px at 320, the narrowest width we ship', async ({ page }) => {
    watch(page, 'a thumb on the narrowest phone')
    await page.setViewportSize({ width: 320, height: 568 })
    await signIn(page, { plan: 'free', projects: 3 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const small = await page.evaluate(() => {
      const sel = 'main button, main select, main input, main [role="button"]'
      return [...document.querySelectorAll(sel)]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24))
        .map(({ el, r }) => `${(el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`)
    })
    expect(small, 'controls below the 24px target floor').toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. THE POSITIVE CONTROL
// ─────────────────────────────────────────────────────────────────────────────
test('the probe can see what it is looking for', async ({ page }) => {
  // Four of the five describes above are built on absences. Each one of those
  // absences passes for free against a probe that reads an empty page, a
  // selector that stopped matching, or a CDP session that returned nothing.
  // This plants each shape they deny, in the live page, and fails unless the
  // probe reports it — so a probe that has gone blind cannot report this
  // surface clean.
  watch(page, 'the probe checking its own eyesight')
  await signIn(page, { plan: 'free', projects: 2 })
  await go(page, '/projects')
  await expectRendered(page, '/projects')

  // (a) main's text is really being read.
  const before = await page.locator('main').innerText()
  expect(before.length, 'the text probe read an empty <main>').toBeGreaterThan(200)
  expect(before, 'the text probe cannot see the page it is on').toContain('Projects')

  await page.evaluate(() => {
    // Planted into the PAGE's own container, because that is what the probes
    // above are scoped to. When the scope tightened from <main> to .sec.uh this
    // test went red and the four absence tests stayed green — which is the
    // entire reason it is here.
    const main = document.querySelector('.sec.uh')
    const planted = document.createElement('div')
    planted.id = 'axprobe-control'
    planted.innerHTML = `
      <p>Sunset Brand by Maya R. — shared by the community</p>
      <p>Filed under folder</p>
      <button type="button">Community</button>
      <button type="button">Marketing</button>
      <span class="proj-count">99 projects</span>
      <a href="#" style="display:block;width:10px;height:10px">x</a>`
    main.prepend(planted)
  })

  // (b) every absence assertion above, inverted, must now fail to hold.
  const text = await page.locator('main').innerText()
  expect(text, 'the text probe missed a planted designer').toContain('Maya R.')
  expect(text, 'the text probe missed a planted fabrication').toContain('shared by the community')
  expect(text, 'the text probe missed a planted folder').toMatch(/folder/i)
  await expect(page.locator('.proj-count'), 'the counter selector stopped matching').toHaveCount(1)

  // (c) the CDP accessibility probe is really resolving names, and really
  //     reaching elements added after load.
  const controls = await axControls(page, page.context())
  const names = controls.map((c) => c.name)
  expect(names, 'the accessibility probe missed a planted Community control').toContain('Community')
  expect(names, 'the accessibility probe missed a planted folder chip').toContain('Marketing')
  expect(controls.length, 'the accessibility probe returned nothing').toBeGreaterThan(5)

  // (d) the 24px sweep can really see an undersized target.
  const small = await page.evaluate(() => {
    const sel = 'main a[href], main button'
    return [...document.querySelectorAll(sel)]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && (r.width < 24 || r.height < 24)).length
  })
  expect(small, 'the target-size sweep cannot see a 10x10 control').toBeGreaterThan(0)

  // (e) the geometry probe returns a real box, in viewport coordinates.
  const card = await boxOf(page, '.uh-grid .proj-card')
  expect(card, 'the geometry probe returned nothing for a card that is on screen').not.toBeNull()
  expect(card.bottom, 'the geometry probe returned a zero-height box').toBeGreaterThan(card.top)
})
