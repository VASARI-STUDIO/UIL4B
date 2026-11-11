// /projects across the width matrix and the account states, asserted on
// RENDERED GEOMETRY and on COMPUTED ROLES rather than on markup.
//
// Built to the design's "Your workspace" screen; each section says what it
// holds.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY IT EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// The projects page was disliked, with no detail given.
// Rendered on the built preview at 320/360/390/430/768/834/
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
//      the mechanism; the decision since was to drop folders as
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
import { createTools } from '../../src/data/toolTree.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

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
    const sel = parts.map((part) => '.db ' + part).join(',')
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
      // The latest project's sheet and one mini: two projects, drawn once each.
      await expect(page.locator('.db-sheet')).toHaveCount(1)
      await expect(page.locator('.db-mini')).toHaveCount(1)

      // The word, anywhere a reader could see it on this surface. It covers the
      // chip row, the per-card select, the modal field and the sentence about
      // an allowance, without naming any of their classes.
      await expect(page.locator('.db'), 'the surface still says "folder"')
        .not.toContainText(/folder/i)

      // AN ALLOWLIST, NOT A DENYLIST, and the reason is a mutation that got
      // through. The first version of this asserted that the five category
      // labels were absent. Re-adding the chip row with LOWERCASE labels
      // ('brand', 'app', 'marketing') passed it, and so would any rebuild of
      // the same idea under any other words — which is the whole failure mode
      // the anti-slop bar calls “the same control, renamed”.
      //
      // So this names what SHOULD be above the work, and fails on anything
      // else. On the workspace the only operable control above the kit sheet is
      // New project. "All thirteen tools" belongs to the tools shelf, which
      // comes after the work (held below, and by the order tests), so it is
      // allowed nowhere above it.
      const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen']
      const live = createTools().filter((t) => !t.soon && !t.beta).length
      const ALL_TOOLS = `All ${WORDS[live] || live} tools`
      const ALLOWED_ABOVE_THE_WORK = ['New project']
      const above = await page.evaluate((parts) => {
        const lead = document.querySelector('.db-sheet')
        const gridTop = lead.getBoundingClientRect().top + window.scrollY
        // Operable controls only — buttons, fields and menus. Links inside the
        // allowance line ("See plans") are prose, they come and go with
        // the allowance, and they are not what a filter row is made of.
        const sel = parts.map((part) => '.db ' + part).join(',')
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
            // A label that wraps both its caption and the menu reads as the
            // caption followed by every option. The caption is its first
            // element child.
            const label = el.labels && el.labels[0]
            const labelled = label ? (label.firstElementChild || label).innerText : ''
            const name = el.getAttribute('aria-label') || labelled || el.placeholder || el.innerText || el.tagName
            return name.trim()
          })
      }, ['button', 'input', 'select', 'textarea'])
      for (const name of above) {
        expect(ALLOWED_ABOVE_THE_WORK, `${plan}: an unexpected control "${name}" sits above the work`)
          .toContain(name)
      }
      expect(above.length, `${plan}: the probe found no controls above the work at all`)
        .toBe(ALLOWED_ABOVE_THE_WORK.length)
      // The Create menu button is still on the page, just after the work.
      const toolsTop = await page.getByRole('button', { name: ALL_TOOLS }).evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
      // The work ends where the last project ends: the other-projects list when there is one, else the sheet.
      const workBottom = await page.locator('[data-testid="other-projects"], .db-sheet').last().evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY)
      expect(toolsTop, `${plan}: "${ALL_TOOLS}" (y=${toolsTop}) is above the work (ends y=${workBottom})`).toBeGreaterThan(workBottom)

      // Paying must not bring it back, which is what #452's "a Pro account sees
      // the same folder row, which is the point" was really pinning.
      const controls = await axControls(page, page.context())
      for (const chip of ['All', 'Brand', 'App', 'Marketing', 'Personal']) {
        expect(controls.map((c) => c.name), `${plan}: the "${chip}" filter is back`).not.toContain(chip)
      }
    })
  }

  // THERE IS NO NEW PROJECT FORM TO FILE ANYTHING IN. The dialog this tested
  // (name and starting point, and no folder) and its geometry test went with
  // the current flow: New project goes straight into the Palette
  // Builder on a new, unsaved project, named when it is saved. What remains to
  // hold is that it asks for nothing on the way — no folder, no form.
  test('New project asks for nothing: it opens the Palette Builder on a fresh design', async ({ page }) => {
    watch(page, 'somebody starting their second project')
    await signIn(page, { plan: 'free', projects: 1 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    await page.locator('.db-newwrap').getByRole('button', { name: 'New project' }).click()
    await expect(page).toHaveURL(/\/create\/palette$/)
    await expect(page.getByRole('dialog'), 'a form stood between New project and the work').toHaveCount(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. THE WORK COMES FIRST — the defect a person actually hits
// ─────────────────────────────────────────────────────────────────────────────
test.describe('a person sees their own projects before anything else', () => {
  // THE ORDER IS THE DESIGN'S. The workspace screen (UIL4B App.dc.html)
  // sets the page as: title, plan strip, "Start
  // something", Recent projects, New in Discover, the Pro panel. The tip band
  // this section used to keep below the work is gone with the old page. What
  // still holds — and what this file protects — is that a
  // person's own work comes before anything the product is promoting.
  test('at 1440x900 at the free cap, the first project is inside the fold', async ({ page }) => {
    watch(page, 'a free account at the cap opening its workspace on a laptop')
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, { plan: 'free', projects: 3 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    // The kit sheet is the newest project and ends inside the fold; the other two follow it as minis.
    const card = await boxOf(page, '.db-sheet')
    expect(card, 'no kit sheet rendered at all').not.toBeNull()
    expect(card.bottom, `the kit sheet ends at y=${card.bottom}, past the fold`).toBeLessThanOrEqual(900)
    const minis = await page.evaluate(() => {
      const all = [...document.querySelectorAll('.db-mini')]
      return { count: all.length, tops: all.map((m) => Math.round(m.getBoundingClientRect().top)) }
    })
    expect(minis.count, 'the other two projects are not drawn as minis').toBe(2)
    expect(await page.evaluate(() => window.scrollY), 'the page scrolled itself before we measured').toBe(0)
  })

  for (const state of STATES) {
    test(`the work comes before Discover and the Pro panel — ${state.name}`, async ({ page }) => {
      watch(page, `a ${state.name} account reading down its workspace`)
      await signIn(page, state.opts)
      await go(page, '/projects')
      await expectRendered(page, '/projects')

      // The work is the kit sheet (the example kit for an account with no project).
      const contentSel = '.db-sheet'
      const tops = await page.evaluate((sel) => {
        const at = (q) => {
          const el = document.querySelector(q)
          return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null
        }
        return { shelf: at('#db-sh'), content: at(sel), discover: at('.db-dis'), plan: at('.db-plan') }
      }, contentSel)
      expect(tops.content, 'no content rendered — the state did not seed').not.toBeNull()
      // The tools shelf is a way to begin more work; it follows the work, Discover is in it, and the plan line closes the page.
      expect(tops.shelf, '"Tools and library" sits above the person\'s own work').toBeGreaterThan(tops.content)
      expect(tops.discover, `Discover (y=${tops.discover}) is above the work (y=${tops.content})`).toBeGreaterThan(tops.content)
      expect(tops.plan, `the plan line (y=${tops.plan}) is above the tools shelf (y=${tops.shelf})`).toBeGreaterThan(tops.shelf)
      // Pro is not sold to a Pro account: its plan line is the plan and a link to manage it, with no perks control.
      const perks = page.getByRole('button', { name: 'What Pro adds' })
      if (state.opts.plan === 'pro') await expect(perks, 'a Pro account is offered what Pro adds').toHaveCount(0)
      else await expect(perks).toHaveCount(1)
    })
  }

  test('the work is reached before the promos by keyboard', async ({ page }) => {
    watch(page, 'a keyboard user reaching for their own project')
    await signIn(page, { plan: 'free', projects: 2 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const controls = await axControls(page, page.context())
    // The sheet's two links are named "Continue: <step>, <project>" and "Open project, <project>"; a mini is named by the project.
    const firstProject = controls.findIndex((c) => /^(Continue: .*, |Open project, )?Seeded Project/.test(c.name))
    // The plan line's perks control is the first thing on the page that sells Pro.
    const promo = controls.findIndex((c) => /^What Pro adds$/.test(c.name))
    expect(firstProject, 'no project control in the tab order at all').toBeGreaterThanOrEqual(0)
    expect(promo, 'the plan line\'s Pro control is gone, so this test is measuring nothing').toBeGreaterThanOrEqual(0)
    expect(firstProject, `the upgrade link (${promo}) comes before the first project (${firstProject})`)
      .toBeLessThan(promo)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. ONE COUNTER FOR ONE QUANTITY
// ─────────────────────────────────────────────────────────────────────────────
test.describe('/projects states a number once', () => {
  test('the project count is on the slot meter, and nowhere else', async ({ page }) => {
    // Before: "3 of 3 projects" at y=203 and "3 projects" at y=567 at 1440.
    // The design's workspace states it once, in the plan strip.
    watch(page, 'a free account at the cap counting its projects')
    await signIn(page, { plan: 'free', projects: 3 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    await expect(page.locator('[data-testid="project-quota-note"]'), 'a second counter of the same quantity').toHaveCount(1)
    await expect(page.locator('[data-testid="project-quota-note"]')).toContainText('3 of 3')
    const text = await page.locator('.db').innerText()
    expect(text.split('3 of 3').length - 1, 'the count is printed more than once').toBe(1)
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
          return { overflow: de.scrollWidth - de.clientWidth, bleed, cards: document.querySelectorAll('.db-sheet, .db-mini').length }
        })
        expect(report.overflow, `${theme} @${width}: the document scrolls sideways by ${report.overflow}px`).toBe(0)
        expect(report.bleed, `${theme} @${width}: painting outside the viewport`).toEqual([])
        // A positive control on the sweep itself: a width that rendered no
        // projects would report zero overflow for the wrong reason.
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
  expect(before, 'the text probe cannot see the page it is on').toContain('Your workspace')

  await page.evaluate(() => {
    // Planted into the PAGE's own container, because that is what the probes
    // above are scoped to. When the scope tightened from <main> to .db this
    // test went red and the four absence tests stayed green — which is the
    // entire reason it is here.
    const main = document.querySelector('.db .db-main')
    const planted = document.createElement('div')
    planted.id = 'axprobe-control'
    planted.innerHTML = `
      <p>Sunset Brand by Maya R. — shared by the community</p>
      <p>Filed under folder</p>
      <button type="button">Community</button>
      <button type="button">Marketing</button>
      <span data-testid="project-quota-note">99 of 99</span>
      <a href="#" style="display:block;width:10px;height:10px">x</a>`
    main.prepend(planted)
  })

  // (b) every absence assertion above, inverted, must now fail to hold.
  const text = await page.locator('main').innerText()
  expect(text, 'the text probe missed a planted designer').toContain('Maya R.')
  expect(text, 'the text probe missed a planted fabrication').toContain('shared by the community')
  expect(text, 'the text probe missed a planted folder').toMatch(/folder/i)
  await expect(page.locator('[data-testid="project-quota-note"]'), 'the counter selector stopped matching').toHaveCount(2)

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
  const card = await boxOf(page, '.db-sheet')
  expect(card, 'the geometry probe returned nothing for a sheet that is on screen').not.toBeNull()
  expect(card.bottom, 'the geometry probe returned a zero-height box').toBeGreaterThan(card.top)
})

// WCAG 2.4.3. The order a keyboard walks the page is the order it is read and painted in: New project,
// the allowance line's See plans (at the cap), the sheet's Open project and Continue, the four tool links
// under it, each other project, then the tools and library shelf, then the plan line. Below 1200 the sheet's
// Continue moves to a docked bar that comes last in the DOM and is painted at the foot of the screen.
// Driven with the real Tab key from New project, not read off the markup, and checked against where each
// stop is PAINTED.
test.describe('/projects tabs in the order it is read', () => {
  // Three projects whose Colour is set, so the sheet's palette part is a link to the builder like the others.
  // Seeded Project 3 is the newest.
  const coloured = Array.from({ length: 3 }, (_, i) => {
    const design = JSON.parse(JSON.stringify(DEFAULT_DESIGN))
    design.palette.colors = ['#0B2A45', '#1F4E79', '#F2A488', '#FDEDE4']
    const at = new Date(Date.now() - (3 - i) * 864e5).toISOString()
    return { id: `seed-${i + 1}`, name: `Seeded Project ${i + 1}`, design, createdAt: at, updatedAt: at }
  })

  const NEW = /^New project$/
  const PLANS = /^See plans$/
  const OPEN = /^Open project, Seeded Project 3$/
  const CONTINUE = /^Continue: set the type scale(, Seeded Project 3)?$/
  const TOOLS = [/^Open in Palette Builder$/, /^Open in Type Scale$/, /^Open in Font Pair$/, /^Open in Tint$/]
  const MINIS = [/^Seeded Project 2/, /^Seeded Project 1/]
  const SHELF = [/Pro palette, opens with Pro$/, /^New in Discover$/, /^How exporting works$/, /^Icons and emoji$/, /^Image tools$/, /^Gradient/, /^Semantic Colour/, /^Contrast Checker/, /^Font Gallery/, /^All \w+ tools$/]
  const PLAN_LINE = [/^What Pro adds$/, PLANS]

  for (const width of [1440, 768, 390]) {
    test(`New project, the sheet, the minis, the shelf and the plan line are met in order, and painted in order, at ${width}px`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height: 900 } })
      const page = await context.newPage()
      watch(page, `a keyboard user tabbing through their workspace at ${width}px`)
      await signIn(page, { plan: 'free', projects: coloured })
      await go(page, '/projects')
      await expectRendered(page, '/projects')

      // Exactly one New project control is on the page to a keyboard or a screen reader (the minis' "room" tile
      // only draws below the cap).
      await expect(page.getByRole('button', { name: 'New project' })).toHaveCount(1)
      await page.locator('.db-newwrap').getByRole('button', { name: 'New project' }).focus()
      const readStop = () => page.evaluate(() => {
        const el = document.activeElement
        const r = el.getBoundingClientRect()
        return {
          name: (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' '),
          top: Math.round(r.top + window.scrollY), bottom: Math.round(r.bottom + window.scrollY),
          left: Math.round(r.left), right: Math.round(r.right),
          inPage: !!el.closest('.db'),
          inPlan: !!el.closest('.db-plan'),
          inBar: !!el.closest('.db-bar'),
        }
      })
      const stops = []
      for (let i = 0; i < 60; i++) {
        const stop = await readStop()
        stops.push(stop)
        if (stop.inPlan && PLANS.test(stop.name)) break
        await page.keyboard.press('Tab')
      }
      // Below 1200 the docked bar follows the page in the DOM: one more stop.
      const barDrawn = await page.locator('.db-bar').isVisible()
      if (barDrawn) {
        await page.keyboard.press('Tab')
        stops.push(await readStop())
      }
      const names = stops.map((st) => st.name)
      const walk = names.join(' | ')
      // POSITIVE CONTROL: the walk reached the plan line, still inside the page.
      expect(stops.some((st) => st.inPlan && PLANS.test(st.name)), `the Tab walk never reached the plan line: ${walk}`).toBe(true)
      expect(stops.every((st) => st.inPage), `the Tab walk left the page: ${walk}`).toBe(true)
      expect(barDrawn, `the docked bar is ${barDrawn ? '' : 'not '}drawn at ${width}px`).toBe(width < 1200)

      // The page's own stops, in order, with nothing between them.
      const lead = width < 1200 ? [NEW, PLANS, OPEN] : [NEW, PLANS, OPEN, CONTINUE]
      const expected = [...lead, ...TOOLS, ...MINIS]
      expected.forEach((re, i) => expect(names[i], `stop ${i + 1} of ${walk}`).toMatch(re))
      // Then the rest of the page, in order, though other stops (the other palettes, the also-in-Create links) sit between.
      let at = expected.length
      for (const re of [...SHELF, ...PLAN_LINE]) {
        const found = names.findIndex((n, i) => i >= at && re.test(n))
        expect(found, `${re} is missing or out of order after stop ${at}: ${walk}`).toBeGreaterThanOrEqual(at)
        at = found + 1
      }
      if (barDrawn) {
        expect(names.at(-1), `the docked bar is not the last stop: ${walk}`).toMatch(CONTINUE)
        expect(stops.at(-1).inBar, 'the last stop is not in the docked bar').toBe(true)
      }

      // Painted order. From New project to the last mini the stops never go back up the page, and the
      // sheet's head reads Open project then Continue, left to right. The shelf is a row of columns walked
      // column by column, so its stops are held to a band: all below the minis, and the plan line below all of them.
      const flow = stops.slice(0, expected.length)
      for (let i = 1; i < flow.length; i++) {
        expect(flow[i].top, `"${flow[i].name}" is painted above "${flow[i - 1].name}", the stop before it`).toBeGreaterThanOrEqual(flow[i - 1].top - 1)
      }
      const planStops = stops.filter((st) => st.inPlan)
      const shelfStops = stops.slice(expected.length).filter((st) => !st.inPlan && !st.inBar)
      expect(shelfStops.length, 'the walk found no stop on the shelf').toBeGreaterThan(5)
      const minisBottom = Math.max(...stops.slice(lead.length + TOOLS.length, expected.length).map((st) => st.bottom))
      for (const st of shelfStops) expect(st.top, `"${st.name}" on the shelf is painted above the last mini`).toBeGreaterThanOrEqual(minisBottom - 1)
      const shelfBottom = Math.max(...shelfStops.map((st) => st.bottom))
      for (const st of planStops) expect(st.top, `"${st.name}" in the plan line is painted above the shelf`).toBeGreaterThanOrEqual(shelfBottom - 1)
      if (width >= 1200) {
        const [open, cont] = [stops[2], stops[3]]
        expect(cont.left, 'Continue is painted before Open project').toBeGreaterThanOrEqual(open.right - 1)
      }
      const sheetTools = stops.slice(lead.length, lead.length + TOOLS.length)
      const firstMini = stops[lead.length + TOOLS.length]
      expect(firstMini.top, 'the first other project is painted above the sheet\'s tool links')
        .toBeGreaterThanOrEqual(Math.max(...sheetTools.map((st) => st.bottom)) - 1)
      await context.close()
    })
  }
})
